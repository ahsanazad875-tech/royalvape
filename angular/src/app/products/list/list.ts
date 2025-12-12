import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ConfigStateService } from '@abp/ng.core';
import { environment } from 'src/environments/environment';

import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';

import { ProductDto, ProductListRequestDto, ProductService, UoMEnum } from 'src/app/proxy/products';
import { ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';

type NzSortOrder = 'ascend' | 'descend' | null;

const SORT = {
  ProductName: 'ProductName',
  ProductType: 'ProductType.Type',
  UoM: 'UoM',
  CreationTime: 'CreationTime',
  LastModificationTime: 'LastModificationTime',
  // If you want these sortable, your backend must accept navigation sorting:
  Creator: 'Creator.UserName',
  LastModifier: 'LastModifier.UserName',
} as const;

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzTableModule,
    NzSelectModule,
    NzInputModule,
  ],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class ListComponent implements OnInit {
  readonly SORT = SORT;

  form: FormGroup;

  items: ProductDto[] = [];
  totalCount = 0;

  loading = false;
  isAdmin = false;

  filtersCollapsed = false;

  pageIndex = 1; // nz-table is 1-based
  pageSize = 20;

  private currentSortKey: string | null = SORT.ProductName;
  private currentSortOrder: NzSortOrder = 'ascend';

  // lookups
  productTypeOptions: ProductTypeDto[] = [];
  productOptions: ProductDto[] = [];
  productLookupLoading = false;

  public UoMEnumMap = UoMEnum as any;

  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private productTypeService: ProductTypeService,
    private config: ConfigStateService
  ) {
    this.form = this.fb.group({
      filter: [''],
      productTypeId: [''],
      productId: [''],
    });
  }

  ngOnInit(): void {
    const user = this.config.getOne('currentUser') as any;
    const roles: string[] = user?.roles || [];
    this.isAdmin = roles.some(r => (r || '').toLowerCase() === 'admin');

    this.loadProductTypes();
    this.searchProductsLookup(''); // initial dropdown list
    // first load happens via explicit search() or initial load here:
    this.search(true);
  }

  imgSrc(p: ProductDto): string | null {
    const raw = (p as any)?.imageUrl as string | undefined;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const path = raw.replace(/^\/+/, '');
    return this.apiBase ? `${this.apiBase}/${path}` : `/${path}`;
  }

  trackById(_: number, item: ProductDto) {
    return item.id;
  }

  // -----------------------------
  // Filters
  // -----------------------------
  reset(): void {
    this.form.reset({
      filter: '',
      productTypeId: '',
      productId: '',
    });

    this.pageIndex = 1;
    this.currentSortKey = SORT.ProductName;
    this.currentSortOrder = 'ascend';

    this.searchProductsLookup('');
    this.search(true);
  }

  search(resetPage: boolean): void {
    if (resetPage) this.pageIndex = 1;
    this.load();
  }

  onProductTypeChanged(): void {
    // keep same behavior as your Stock Report: update dropdown options only
    this.form.patchValue({ productId: '' }, { emitEvent: false });
    this.searchProductsLookup('');
  }

  onProductSearch(term: string): void {
    this.searchProductsLookup(term);
  }

  private buildSorting(): string {
    const key = this.currentSortKey || SORT.ProductName;
    const dir = this.currentSortOrder === 'descend' ? 'DESC' : 'ASC';
    return `${key} ${dir}`;
  }

  private buildRequest(): ProductListRequestDto {
    const v = this.form.value;

    return {
      skipCount: (this.pageIndex - 1) * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: this.buildSorting(),

      filter: (v.filter || '').trim() ? (v.filter || '').trim() : null,
      productTypeId: v.productTypeId ? v.productTypeId : null,
      productId: v.productId ? v.productId : null,
    };
  }

  // -----------------------------
  // nz-table paging/sorting
  // -----------------------------
  onQueryParamsChange(params: NzTableQueryParams): void {
    const { pageIndex, pageSize, sort } = params;

    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    const active = sort.find(s => s.value !== null);
    if (active?.key && active.value) {
      this.currentSortKey = active.key;
      this.currentSortOrder = active.value as NzSortOrder;
    }

    this.load();
  }

  sortOrder(key: string): NzSortOrder {
    return this.currentSortKey === key ? this.currentSortOrder : null;
  }

  // -----------------------------
  // Data
  // -----------------------------
  private load(): void {
    if (this.loading) return;
    this.loading = true;

    const rq = this.buildRequest();

    this.productService.getProductList(rq).subscribe({
      next: res => {
        this.items = res.items ?? [];
        this.totalCount = res.totalCount ?? 0;
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  private loadProductTypes(): void {
    this.productTypeService
      .getList({ skipCount: 0, maxResultCount: 1000, sorting: 'Type ASC' } as any)
      .subscribe({
        next: res => (this.productTypeOptions = res.items ?? []),
      });
  }

  private searchProductsLookup(term: string): void {
    this.productLookupLoading = true;

    const v = this.form.value;

    const rq: ProductListRequestDto = {
      skipCount: 0,
      maxResultCount: 50,
      sorting: 'ProductName ASC',
      filter: term?.trim() ? term.trim() : null,
      productTypeId: v.productTypeId ? v.productTypeId : null,
      productId: null,
    };

    this.productService.getProductList(rq).subscribe({
      next: res => (this.productOptions = res.items ?? []),
      error: () => (this.productLookupLoading = false),
      complete: () => (this.productLookupLoading = false),
    });
  }
}