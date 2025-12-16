import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfigStateService } from '@abp/ng.core';
import { ToasterService } from '@abp/ng.theme.shared';
import { environment } from 'src/environments/environment';

import { BranchService, BranchDto } from 'src/app/proxy/branches';
import { UoMEnum } from 'src/app/proxy/products';

import {
  CreateUpdateStockMovementDetailDto,
  CreateUpdateStockMovementHeaderDto,
  ProductStockListItemDto,
  ProductStockListRequestDto,
  StockMovementService,
  StockMovementType,
} from 'src/app/proxy/stock-movements';

type CartLine = {
  product: ProductStockListItemDto;
  quantity: number;

  // fixed (DO NOT EDIT)
  unitPrice: number;

  // user-entered line total (EX VAT)
  amountExclVat?: number;

  // track if user has overridden default
  amountOverridden: boolean;

  // validation feedback (set on submit only)
  amountError?: string | null;
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
})
export class Cart implements OnInit {
  products: ProductStockListItemDto[] = [];
  totalCount = 0;

  branches: BranchDto[] = [];

  search = '';
  branchId?: string;

  lines: CartLine[] = [];
  vatRate = 0;
  isAdmin = false;

  customerName = '';

  pageSizeOptions = [8, 12, 24, 48];
  pageSize = 8;
  currentPage = 1;

  currencySymbol: string =
    (environment as any)?.pos?.currencySymbol ??
    (environment as any)?.currencySymbol ??
    'Rs';

  showInStockOnly = false;
  loadingStock = false;

  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

  private productIndex = new Map<string, ProductStockListItemDto>();

  private typeIcons: Record<string, string> = {
    device: 'fa-solid fa-mobile-screen-button',
    mod: 'fa-solid fa-mobile-screen',
    pod: 'fa-solid fa-battery-three-quarters',
    coil: 'fa-solid fa-screwdriver-wrench',
    'e-liquid': 'fa-solid fa-droplet',
    'e liquid': 'fa-solid fa-droplet',
    juice: 'fa-solid fa-bottle-droplet',
    accessory: 'fa-solid fa-plug',
    charger: 'fa-solid fa-bolt',
    tank: 'fa-solid fa-flask',
    battery: 'fa-solid fa-battery-full',
  };

  private searchDebounce?: any;

  constructor(
    private stockSvc: StockMovementService,
    private branchSvc: BranchService,
    private config: ConfigStateService,
    private toaster: ToasterService,
  ) {}

  ngOnInit(): void {
    const user = this.config.getOne('currentUser') as any;
    const roles: string[] = (user?.roles ?? []).map((r: any) => String(r).toLowerCase());
    this.isAdmin = roles.includes('admin');

    const allCfg = this.config.getAll() as any;

    const vatFromCfg = allCfg?.extraProperties?.pos?.vatPerc;
    if (vatFromCfg != null) this.vatRate = Number(vatFromCfg) || this.vatRate;

    const currencyFromCfg = allCfg?.extraProperties?.pos?.currencySymbol;
    if (currencyFromCfg) this.currencySymbol = String(currencyFromCfg);

    if (this.isAdmin) {
      this.branchSvc.getList({ skipCount: 0, maxResultCount: 1000 }).subscribe(res => {
        this.branches = res.items ?? [];
        this.branchId = this.branches[0]?.id;

        const first = this.branches[0] as any;
        if (first && first.vatPerc != null) {
          this.vatRate = Number(first.vatPerc / 100) || this.vatRate;
        }

        this.loadProductsPage(1);
      });
    } else {
      this.loadProductsPage(1);
    }
  }

  // =============================
  // Backend pagination helpers
  // =============================

  get totalPages(): number {
    return this.totalCount ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

  get pageStart(): number {
    if (!this.totalCount) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    if (!this.totalCount) return 0;
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  private loadProductsPage(page: number) {
    if (page < 1) page = 1;

    this.currentPage = page;
    this.loadingStock = true;

    const req: ProductStockListRequestDto = {
      skipCount: (this.currentPage - 1) * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: undefined as any,

      branchId: this.isAdmin ? (this.branchId as any) : undefined,
      filter: this.search?.trim() ? this.search.trim() : undefined,

      productId: undefined,
      productTypeId: undefined,

      onlyAvailable: this.showInStockOnly,
    } as any;

    this.stockSvc.getProductStockList(req).subscribe({
      next: res => {
        this.products = res.items ?? [];
        this.totalCount = Number(res.totalCount ?? 0);

        for (const p of this.products) {
          this.productIndex.set(String(p.id), p);
        }

        this.loadingStock = false;
        this.clampCartToStock();
      },
      error: () => {
        this.loadingStock = false;
        this.products = [];
        this.totalCount = 0;
      },
    });
  }

  onBranchChanged() {
    const b = this.branches.find(x => x.id === this.branchId) as any;
    if (b && b.vatPerc != null) {
      this.vatRate = Number(b.vatPerc / 100) || this.vatRate;
    }

    this.clear();
    this.productIndex.clear();
    this.loadProductsPage(1);
  }

  onSearchInput() {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.loadProductsPage(1);
    }, 250);
  }

