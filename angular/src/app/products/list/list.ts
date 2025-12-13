import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ConfigStateService } from '@abp/ng.core';
import { environment } from 'src/environments/environment';

import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

import {
  ProductDto,
  ProductListRequestDto,
  ProductService,
  UoMEnum,
} from 'src/app/proxy/products';
import { ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';

type NzSortOrder = 'ascend' | 'descend' | null;

const SORT = {
  ProductName: 'ProductName',
  ProductType: 'ProductType.Type',
  UoM: 'UoM',
  CreationTime: 'CreationTime',
  LastModificationTime: 'LastModificationTime',
} as const;

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  width: string;
  sortable?: boolean;
  sortKey?: string;
}

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
    NzDropDownModule
  ],
  templateUrl: './list.html',
  styleUrls: ['./list.scss'],
})
export class ListComponent implements OnInit {
  readonly SORT = SORT;

  form: FormGroup;
  items: ProductDto[] = [];
  totalCount = 0;
  loading = false;
  isAdmin = false;
  filtersCollapsed = false;

  pageIndex = 1;
  pageSize = 20;

  private currentSortKey: string | null = SORT.ProductName;
  private currentSortOrder: NzSortOrder = 'ascend';

  private ignoreQueryParams = false; // ✅ prevent backend call on column toggle

  productTypeOptions: ProductTypeDto[] = [];
  productOptions: ProductDto[] = [];
  productLookupLoading = false;

  UoMEnumMap = UoMEnum as any;
  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

  // ==========================
  // COLUMN CONFIG
  // ==========================
  columns: ColumnDef[] = [
    { key: 'product', label: 'Product', visible: true, width: '250px', sortable: true, sortKey: SORT.ProductName },
    { key: 'type', label: 'Type', visible: true, width: '80px', sortable: true, sortKey: SORT.ProductType },
    { key: 'uom', label: 'UoM', visible: true, width: '80px', sortable: true, sortKey: SORT.UoM },
    { key: 'buying', label: 'Buying', visible: true, width: '80px' },
    { key: 'selling', label: 'Selling', visible: true, width: '80px' },
    { key: 'created', label: 'Created', visible: true, width: '150px', sortable: true, sortKey: SORT.CreationTime },
    { key: 'createdBy', label: 'Created By', visible: true, width: '120px' },
    { key: 'updated', label: 'Updated', visible: false, width: '150px', sortable: true, sortKey: SORT.LastModificationTime },
    { key: 'updatedBy', label: 'Updated By', visible: false, width: '120px' },
  ];

  
  get visibleColumns(): ColumnDef[] {
    return this.columns.filter(c => c.visible);
  }
  
  get selectedColumnKeys(): string[] {
    return this.columns.filter(c => c.visible).map(c => c.key);
  }
  
  set selectedColumnKeys(keys: string[]) {
    this.columns.forEach(c => (c.visible = keys.includes(c.key)));
  }
  
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
    this.isAdmin = (user?.roles || []).some((r: string) => (r || '').toLowerCase() === 'admin');
    if(this.isAdmin) {
      this.columns.push({
        key: 'actions',
        label: 'Actions',
        visible: true,
        width: '50px'
      });
    }
    
    this.loadProductTypes();
    this.searchProductsLookup('');
    this.search(true);

  }
  
  trackById(_: number, item: ProductDto) {
    return item.id;
  }

  imgSrc(p: ProductDto): string | null {
    const raw = (p as any)?.imageUrl;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${this.apiBase}/${raw.replace(/^\/+/, '')}`;
  }

  reset(): void {
    this.form.reset({ filter: '', productTypeId: '', productId: '' });

    // reset columns to default
    this.columns.forEach(c => {
      c.visible = !['updated', 'updatedBy'].includes(c.key);
    });

    this.pageIndex = 1;
    this.currentSortKey = SORT.ProductName;
    this.currentSortOrder = 'ascend';

    this.searchProductsLookup('');
    this.search(true);
  }

  search(resetPage: boolean = false): void {
    if (resetPage) this.pageIndex = 1;
    this.load();
  }

  onProductTypeChanged(): void {
    this.form.patchValue({ productId: '' }, { emitEvent: false });
    this.searchProductsLookup('');
  }

  onProductSearch(term: string): void {
    this.searchProductsLookup(term);
  }

  sortOrder(key: string): NzSortOrder {
    return this.currentSortKey === key ? this.currentSortOrder : null;
  }

  toggleColumn(key: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === key);
    if (col) col.visible = visible;

    // prevent backend call on column toggle
    this.ignoreQueryParams = true;
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    if (this.ignoreQueryParams) {
      this.ignoreQueryParams = false;
      return; // skip backend call
    }

    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;

    const active = params.sort.find(s => s.value !== null);
    if (active?.key && active.value) {
      this.currentSortKey = active.key;
      this.currentSortOrder = active.value as NzSortOrder;
    }

    this.load();
  }

  private buildRequest(): ProductListRequestDto {
    const v = this.form.value;
    return {
      skipCount: (this.pageIndex - 1) * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: `${this.currentSortKey} ${this.currentSortOrder === 'descend' ? 'DESC' : 'ASC'}`,
      filter: v.filter?.trim() || null,
      productTypeId: v.productTypeId || null,
      productId: v.productId || null,
    };
  }

  private load(): void {
    this.loading = true;
    this.productService.getProductList(this.buildRequest()).subscribe({
      next: r => {
        this.items = r.items ?? [];
        this.totalCount = r.totalCount ?? 0;
      },
      complete: () => (this.loading = false),
    });
  }

  private loadProductTypes(): void {
    this.productTypeService
      .getList({ skipCount: 0, maxResultCount: 1000, sorting: 'Type ASC' } as any)
      .subscribe(r => (this.productTypeOptions = r.items ?? []));
  }

  private searchProductsLookup(term: string): void {
    this.productLookupLoading = true;
    const v = this.form.value;

    this.productService
      .getProductList({
        skipCount: 0,
        maxResultCount: 50,
        sorting: 'ProductName ASC',
        filter: term?.trim() || null,
        productTypeId: v.productTypeId || null,
      })
      .subscribe({
        next: r => (this.productOptions = r.items ?? []),
        complete: () => (this.productLookupLoading = false),
      });
  }
}