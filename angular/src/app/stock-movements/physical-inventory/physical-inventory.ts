import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalModule } from 'ng-zorro-antd/modal';

import {
  StockMovementService,
  StockReportDto,
  CreateUpdateStockMovementHeaderDto,
  StockMovementType,
  ProductStockListRequestDto,
} from 'src/app/proxy/stock-movements';
import { ProductDto, ProductService } from 'src/app/proxy/products';
import { BranchService } from 'src/app/proxy/branches';
import { LookupDto, LookupRequestDto } from 'src/app/proxy/common-dtos';
import { NzConfigService } from 'ng-zorro-antd/core/config';
import { ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';

@Component({
  selector: 'app-physical-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzSelectModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule
  ],
  templateUrl: './physical-inventory.html',
  styleUrls: ['./physical-inventory.scss'],
})
export class PhysicalInventoryComponent implements OnInit {
  filtersCollapsed = false;

  form = this.fb.group({
    branchId: [''],
    productId: [''],
    productTypeId: [''],
  });

  branches: LookupDto<string>[] = [];
  selectedBranch?: LookupDto<string>;

  products: ProductDto[] = [];
  productTypes: ProductTypeDto[] = [];

  stockList: StockReportDto[] = [];
  qtyMap: Record<number, number> = {};
  loading = false;

  input: LookupRequestDto = {
    maxResultCount: 1000
  };
  pageIndex = 1;
  pageSize = 25;
  totalCount = 0;

  sortField?: string;
  sortDir?: 'asc' | 'desc';
  private lastQueryKey = '';

  // Modal state
  showAdjustmentModal = false;
  modalTitle = '';
  modalData: {
    productName: string;
    onHand: number;
    entered: number;
    variance: number;
    productId: string;
    unitPrice: number;
  }[] = [];
  modalAction: 'single' | 'bulk' = 'bulk';
  currentItem?: StockReportDto;

  constructor(
    private fb: FormBuilder,
    private stockSvc: StockMovementService,
    private branchSvc: BranchService,
    private productTypeSvc: ProductTypeService,
    private productSvc: ProductService,
    private notification: NzNotificationService,
    private nzConfigService: NzConfigService
  ) {
    this.nzConfigService.set('notification', {
      nzPlacement: 'bottomRight',
      nzDuration: 3000 // optional auto-close
    });
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadProductTypes();
    this.loadProducts();
    // Branch change subscription
    this.form.get('branchId')?.valueChanges.subscribe(branchId => {
      this.selectedBranch = this.branches.find(b => b.id === branchId);
      this.loadStock(true);
    });
  }

  loadBranches() {
    this.branchSvc.getLookup(this.input).subscribe(res => {
      this.branches = res.items ?? [];
      if (this.branches.length) {
        this.selectedBranch = this.branches[0];
        this.form.patchValue({ branchId: this.selectedBranch.id });
        this.loadStock(true);
      }
    });
  }

  loadProductTypes() {
    this.productTypeSvc.getList(this.input).subscribe(res => {
      this.productTypes = res.items ?? [];
    });
  }

  loadProducts() {
    this.productSvc.getList(this.input).subscribe(res => {
      this.products = res.items ?? [];
    });
  }

  loadStock(resetPage = false) {
    if (!this.selectedBranch) return;

    if (resetPage) this.pageIndex = 1;

    const input: ProductStockListRequestDto = {
      branchId: this.selectedBranch.id,
      productId: this.form.value.productId || undefined,
      productTypeId: this.form.value.productTypeId || undefined,
      skipCount: (this.pageIndex - 1) * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: this.sortField ? `${this.sortField} ${this.sortDir}` : undefined,
      onlyAvailable: true
    };

    this.loading = true;
    this.stockSvc.getStockReport(input)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(res => {
        this.stockList = res.items ?? [];
        this.totalCount = res.totalCount ?? 0;

        // Initialize qtyMap (preserve entered qty)
        const newQtyMap: Record<number, number> = {};
        this.stockList.forEach(item => {
          newQtyMap[item.productId] = this.qtyMap[item.productId] ?? item.onHand;
        });
        this.qtyMap = newQtyMap;
      });
  }

  trackRow = (_: number, r: StockReportDto) => `${r.branchId ?? 'x'}:${r.productId ?? 'x'}`;

  calculateVariance(item: StockReportDto): number {
    const entered = this.qtyMap[item.productId] ?? item.onHand;
    return entered - item.onHand;
  }