  onToggleInStockOnly() {
    this.loadProductsPage(1);
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.loadProductsPage(1);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.loadProductsPage(this.currentPage + 1);
  }

  prevPage() {
    if (this.currentPage > 1) this.loadProductsPage(this.currentPage - 1);
  }

  // =============================
  // UI helpers
  // =============================

  get selectedBranchName(): string {
    const b = this.branches.find(x => x.id === this.branchId);
    return b?.name ?? '—';
  }

  imgSrc(p: ProductStockListItemDto): string | null {
    const raw = (p as any)?.imageUrl as string | undefined;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const path = raw.replace(/^\/+/, '');
    return this.apiBase ? `${this.apiBase}/${path}` : `/${path}`;
  }

  onHand(p: ProductStockListItemDto): number {
    const id = String(p.id);
    const latest = this.productIndex.get(id);
    return Number((latest as any)?.onHand ?? (p as any)?.onHand ?? 0) || 0;
  }

  iconFor(p: ProductStockListItemDto): string {
    const t = String((p as any)?.productType || '').toLowerCase();
    for (const key of Object.keys(this.typeIcons)) {
      if (t.includes(key)) return this.typeIcons[key];
    }
    return 'fa-solid fa-box';
  }

  alreadyInCart(p: ProductStockListItemDto) {
    return this.lines.some(x => String(x.product.id) === String(p.id));
  }

  trackByLine = (_: number, l: CartLine) => String(l.product.id);

  // =============================
  // Amount (Ex VAT) behavior
  // =============================

  /** ALWAYS calculated (readonly display): qty * unitPrice */
  calcEx(l: CartLine): number {
    const q = Number(l.quantity) || 0;
    const unit = Number(l.unitPrice) || 0;
    return +(q * unit).toFixed(2);
  }

  /** Actual amount (Ex VAT) from input; falls back to calcEx for totals/UI convenience */
  lineEx(l: CartLine): number {
    const v = l.amountExclVat;
    if (v === null || v === undefined || v === ('' as any)) return this.calcEx(l);
    const n = Number(v);
    if (!Number.isFinite(n)) return this.calcEx(l);
    return +n.toFixed(2);
  }

  /** No validation while typing; validate only on checkout */
  amountExChanged(l: CartLine, raw: any, inputEl: HTMLInputElement) {
    l.amountOverridden = true;
    l.amountError = null;

    if (raw === '' || raw === null || raw === undefined) {
      l.amountExclVat = undefined;
      if (inputEl) inputEl.value = '';
      this.lines = [...this.lines];
      return;
    }

    const n = Number(raw);
    l.amountExclVat = Number.isFinite(n) ? n : undefined;

    this.lines = [...this.lines];
  }

  private clampCartToStock() {
    this.lines.forEach(l => {
      const maxQty = this.onHand(l.product);
      if (l.quantity > maxQty) l.quantity = Math.max(0, maxQty);

      if (!l.amountOverridden) {
        l.amountExclVat = this.calcEx(l);
      }
    });

    this.lines = this.lines.filter(l => l.quantity > 0);
  }

