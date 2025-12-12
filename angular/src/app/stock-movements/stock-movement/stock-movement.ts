import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { StockMovementService, ProductMovementDto, StockMovementType } from 'src/app/proxy/stock-movements';
import { ProductService, ProductDto } from 'src/app/proxy/products';
import { BranchService, BranchDto } from 'src/app/proxy/branches';
import { ProductTypeService, ProductTypeDto } from 'src/app/proxy/product-types';

import { ConfigStateService, CurrentUserDto } from '@abp/ng.core';

import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

type NzSortOrder = 'ascend' | 'descend' | null;

@Component({
  selector: 'app-stock-movement',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,

    NzTableModule,
    NzSelectModule,
    NzCheckboxModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './stock-movement.html',
  styleUrls: ['./stock-movement.scss'],
})
export class StockMovementComponent implements OnInit {
  loading = signal(false);

  rows = signal<ProductMovementDto[]>([]);
  totalCount = signal(0);

  filtersCollapsed = false;

  // IMPORTANT: ng-zorro pageIndex is 1-based
  pageSize = signal<number>(10);
  pageIndex = signal<number>(1);

  private readonly defaultSorting = 'MovementDate DESC';
  sorting = signal<string>(this.defaultSorting);

  currentUser!: CurrentUserDto;
  isAdmin = false;

  products = signal<ProductDto[]>([]);
  productTypes = signal<ProductTypeDto[]>([]);
  branches = signal<BranchDto[]>([]);

  movementTypeOptions = [
    { value: StockMovementType.Purchase, label: 'Purchase (+)' },
    { value: StockMovementType.Sale, label: 'Sale (−)' },
    { value: StockMovementType.AdjustmentPlus, label: 'Adjustment (+)' },
    { value: StockMovementType.AdjustmentMinus, label: 'Adjustment (−)' },
  ];

  form = this.fb.group({
    branchId: [''],
    productId: [''],
    productTypeId: [''],
    stockMovementType: [null as number | null], // null = All
    dateFrom: [''], // datetime-local string
    dateTo: [''],
    includeCancelled: [false],
  });

  visibleFrom = computed(() =>
    this.totalCount() === 0 ? 0 : (this.pageIndex() - 1) * this.pageSize() + 1
  );

  visibleTo = computed(() =>
    Math.min(this.totalCount(), this.pageIndex() * this.pageSize())
  );

  constructor(
    private fb: FormBuilder,
    private reports: StockMovementService,
    private productSvc: ProductService,
    private productTypeSvc: ProductTypeService,
    private branchSvc: BranchService,
    private config: ConfigStateService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.config.getOne('currentUser');
    this.isAdmin = (this.currentUser?.roles ?? []).includes('admin');

    this.loadLookups();
    this.fetchPage(); // initial load
  }

  private loadLookups(): void {
    this.productSvc.getList({ maxResultCount: 1000 }).subscribe(r => this.products.set(r.items ?? []));
    this.productTypeSvc.getList({ maxResultCount: 1000 }).subscribe(r => this.productTypes.set(r.items ?? []));

    if (this.isAdmin) {
      this.branchSvc.getList({ maxResultCount: 1000 }).subscribe(r => this.branches.set(r.items ?? []));
    }
  }

  /** Submit button */
  search(): void {
    this.pageIndex.set(1);
    this.fetchPage();
  }

  reset(): void {
    this.form.reset({
      branchId: '',
      productId: '',
      productTypeId: '',
      stockMovementType: null,
      dateFrom: '',
      dateTo: '',
      includeCancelled: false,
    });

    this.sorting.set(this.defaultSorting);
    this.pageIndex.set(1);
    this.pageSize.set(10);

    this.fetchPage();
  }

  /** ng-zorro table change hook (pagination + sorting) */
  onQueryParamsChange(params: NzTableQueryParams): void {
    const nextPageIndex = params.pageIndex; // 1-based
    const nextPageSize = params.pageSize;

    const nextSorting = this.buildSorting(params.sort);

    const changed =
      nextPageIndex !== this.pageIndex() ||
      nextPageSize !== this.pageSize() ||
      nextSorting !== this.sorting();

    this.pageIndex.set(nextPageIndex);
    this.pageSize.set(nextPageSize);
    this.sorting.set(nextSorting);

    if (changed) {
      this.fetchPage();
    }
  }

  private buildSorting(sort: NzTableQueryParams['sort']): string {
    const active = (sort ?? []).filter(s => !!s.value);

    if (!active.length) {
      return this.defaultSorting;
    }

    // nzColumnKey should match backend sorting field names
    const parts = active.map(s => `${s.key} ${s.value === 'ascend' ? 'ASC' : 'DESC'}`);

    return parts.join(', ');
  }

  sortOrder(col: string): NzSortOrder {
    // parse current sorting: "MovementDate DESC, StockMovementNo DESC"
    const parts = (this.sorting() ?? '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);

    const match = parts.find(p => p.toLowerCase().startsWith(col.toLowerCase() + ' '));
    if (!match) return null;

    return match.toLowerCase().includes(' desc') ? 'descend' : 'ascend';
  }

  fetchPage(): void {
    this.loading.set(true);

    const v = this.form.value;

    this.reports
      .getProductMovements({
        branchId: v.branchId || undefined,
        productId: v.productId || undefined,
        productTypeId: v.productTypeId || undefined,
        stockMovementType: v.stockMovementType ?? undefined,
        dateFrom: v.dateFrom || undefined,
        dateTo: v.dateTo || undefined,
        includeCancelled: !!v.includeCancelled,

        skipCount: (this.pageIndex() - 1) * this.pageSize(),
        maxResultCount: this.pageSize(),
        sorting: this.sorting(),
      })
      .subscribe({
        next: res => {
          this.rows.set(res.items ?? []);
          this.totalCount.set(res.totalCount ?? 0);
        },
        error: () => this.loading.set(false),
        complete: () => this.loading.set(false),
      });
  }

  movementTypeLabel(type: StockMovementType): string {
    switch (type) {
      case StockMovementType.Purchase: return 'Purchase (+)';
      case StockMovementType.Sale: return 'Sale (−)';
      case StockMovementType.AdjustmentPlus: return 'Adjustment (+)';
      case StockMovementType.AdjustmentMinus: return 'Adjustment (−)';
      default: return String(type);
    }
  }

  movementTypeTagColor(type: StockMovementType): string {
    switch (type) {
      case StockMovementType.Purchase: return 'green';
      case StockMovementType.Sale: return 'red';
      case StockMovementType.AdjustmentPlus: return 'blue';
      case StockMovementType.AdjustmentMinus: return 'orange';
      default: return 'default';
    }
  }

  trackRow = (_: number, r: ProductMovementDto) => r.id;
}