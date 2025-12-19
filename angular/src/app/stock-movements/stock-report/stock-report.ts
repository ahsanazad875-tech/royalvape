import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { finalize } from 'rxjs';

import { ConfigStateService } from '@abp/ng.core';

import { BranchService, BranchDto } from 'src/app/proxy/branches';
import { ProductService, ProductDto, UoMEnum } from 'src/app/proxy/products';
import {
  StockMovementService,
  StockReportDto,
  ProductStockListRequestDto,
} from 'src/app/proxy/stock-movements';

import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';

type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-stock-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzSelectModule, NzTableModule],
  templateUrl: './stock-report.html',
  styleUrls: ['./stock-report.scss'],
})
export class StockReport implements OnInit {
  filtersCollapsed = true;

  form = this.fb.group({
    branchId: [''],
    productId: [''],
    filter: [''],
    onlyAvailable: [true],
  });

  branches: BranchDto[] = [];
  products: ProductDto[] = [];

  isAdmin = false;
  loading = false;

  rows: StockReportDto[] = [];
  totalCount = 0;

  // ✅ NZ table is 1-based page index
  pageIndex = 1;
  pageSize = 25;

  // ✅ server-side sorting state (ABP sorting string)
  sortField?: string; // e.g. "OnHand"
  sortDir?: SortDir;  // "asc" | "desc"

  // keys must match backend DTO property names used by Dynamic LINQ OrderBy
  readonly SORT = {
    BranchName: 'BranchName',
    ProductName: 'ProductName',
    ProductType: 'ProductType',
    UoM: 'UoM',
    OnHand: 'OnHand',
    LastUpdated: 'LastUpdated',
  } as const;

  // prevents double-calls caused by nz-table emitting queryParams after bindings update
  private lastQueryKey = '';

  constructor(
    private fb: FormBuilder,
    private stockSvc: StockMovementService,
    private branchSvc: BranchService,
    private productSvc: ProductService,
    private config: ConfigStateService
  ) {}

  // ------ computed helpers ------

  get visibleFrom(): number {
    if (this.totalCount === 0) return 0;
    return (this.pageIndex - 1) * this.pageSize + 1;
  }

  get visibleTo(): number {
    if (this.totalCount === 0) return 0;
    const shown = this.rows?.length ?? 0;
    return Math.min(this.totalCount, (this.pageIndex - 1) * this.pageSize + shown);
  }

  get sortingString(): string | undefined {
    if (!this.sortField || !this.sortDir) return undefined;
    return `${this.sortField} ${this.sortDir}`;
  }

  // for nzSortOrder binding
  sortOrder(field: string): 'ascend' | 'descend' | null {
    if (this.sortField !== field || !this.sortDir) return null;
    return this.sortDir === 'asc' ? 'ascend' : 'descend';
  }

  // ------ lifecycle ------

  ngOnInit(): void {
    const user: any = this.config.getOne('currentUser');
    const roles = (user?.roles ?? []) as any[];

    this.isAdmin =
      roles.some(r =>
        String(typeof r === 'string' ? r : (r?.name ?? r))
          .toLowerCase()
          .includes('admin')
      );

    if (this.isAdmin) this.loadBranches();
    this.loadProducts();

    // default sort
    this.sortField = this.SORT.OnHand;
    this.sortDir = 'desc';

    // initial load (nz-table will also emit once; our lastQueryKey prevents duplicate)
    this.search(true);
  }

  // ------ lookups ------

  private loadBranches(): void {
    this.branchSvc.getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe(res => {
        this.branches = (res?.items ?? res ?? []) as BranchDto[];
      });
  }

  private loadProducts(): void {
    this.productSvc.getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe(res => {
        this.products = (res?.items ?? res ?? []) as ProductDto[];
      });
  }

  // ------ uom display ------

  private getRowUomValue(r: StockReportDto): number | string | undefined {
    const raw =
      (r as any).uoM ??
      (r as any).uom ??
      (r as any).UoM;

    return raw === null || raw === undefined ? undefined : raw;
  }

  uomText(r: StockReportDto): string {
    const raw = this.getRowUomValue(r);
    if (raw === undefined) return '';

    const n = Number(raw);
    if (!Number.isNaN(n)) {
      return (UoMEnum as any)[n] ?? `UoM(${n})`;
    }

    return String(raw);
  }

  // ------ nz-table query params handler (paging + sorting) ------

  onQueryParamsChange(params: NzTableQueryParams): void {
    const pageIndex = params.pageIndex ?? 1;
    const pageSize = params.pageSize ?? this.pageSize;

    const s = (params.sort || []).find(x => x.value === 'ascend' || x.value === 'descend');
    const sortField = s?.key;
    const sortDir: SortDir | undefined = s
      ? (s.value === 'ascend' ? 'asc' : 'desc')
      : undefined;

    const key = `${pageIndex}|${pageSize}|${sortField ?? ''}|${sortDir ?? ''}`;

    // prevent duplicate calls when we update bindings programmatically
    if (key === this.lastQueryKey) return;

    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.sortField = sortField;
    this.sortDir = sortDir;

    this.search(false);
  }

  // ------ actions ------

  clearSort(): void {
    this.sortField = undefined;
    this.sortDir = undefined;
    this.pageIndex = 1;
    this.search(true);
  }

  reset(): void {
    this.form.reset({
      branchId: '',
      productId: '',
      filter: '',
      onlyAvailable: true,
    });

    this.sortField = this.SORT.OnHand;
    this.sortDir = 'desc';
    this.pageIndex = 1;

    this.search(true);
  }

  // ------ data load ------

  search(resetPage = false): void {
    if (resetPage) this.pageIndex = 1;

    const v = this.form.value;

    const input: ProductStockListRequestDto = {
      branchId: v.branchId || undefined,
      productId: v.productId || undefined,
      filter: (v.filter || '').trim() || undefined,
      onlyAvailable: !!v.onlyAvailable,

      skipCount: (this.pageIndex - 1) * this.pageSize,
      maxResultCount: this.pageSize,

      sorting: this.sortingString, // ABP sorting string
    };

    // record current query key so nz-table emit doesn't cause a duplicate call
    this.lastQueryKey = `${this.pageIndex}|${this.pageSize}|${this.sortField ?? ''}|${this.sortDir ?? ''}`;

    this.loading = true;

    this.stockSvc.getStockReport(input)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: res => {
          this.rows = res?.items ?? [];
          this.totalCount = Number(res?.totalCount ?? 0);

          // clamp if filters reduce total
          const maxPage = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
          if (this.pageIndex > maxPage) {
            this.pageIndex = maxPage;
            this.search(false);
          }
        },
        error: e => console.error(e),
      });
  }

  trackRow = (_: number, r: StockReportDto) =>
    `${(r as any).branchId ?? 'x'}:${(r as any).productId ?? 'x'}`;
}