  private buyingUnitPrice(p: ProductStockListItemDto): number {
    const v = Number((p as any)?.buyingUnitPrice ?? 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  private validateAmountsOnSubmit(): boolean {
    let ok = true;

    for (const l of this.lines) {
      l.amountError = null;

      const ex = l.amountExclVat;
      if (ex === null || ex === undefined || ex === ('' as any)) {
        l.amountError = 'Amount (Ex VAT) is required.';
        ok = false;
        continue;
      }

      const exNum = Number(ex);
      if (!Number.isFinite(exNum)) {
        l.amountError = 'Amount (Ex VAT) must be a valid number.';
        ok = false;
        continue;
      }

      if (exNum < 0) {
        l.amountError = 'Amount (Ex VAT) cannot be negative.';
        ok = false;
        continue;
      }

      const buy = this.buyingUnitPrice(l.product);
      if (buy > 0) {
        const minAllowed = (Number(l.quantity) || 0) * buy;
        if (exNum < minAllowed) {
          l.amountError = `Amount is below cost. Minimum is ${this.currencySymbol} ${minAllowed.toFixed(2)}.`;
          ok = false;
          continue;
        }
      }
    }

    if (!ok) {
      this.lines = [...this.lines];
      const first = this.lines.find(x => !!x.amountError);
      this.toaster.error(
        first?.amountError || 'Please fix highlighted amounts before checkout.',
        'Validation',
      );
    }

    return ok;
  }

  // =============================
  // Cart
  // =============================

  addToCart(p: ProductStockListItemDto) {
    const inStock = this.onHand(p);
    if (inStock <= 0) return;

    const id = String(p.id);
    const latest = this.productIndex.get(id) ?? p;

    const line = this.lines.find(x => String(x.product.id) === id);
    if (line) {
      const next = Math.min(Number(line.quantity || 0) + 1, inStock);
      if (next !== line.quantity) {
        line.quantity = next;

        if (!line.amountOverridden) {
          line.amountExclVat = this.calcEx(line);
        }

        this.lines = [...this.lines];
      }
      return;
    }

    const l: CartLine = {
      product: latest,
      quantity: 1,
      unitPrice: Number((latest as any).sellingUnitPrice ?? 0),
      amountExclVat: 0,
      amountOverridden: false,
      amountError: null,
    };

    l.amountExclVat = this.calcEx(l);

    this.lines = [...this.lines, l];
  }

  inc(l: CartLine) {
    const maxQty = this.onHand(l.product);
    const q = Number(l.quantity || 0);
    if (q < maxQty) {
      l.quantity = q + 1;

      if (!l.amountOverridden) {
        l.amountExclVat = this.calcEx(l);
      }

      l.amountError = null;
      this.lines = [...this.lines];
    }
  }

  dec(l: CartLine) {
    const q = Number(l.quantity || 0);
    if (q > 1) {
      l.quantity = q - 1;

      if (!l.amountOverridden) {
        l.amountExclVat = this.calcEx(l);
      }

      l.amountError = null;
      this.lines = [...this.lines];
    } else {
      this.remove(l);
    }
  }

  qtyChanged(l: CartLine) {
    const maxQty = this.onHand(l.product);
    l.quantity = Number(l.quantity);

    if (!Number.isFinite(l.quantity) || l.quantity < 1) l.quantity = 1;
    if (l.quantity > maxQty) l.quantity = Math.max(0, maxQty);

    if (l.quantity === 0) {
      this.remove(l);
      return;
    }

    if (!l.amountOverridden) {
      l.amountExclVat = this.calcEx(l);
    }

    l.amountError = null;
    this.lines = [...this.lines];
  }

  remove(l: CartLine) {
    this.lines = this.lines.filter(x => x !== l);
  }

  clear() {
    this.lines = [];
    this.customerName = '';
  }

  // =============================
  // Totals (based on actual Amount Ex VAT input; falls back to calc if empty)
  // =============================

  get totals() {
    const ex = this.lines.reduce((a, l) => {
      const v = this.lineEx(l);
      return a + (Number.isFinite(v) ? Math.max(0, v) : 0);
    }, 0);

    const vat = ex * this.vatRate;
    const inc = ex + vat;

    return { ex: +ex.toFixed(2), vat: +vat.toFixed(2), inc: +inc.toFixed(2) };
  }

  // =============================
  // Checkout
  // =============================

  checkout() {
    if (!this.lines.length) return;

    if (!this.validateAmountsOnSubmit()) {
      return;
    }

    const header: CreateUpdateStockMovementHeaderDto = {
      stockMovementNo: '',
      stockMovementType: StockMovementType.Sale,
      businessPartnerName: this.customerName.trim() || '',
      description: 'POS Sale',
      amountExclVat: this.totals.ex,
      amountVat: this.totals.vat,
      amountInclVat: this.totals.inc,
      ...(this.isAdmin && this.branchId ? { branchId: this.branchId as any } : {}),
      details: this.lines.map<CreateUpdateStockMovementDetailDto>(l => {
        const ex = this.lineEx(l);

        return {
          productId: l.product.id as any,
          uoM: (l.product as any).uoM,
          quantity: l.quantity,
          unitPrice: l.unitPrice, // fixed
          discountAmount: 0 as any,
          amountExclVat: +ex.toFixed(2),
          amountVat: +(ex * this.vatRate).toFixed(2),
          amountInclVat: +(ex * (1 + this.vatRate)).toFixed(2),
        } as any;
      }),
      isCancelled: false,
    } as any;

    // only if backend expects numeric enum
    header.details?.forEach(d => {
      if (
        typeof (UoMEnum as any).Piece === 'number' &&
        typeof d.uoM === 'string' &&
        /^\d+$/.test(d.uoM as any)
      ) {
        d.uoM = Number(d.uoM as any);
      }
    });

    this.stockSvc.create(header).subscribe({
      next: () => {
        // ✅ success: toast + clear + refresh products (no navigation)
        this.toaster.success('Sale completed successfully.', 'Success');

        this.clear();

        // refresh stock for current page / current filters
        this.productIndex.clear();
        this.loadProductsPage(this.currentPage);
      },
      error: () => {
        this.toaster.error('Checkout failed. Please try again.', 'Error');
      },
    });
  }
}