  updateVariance(item: StockReportDto) { }

  adjustSingle(item: StockReportDto) {
    const variance = this.calculateVariance(item);
    if (variance === 0) {
      this.notification.warning('No Variance', 'There is no variance to adjust.');
      return;
    }

    this.modalTitle = `Adjust stock for ${item.productName}`;
    this.modalData = [{
      productName: item.productName,
      onHand: item.onHand,
      entered: this.qtyMap[item.productId],
      variance,
      productId: item.productId,
      unitPrice: item.buyingUnitPrice
    }];
    this.modalAction = 'single';
    this.currentItem = item;
    this.showAdjustmentModal = true;
  }

  adjustAll() {
    const adjustments = this.stockList
      .map(item => {
        const variance = this.calculateVariance(item);
        if (variance === 0) return null;
        return {
          productName: item.productName,
          onHand: item.onHand,
          entered: this.qtyMap[item.productId],
          variance,
          productId: item.productId,
          unitPrice: item.buyingUnitPrice
        };
      })
      .filter(x => x !== null) as typeof this.modalData;

    if (!adjustments.length) {
      this.notification.warning('No Variances', 'There are no variances to adjust.');
      return;
    }

    this.modalTitle = 'Confirm Stock Adjustments';
    this.modalData = adjustments;
    this.modalAction = 'bulk';
    this.showAdjustmentModal = true;
  }

  confirmAdjustment() {
    if (!this.selectedBranch) return;

    if (this.modalAction === 'single' && this.currentItem) {
      const item = this.currentItem;
      const variance = this.calculateVariance(item);
      const dto: CreateUpdateStockMovementHeaderDto = {
        branchId: this.selectedBranch.id,
        isCancelled: false,
        stockMovementType: variance > 0 ? StockMovementType.AdjustmentPlus : StockMovementType.AdjustmentMinus,
        details: [{ productId: item.productId, quantity: Math.abs(variance), unitPrice: item.buyingUnitPrice, discountAmount: 0 }],
      };
      this.stockSvc.adjustStock(dto).subscribe(() => {
        this.notification.success('Success', 'Stock adjusted successfully.');
        this.loadStock(false);
      });
    } else if (this.modalAction === 'bulk') {
      const positives: CreateUpdateStockMovementHeaderDto = {
        branchId: this.selectedBranch.id,
        isCancelled: false,
        stockMovementType: StockMovementType.AdjustmentPlus,
        details: [],
      };
      const negatives: CreateUpdateStockMovementHeaderDto = {
        branchId: this.selectedBranch.id,
        isCancelled: false,
        stockMovementType: StockMovementType.AdjustmentMinus,
        details: [],
      };

      this.modalData.forEach(item => {
        if (item.variance > 0) positives.details.push({ productId: item.productId, quantity: item.variance, unitPrice: item.unitPrice, discountAmount: 0 });
        else negatives.details.push({ productId: item.productId, quantity: Math.abs(item.variance), unitPrice: item.unitPrice, discountAmount: 0 });
      });

      if (positives.details.length) this.stockSvc.adjustStock(positives).subscribe();
      if (negatives.details.length) this.stockSvc.adjustStock(negatives).subscribe();

      this.notification.success('Success', 'Stock adjustments processed.');
      this.loadStock(false);
    }

    this.showAdjustmentModal = false;
  }

  cancelAdjustment() {
    this.showAdjustmentModal = false;
  }

  sortOrder(field: string): 'ascend' | 'descend' | null {
    if (this.sortField !== field || !this.sortDir) return null;
    return this.sortDir === 'asc' ? 'ascend' : 'descend';
  }

  onQueryParamsChange(params: NzTableQueryParams) {
    const pageIndex = params.pageIndex ?? 1;
    const pageSize = params.pageSize ?? this.pageSize;

    const s = (params.sort || []).find(x => x.value === 'ascend' || x.value === 'descend');
    const sortField = s?.key;
    const sortDir: 'asc' | 'desc' | undefined = s ? (s.value === 'ascend' ? 'asc' : 'desc') : undefined;

    const key = `${pageIndex}|${pageSize}|${sortField ?? ''}|${sortDir ?? ''}`;
    if (key === this.lastQueryKey) return;

    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.sortField = sortField;
    this.sortDir = sortDir;

    this.loadStock(false);
  }
}