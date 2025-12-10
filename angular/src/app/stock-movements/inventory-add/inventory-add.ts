import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfigStateService, CurrentUserDto } from '@abp/ng.core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { BranchDto, BranchService } from 'src/app/proxy/branches';
import { ProductDto, ProductService, UoMEnum } from 'src/app/proxy/products';
import {
  CreateUpdateStockMovementDetailDto,
  CreateUpdateStockMovementHeaderDto,
  StockMovementService,
  StockMovementType,
} from 'src/app/proxy/stock-movements';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-inventory-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './inventory-add.html',
  styleUrl: './inventory-add.scss',
})
export class InventoryAdd implements OnInit {
  branches: BranchDto[] = [];
  products: ProductDto[] = [];

  isAdmin = false;
  vatRate = 0; // 0.05 = 5%

  // Currency symbol (from env or fallback)
  currencySymbol: string =
    (environment as any)?.pos?.currencySymbol ??
    (environment as any)?.currencySymbol ??
    'Rs';

  vm: CreateUpdateStockMovementHeaderDto = {
    stockMovementType: StockMovementType.Purchase,
    businessPartnerName: '',
    description: '',
    amountExclVat: 0,
    amountVat: 0,
    amountInclVat: 0,
    branchId: '' as any,
    details: [],
  } as any;

  constructor(
    private config: ConfigStateService,
    private branchSvc: BranchService,
    private productSvc: ProductService,
    private stockSvc: StockMovementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Current user (for role-based admin flag)
    const user = this.config.getOne('currentUser') as CurrentUserDto | null;
    this.isAdmin = !!user?.roles?.some(r => r.toLowerCase() === 'admin');

    const allCfg = this.config.getAll() as any;

    // VAT from config extraProperties: pos.vatPerc (fraction e.g. 0.05)
    const vatFromCfg = allCfg?.extraProperties?.pos?.vatPerc;
    if (vatFromCfg != null) {
      this.vatRate = Number(vatFromCfg) || this.vatRate;
    }

    // Currency symbol from config if present (overrides env)
    const currencyFromCfg = allCfg?.extraProperties?.pos?.currencySymbol;
    if (currencyFromCfg) {
      this.currencySymbol = String(currencyFromCfg);
    }

    // Branches only needed for admin (non-admin behaves like Cart: backend infers branch)
    if (this.isAdmin) {
      this.branchSvc
        .getList({ skipCount: 0, maxResultCount: 1000 })
        .subscribe(res => {
          this.branches = res.items ?? [];

          if (!this.vm.branchId && this.branches.length) {
            this.vm.branchId = this.branches[0].id as any;
          }

          const first = this.branches[0] as any;
          if (first && first.vatPerc != null) {
            this.vatRate = Number(first.vatPerc / 100) || this.vatRate;
            this.recalcTotals();
          }
        });
    }

    // Products
    this.productSvc
      .getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe(res => {
        this.products = res.items;
        if (!this.vm.details?.length && this.products.length) {
          this.addLine();
        }
      });
  }

  onBranchChanged() {
    if (!this.isAdmin) return;

    const b = this.branches.find(x => x.id === this.vm.branchId) as any;
    if (b && b.vatPerc != null) {
      this.vatRate = Number(b.vatPerc / 100) || this.vatRate;
      (this.vm.details ?? []).forEach((_, i) => this.onRowChange(i));
      this.recalcTotals();
    }
  }

  addLine() {
    if (!this.products.length) return;
    const p = this.products[0];

    const row: CreateUpdateStockMovementDetailDto = {
      productId: p.id as any,
      uoM: p.uoM ?? 0,
      quantity: 1,
      unitPrice: p.buyingUnitPrice ?? 0,
      discountAmount: 0,
      amountExclVat: 0,
      amountVat: 0,
      amountInclVat: 0,
    };

    (this.vm.details ??= []).push(row);
    this.onProductChange(this.vm.details.length - 1);
  }

  removeLine(i: number) {
    this.vm.details!.splice(i, 1);
    this.recalcTotals();
  }

  onProductChange(i: number) {
    const r = this.vm.details![i];
    const p = this.products.find(x => x.id === r.productId);
    if (!p) return;

    r.uoM = p.uoM;
    r.unitPrice = p.buyingUnitPrice ?? 0;
    this.onRowChange(i);
  }

  onRowChange(i: number) {
    const r = this.vm.details![i];
    const qty = Number(r.quantity || 0);
    const disc = Number(r.discountAmount || 0);
    const net = Math.max(0, qty * Number(r.unitPrice || 0) - disc);

    r.amountExclVat = +net.toFixed(2);
    r.amountVat = +(net * this.vatRate).toFixed(2);
    r.amountInclVat = +(net * (1 + this.vatRate)).toFixed(2);

    this.recalcTotals();
  }

  private recalcTotals() {
    const sum = (f: (d: any) => number) =>
      (this.vm.details ?? []).reduce((a, b) => a + Number(f(b) || 0), 0);

    this.vm.amountExclVat = +sum(d => d.amountExclVat).toFixed(2);
    this.vm.amountVat = +sum(d => d.amountVat).toFixed(2);
    this.vm.amountInclVat = +sum(d => d.amountInclVat).toFixed(2);
  }

  uomLabel(v: any) {
    const e = UoMEnum as any;
    return typeof v === 'number' ? e[v] : v;
  }

  save() {
    // Admin must pick a branch; non-admin behaves like Cart and lets backend infer branch
    if (this.isAdmin && !this.vm.branchId) return;
    if (!this.vm.details?.length) return;

    const header: CreateUpdateStockMovementHeaderDto = {
      stockMovementType: StockMovementType.Purchase,
      businessPartnerName: this.vm.businessPartnerName,
      description: this.vm.description,
      amountExclVat: this.vm.amountExclVat,
      amountVat: this.vm.amountVat,
      amountInclVat: this.vm.amountInclVat,
      details: this.vm.details,
      isCancelled: (this.vm as any).isCancelled ?? false,
      ...(this.isAdmin && this.vm.branchId
        ? { branchId: this.vm.branchId as any }
        : {}),
    } as any;

    this.stockSvc.create(header).subscribe(() => {
      this.router.navigateByUrl('/stock-report');
    });
  }

  cancel() {
    this.router.navigateByUrl('/stock-report');
  }
}
