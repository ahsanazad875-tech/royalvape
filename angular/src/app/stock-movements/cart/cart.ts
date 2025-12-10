import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';
import { ProductDto, ProductService, UoMEnum } from 'src/app/proxy/products';
import {
  CreateUpdateStockMovementDetailDto,
  CreateUpdateStockMovementHeaderDto,
  StockMovementService,
  StockMovementType,
} from 'src/app/proxy/stock-movements';
import { BranchService, BranchDto } from 'src/app/proxy/branches';
import { ConfigStateService } from '@abp/ng.core';
import { forkJoin } from 'rxjs';

type CartLine = {
  product: ProductDto;
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
  products: ProductDto[] = [];
  filtered: ProductDto[] = [];
  branches: BranchDto[] = [];

  search = '';
  branchId?: string;

  lines: CartLine[] = [];
  vatRate = 0;
  isAdmin = false;

  customerName = '';

  // pagination (client-side)
  pageSizeOptions = [8, 12, 24, 48];
  pageSize = 8;
  currentPage = 1;

  // Currency symbol
  currencySymbol: string =
    (environment as any)?.pos?.currencySymbol ??
    (environment as any)?.currencySymbol ??
    'Rs';

  // productId -> onHand
  private stockMap: Record<string, number> = {};
  showInStockOnly = false;
  loadingStock = false;

  // API base for images
  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

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

  constructor(
    private productSvc: ProductService,
    private stockSvc: StockMovementService,
    private branchSvc: BranchService,
    private config: ConfigStateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.config.getOne('currentUser');
    this.isAdmin = !!user?.roles?.some(r => r.toLowerCase() === 'admin');

    const allCfg = this.config.getAll() as any;
    const vatFromCfg = allCfg?.extraProperties?.pos?.vatPerc;
    if (vatFromCfg != null) {
      this.vatRate = Number(vatFromCfg) || this.vatRate;
    }

    const currencyFromCfg = allCfg?.extraProperties?.pos?.currencySymbol;
    if (currencyFromCfg) {
      this.currencySymbol = String(currencyFromCfg);
    }

    if (this.isAdmin) {
      this.branchSvc
        .getList({ skipCount: 0, maxResultCount: 1000 })
        .subscribe(res => {
          this.branches = res.items ?? [];
          this.branchId = this.branches[0]?.id;

          const first = this.branches[0] as any;
          if (first && first.vatPerc != null) {
            this.vatRate = Number(first.vatPerc / 100) || this.vatRate;
          }

          this.loadProductsAndStock();
        });
    } else {
      this.loadProductsAndStock();
    }
  }

  // ===== Loading =====

  private loadProductsAndStock() {
    this.productSvc
      .getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe(res => {
        this.products = res.items;
        this.filtered = this.products;
        this.currentPage = 1;
        this.refreshStock();
      });
  }

  refreshStock() {
    if (!this.products?.length) return;

    this.loadingStock = true;

    const allProductIds = this.products.map(p => p.id as string);
    const branchId = this.isAdmin ? (this.branchId as string | undefined) : undefined;

    // batch productIds to avoid huge URLs
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    for (let i = 0; i < allProductIds.length; i += BATCH_SIZE) {
      batches.push(allProductIds.slice(i, i + BATCH_SIZE));
    }

    const svcAny = this.stockSvc as any;
    const hasMap = typeof svcAny.getOnHandMap === 'function';
    const hasList = typeof svcAny.getOnHandList === 'function';

    if (!hasMap && !hasList) {
      // nothing to call, fall back to product DTO fields
      this.fallbackFromProductDto();
      return;
    }

    const calls = batches.map(ids =>
      hasMap
        ? svcAny.getOnHandMap(ids, branchId ?? null)
        : svcAny.getOnHandList(ids, branchId ?? null),
    );

    forkJoin(calls).subscribe({
      next: (results: any[]) => {
        const combined: Record<string, number> = {};

        if (hasMap) {
          // each result is a productId -> onHand map
          for (const res of results) {
            const partial = this.toStringNumberMap(res);
            Object.keys(partial).forEach(k => {
              combined[k] = (combined[k] || 0) + partial[k];
            });
          }
        } else {
          // each result is a list [{ productId, onHand }, ...] or { items: [...] }
          for (const res of results) {
            const list = Array.isArray(res) ? res : res?.items ?? [];
            for (const x of list) {
              const key = String(x.productId);
              const val = Number(x.onHand) || 0;
              combined[key] = (combined[key] || 0) + val;
            }
          }
        }

        this.stockMap = combined;
        this.postStockRefresh();
      },
      error: () => {
        this.fallbackFromProductDto();
      },
    });
  }

  private fallbackFromProductDto() {
    const map: Record<string, number> = {};
    this.products.forEach(p => {
      const guessed =
        (p as any).stockOnHand ??
        (p as any).quantityOnHand ??
        (p as any).onHand ??
        0;
      map[String(p.id)] = Number(guessed) || 0;
    });
    this.stockMap = map;
    this.postStockRefresh();
  }

  private toStringNumberMap(src: any): Record<string, number> {
    const out: Record<string, number> = {};
    if (!src) return out;
    for (const k in src) {
      if (Object.prototype.hasOwnProperty.call(src, k)) {
        out[String(k)] = Number(src[k]) || 0;
      }
    }
    return out;
  }

  private postStockRefresh() {
    this.loadingStock = false;
    this.filter();
    this.lines.forEach(l => {
      const maxQty = this.onHand(l.product);
      if (l.quantity > maxQty) {
        l.quantity = Math.max(0, maxQty);
      }
      this.clampDiscountToCost(l);
    });
    this.lines = this.lines.filter(l => l.quantity > 0);
  }

  // ===== Helpers =====

  imgSrc(p: ProductDto): string | null {
    const raw = (p as any)?.imageUrl as string | undefined;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const path = raw.replace(/^\/+/, '');
    return this.apiBase ? `${this.apiBase}/${path}` : `/${path}`;
  }

  onHand(p: ProductDto): number {
    return this.stockMap[String(p.id)] ?? 0;
  }

  iconFor(p: ProductDto): string {
    const t = (p.productTypeName || '').toLowerCase();
    for (const key of Object.keys(this.typeIcons)) {
      if (t.includes(key)) return this.typeIcons[key];
    }
    return 'fa-solid fa-box';
  }

  alreadyInCart(p: ProductDto) {
    return this.lines.some(x => x.product.id === p.id);
  }

  trackByLine = (_: number, l: CartLine) => l.product.id;

  // ===== Filtering + pagination =====

  filter() {
    const q = this.search.trim().toLowerCase();

    let base = !q
      ? this.products
      : this.products.filter(p =>
          (p.productName || '').toLowerCase().includes(q) ||
          (p.productNo || '').toLowerCase().includes(q) ||
          (p.productTypeName || '').toLowerCase().includes(q),
        );

    if (this.showInStockOnly) {
      base = base.filter(p => this.onHand(p) > 0);
    }

    this.filtered = base;
    this.currentPage = 1;
  }

  get totalPages(): number {
    return this.filtered.length
      ? Math.ceil(this.filtered.length / this.pageSize)
      : 1;
  }

  get pagedProducts(): ProductDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    if (!this.filtered.length) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    if (!this.filtered.length) return 0;
    return Math.min(this.currentPage * this.pageSize, this.filtered.length);
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  goToPage(page: number) {
    const total = this.totalPages;
    if (page < 1) page = 1;
    if (page > total) page = total;
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // ===== Discount / price guards =====

  /** Minimum allowed unit price = purchasing price (buyingUnitPrice) if available */
  private minUnitPrice(p: ProductDto): number {
    const purchase = Number((p as any).buyingUnitPrice ?? 0);
    if (!Number.isFinite(purchase) || purchase <= 0) {
      return 0;
    }
    return purchase;
  }

  /** Clamp discount so that selling price never goes below purchase price and never below zero line total */
  private getClampedDiscount(l: CartLine, candidate: number): number {
    const qty = Number(l.quantity) || 0;
    const unitPrice = Number(l.unitPrice) || 0;
    const minPrice = this.minUnitPrice(l.product);

    if (qty <= 0 || unitPrice <= 0) {
      return 0;
    }

    // Max discount to keep line >= qty * minPrice
    const maxDiscountByCost = Math.max(0, qty * (unitPrice - minPrice));

    // Max discount to keep line >= 0 (safety)
    const maxDiscountByZero = qty * unitPrice;

    let maxDiscount = maxDiscountByCost || maxDiscountByZero;
    if (maxDiscount < 0) maxDiscount = 0;

    let v = Number(candidate);
    if (!Number.isFinite(v) || v < 0) v = 0;

    if (v > maxDiscount) v = maxDiscount;
    if (v < 0) v = 0;

    return +v.toFixed(2);
  }

  private clampDiscountToCost(l: CartLine) {
    l.discountAmount = this.getClampedDiscount(
      l,
      Number(l.discountAmount) || 0,
    );
  }

  // ===== Cart ops (stock-aware) =====

  addToCart(p: ProductDto) {
    const inStock = this.onHand(p);
    if (inStock <= 0) return;

    const line = this.lines.find(x => x.product.id === p.id);
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
      product: p,
      quantity: 1,
      unitPrice: p.sellingUnitPrice ?? 0,
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

    // force DOM input to stay at clamped value
    if (inputEl) {
      inputEl.value = clamped ? clamped.toString() : '';
    }

    this.lines = [...this.lines];
  }

  remaining(l: CartLine): number {
    return Math.max(0, this.onHand(l.product) - Number(l.quantity || 0));
  }

  remove(l: CartLine) {
    this.lines = this.lines.filter(x => x !== l);
  }

  clear() {
    this.lines = [];
  }

  // ===== Totals & checkout =====

  get totals() {
    const ex = this.lines.reduce((a, l) => {
      const lineGross = Number(l.quantity) * Number(l.unitPrice);
      const disc = Number(l.discountAmount || 0);
      const net = Math.max(0, lineGross - disc);
      return a + net;
    }, 0);

    const vat = ex * this.vatRate;
    const inc = ex + vat;
    return {
      ex: +ex.toFixed(2),
      vat: +vat.toFixed(2),
      inc: +inc.toFixed(2),
    };
  }

  private validateAgainstStock(): string[] {
    const errors: string[] = [];
    for (const l of this.lines) {
      const available = this.onHand(l.product);
      if (l.quantity > available) {
        errors.push(
          `${l.product.productName} (wanted ${l.quantity}, available ${available})`,
        );
      }
    }
    return errors;
  }

  checkout() {
    if (!this.lines.length) return;

    // final safety clamp
    this.lines.forEach(l => this.clampDiscountToCost(l));

    const over = this.validateAgainstStock();
    if (over.length) {
      alert('Some lines exceed available stock:\n\n' + over.join('\n'));
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
        const lineGross = Number(l.quantity) * Number(l.unitPrice);
        const disc = Number(l.discountAmount || 0);
        const ex = Math.max(0, lineGross - disc);
        return {
          productId: l.product.id as any,
          uoM: l.product.uoM,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          amountExclVat: +ex.toFixed(2),
          amountVat: +(ex * this.vatRate).toFixed(2),
          amountInclVat: +(ex * (1 + this.vatRate)).toFixed(2),
        };
      }),
      isCancelled: false,
    };

    // UoM enum normalization (if backend expects number)
    header.details!.forEach(d => {
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

  // UI helpers
  get selectedBranchName(): string {
    const b = this.branches.find(x => x.id === this.branchId);
    return b?.name ?? '—';
  }

  onBranchChanged() {
    const b = this.branches.find(x => x.id === this.branchId) as any;
    if (b && b.vatPerc != null) {
      this.vatRate = Number(b.vatPerc / 100) || this.vatRate;
    }
    this.refreshStock();
  }
}