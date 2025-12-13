import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfigStateService } from '@abp/ng.core';
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
  unitPrice: number;
  discountAmount: number;
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
})
export class Cart implements OnInit {
  // current backend page
  products: ProductStockListItemDto[] = [];
  totalCount = 0;

  branches: BranchDto[] = [];

  search = '';
  branchId?: string;

  lines: CartLine[] = [];
  vatRate = 0;
  isAdmin = false;

  customerName = '';

  // pagination (BACKEND)
  pageSizeOptions = [8, 12, 24, 48];
  pageSize = 8;
  currentPage = 1;

  // Currency symbol
  currencySymbol: string =
    (environment as any)?.pos?.currencySymbol ??
    (environment as any)?.currencySymbol ??
    'Rs';

  showInStockOnly = false;
  loadingStock = false;

  // API base for images
  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

  // local cache so cart items can still resolve latest onHand if they appear in any loaded page
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
    private router: Router,
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
      maxResultCount: this.pageSize, // ✅ backend page size
      // sorting not needed; backend is already sorting by OnHand desc
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

        // cache products for cart lookups
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

    // branch affects stock; safest is to clear the cart
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
  // Cart + pricing guards
  // =============================

  private clampCartToStock() {
    this.lines.forEach(l => {
      const maxQty = this.onHand(l.product);
      if (l.quantity > maxQty) l.quantity = Math.max(0, maxQty);
      this.clampDiscountToCost(l);
    });

    this.lines = this.lines.filter(l => l.quantity > 0);
  }

  private minUnitPrice(p: ProductStockListItemDto): number {
    const purchase = Number((p as any).buyingUnitPrice ?? 0);
    return Number.isFinite(purchase) && purchase > 0 ? purchase : 0;
  }

  private getClampedDiscount(l: CartLine, candidate: number): number {
    const qty = Number(l.quantity) || 0;
    const unitPrice = Number(l.unitPrice) || 0;
    const minPrice = this.minUnitPrice(l.product);

    if (qty <= 0 || unitPrice <= 0) return 0;

    const maxDiscountByCost = Math.max(0, qty * (unitPrice - minPrice));
    const maxDiscountByZero = qty * unitPrice;

    let maxDiscount = maxDiscountByCost || maxDiscountByZero;
    if (maxDiscount < 0) maxDiscount = 0;

    let v = Number(candidate);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > maxDiscount) v = maxDiscount;

    return +v.toFixed(2);
  }

  private clampDiscountToCost(l: CartLine) {
    l.discountAmount = this.getClampedDiscount(l, Number(l.discountAmount) || 0);
  }

  // ✅ uses id everywhere
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
        this.clampDiscountToCost(line);
        this.lines = [...this.lines];
      }
      return;
    }

    const l: CartLine = {
      product: latest,
      quantity: 1,
      unitPrice: Number((latest as any).sellingUnitPrice ?? 0),
      discountAmount: 0,
    };

    this.clampDiscountToCost(l);
    this.lines = [...this.lines, l];
  }

  inc(l: CartLine) {
    const maxQty = this.onHand(l.product);
    const q = Number(l.quantity || 0);
    if (q < maxQty) {
      l.quantity = q + 1;
      this.clampDiscountToCost(l);
      this.lines = [...this.lines];
    }
  }

  dec(l: CartLine) {
    const q = Number(l.quantity || 0);
    if (q > 1) {
      l.quantity = q - 1;
      this.clampDiscountToCost(l);
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

    this.clampDiscountToCost(l);
    this.lines = [...this.lines];
  }

  discountChanged(l: CartLine, raw: any, inputEl: HTMLInputElement) {
    const clamped = this.getClampedDiscount(l, Number(raw) || 0);
    l.discountAmount = clamped;
    if (inputEl) inputEl.value = clamped ? clamped.toString() : '';
    this.lines = [...this.lines];
  }

  remove(l: CartLine) {
    this.lines = this.lines.filter(x => x !== l);
  }

  clear() {
    this.lines = [];
  }

  get totals() {
    const ex = this.lines.reduce((a, l) => {
      const lineGross = Number(l.quantity) * Number(l.unitPrice);
      const disc = Number(l.discountAmount || 0);
      const net = Math.max(0, lineGross - disc);
      return a + net;
    }, 0);

    const vat = ex * this.vatRate;
    const inc = ex + vat;

    return { ex: +ex.toFixed(2), vat: +vat.toFixed(2), inc: +inc.toFixed(2) };
  }

  checkout() {
    if (!this.lines.length) return;

    this.lines.forEach(l => this.clampDiscountToCost(l));

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
        const lineGross = Number(l.quantity) * Number(l.unitPrice);
        const disc = Number(l.discountAmount || 0);
        const ex = Math.max(0, lineGross - disc);

        return {
          productId: l.product.id as any, // ✅ id everywhere
          uoM: (l.product as any).uoM,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          amountExclVat: +ex.toFixed(2),
          amountVat: +(ex * this.vatRate).toFixed(2),
          amountInclVat: +(ex * (1 + this.vatRate)).toFixed(2),
        };
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

    this.stockSvc.create(header).subscribe(() => {
      this.clear();
      this.router.navigateByUrl('/stock-report');
    });
  }
}