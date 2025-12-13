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
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';

type NzSortOrder = 'ascend' | 'descend' | null;

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  width: string;
  class?: string;
  sortable?: boolean;
}

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
    NzDropDownModule,
    NzButtonModule,
  ],
  templateUrl: './stock-movement.html',
  styleUrls: ['./stock-movement.scss'],
})
export class StockMovementComponent implements OnInit {
  loading = signal(false);

  rows = signal<ProductMovementDto[]>([]);
  totalCount = signal(0);

  filtersCollapsed = false;

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
    stockMovementType: [null as number | null],
    dateFrom: [''],
    dateTo: [''],
    includeCancelled: [false],
  });

  // ==========================
  // COLUMN CONFIG
  // ==========================
columns: ColumnDef[] = [
  { key: 'MovementDate', label: 'Date', visible: true, width: '120px', sortable: true },
  { key: 'BranchName', label: 'Branch', visible: true, width: '100px', sortable: true },
  { key: 'StockMovementNo', label: 'Movement', visible: false, width: '100px', sortable: true },
  { key: 'StockMovementType', label: 'Type', visible: true, width: '110px', sortable: true },
  { key: 'ProductName', label: 'Product', visible: true, width: '200px', sortable: true },
  { key: 'ProductType', label: 'Product Type', visible: false, width: '100px', sortable: true },
  { key: 'QuantitySigned', label: 'Qty (±)', visible: true, width: '80px', class: 'text-end', sortable: true },
  { key: 'UnitPrice', label: 'Unit Price', visible: true, width: '80px', class: 'text-end', sortable: true },
  { key: 'AmountExclVat', label: 'Amount', visible: true, width: '100px', class: 'text-end', sortable: true },
];


  get visibleColumns() {
    return this.columns.filter(c => c.visible);
  }

  toggleColumn(key: string, visible: boolean) {
    const col = this.columns.find(c => c.key === key);
    if (col) col.visible = visible;
  }

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
    this.fetchPage();
  }

  private loadLookups(): void {
    this.productSvc.getList({ maxResultCount: 1000 }).subscribe(r => this.products.set(r.items ?? []));
    this.productTypeSvc.getList({ maxResultCount: 1000 }).subscribe(r => this.productTypes.set(r.items ?? []));

    if (this.isAdmin) {
      this.branchSvc.getList({ maxResultCount: 1000 }).subscribe(r => this.branches.set(r.items ?? []));
    }
  }

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

    // reset columns to default visibility
    this.columns.forEach(c => c.visible = true);

    this.fetchPage();
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    const nextPageIndex = params.pageIndex;
    const nextPageSize = params.pageSize;
    const nextSorting = this.buildSorting(params.sort);

    const changed =
      nextPageIndex !== this.pageIndex() ||
      nextPageSize !== this.pageSize() ||
      nextSorting !== this.sorting();

    this.pageIndex.set(nextPageIndex);
    this.pageSize.set(nextPageSize);
    this.sorting.set(nextSorting);

    if (changed) this.fetchPage();
  }

  private buildSorting(sort: NzTableQueryParams['sort']): string {
    const active = (sort ?? []).filter(s => !!s.value);
    if (!active.length) return this.defaultSorting;
    const parts = active.map(s => `${s.key} ${s.value === 'ascend' ? 'ASC' : 'DESC'}`);
    return parts.join(', ');
  }

  sortOrder(col: string): NzSortOrder {
    const parts = (this.sorting() ?? '').split(',').map(x => x.trim()).filter(Boolean);
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