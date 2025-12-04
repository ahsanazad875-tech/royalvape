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
  StockMovementType
} from 'src/app/proxy/stock-movements';
import { BranchService, BranchDto } from 'src/app/proxy/branches';
import { ConfigStateService } from '@abp/ng.core';

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
  styleUrls: ['./cart.scss']
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

  // Currency symbol
  currencySymbol: string =
    (environment as any)?.pos?.currencySymbol ??
    (environment as any)?.currencySymbol ??
    'Rs';

  // productId -> onHand
  private stockMap: Record<string, number> = {};
  showInStockOnly = false;
  loadingStock = false;

  private typeIcons: Record<string, string> = {
    'device': 'fa-solid fa-mobile-screen-button',
    'mod': 'fa-solid fa-mobile-screen',
    'pod': 'fa-solid fa-battery-three-quarters',
    'coil': 'fa-solid fa-screwdriver-wrench',
    'e-liquid': 'fa-solid fa-droplet',
    'e liquid': 'fa-solid fa-droplet',
    'juice': 'fa-solid fa-bottle-droplet',
    'accessory': 'fa-solid fa-plug',
    'charger': 'fa-solid fa-bolt',
    'tank': 'fa-solid fa-flask',
    'battery': 'fa-solid fa-battery-full'
  };

  constructor(
    private productSvc: ProductService,
    private stockSvc: StockMovementService,
    private branchSvc: BranchService,
    private config: ConfigStateService,
    private router: Router
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
      this.branchSvc.getList({ skipCount: 0, maxResultCount: 1000 }).subscribe(res => {
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

  // --- Loading ---

  private loadProductsAndStock() {
    this.productSvc.getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe(res => {
        this.products = res.items;
        this.filtered = this.products;
        this.refreshStock();
      });
  }

  refreshStock() {
    if (!this.products?.length) return;

    this.loadingStock = true;

    const productIds = this.products.map(p => p.id as any);
    const branch = this.isAdmin ? (this.branchId as any) : null;

    this.stockSvc.getOnHandMap(productIds, branch).subscribe({
      next: (map: Record<string, number>) => {
        this.stockMap = this.toStringNumberMap(map);
        this.postStockRefresh();
      },
      error: _ => this.tryListVersion(branch, productIds)
    });
  }

  // Base URL of your API (ABP environments usually expose this)
  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

  /** Build a usable image URL for a product */
  imgSrc(p: ProductDto): string | null {
    const raw = (p as any)?.imageUrl as string | undefined;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;              // already absolute
    const path = raw.replace(/^\/+/, '');                   // strip leading slashes
    return this.apiBase ? `${this.apiBase}/${path}` : `/${path}`;
  }

  private tryListVersion(branch: any, productIds: any[]) {
    if ((this.stockSvc as any).getOnHandList) {
      (this.stockSvc as any).getOnHandList(branch, productIds).subscribe({
        next: (items: Array<{ productId: string; onHand: number }> | any) => {
          const list = Array.isArray(items) ? items : (items?.items ?? []);
          const map: Record<string, number> = {};
          list.forEach((x: any) => (map[String(x.productId)] = Number(x.onHand) || 0));
          this.stockMap = map;
          this.postStockRefresh();
        },
        error: _ => this.fallbackFromProductDto()
      });
    } else {
      this.fallbackFromProductDto();
    }
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
        out[String(k)] = Number((src as any)[k]) || 0;
      }
    }
    return out;
  }

  private postStockRefresh() {
    this.loadingStock = false;
    this.filter();
    this.lines.forEach(l => {
      const maxQty = this.onHand(l.product);
      if (l.quantity > maxQty) l.quantity = Math.max(0, maxQty);
    });
    this.lines = this.lines.filter(l => l.quantity > 0);
  }

  // --- Helpers ---

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

  // --- Filtering ---

  filter() {
    const q = this.search.trim().toLowerCase();

    let base = !q
      ? this.products
      : this.products.filter(p =>
          (p.productName || '').toLowerCase().includes(q) ||
          (p.productNo || '').toLowerCase().includes(q) ||
          (p.productTypeName || '').toLowerCase().includes(q)
        );

    if (this.showInStockOnly) {
      base = base.filter(p => this.onHand(p) > 0);
    }

    this.filtered = base;
  }

  // --- Cart ops (stock-aware) ---

  addToCart(p: ProductDto) {
    const inStock = this.onHand(p);
    if (inStock <= 0) return;

    const line = this.lines.find(x => x.product.id === p.id);
    if (line) {
      const next = Math.min(Number(line.quantity || 0) + 1, inStock);
      if (next !== line.quantity) {
        line.quantity = next;
        this.lines = [...this.lines];
      }
      return;
    }

    this.lines = [
      ...this.lines,
      {
        product: p,
        quantity: 1,
        unitPrice: p.sellingUnitPrice ?? 0,
        discountAmount: 0
      }
    ];
  }

  inc(l: CartLine) {
    const maxQty = this.onHand(l.product);
    const q = Number(l.quantity || 0);
    if (q < maxQty) {
      l.quantity = q + 1;
      this.lines = [...this.lines];
    }
  }

  dec(l: CartLine) {
    const q = Number(l.quantity || 0);
    if (q > 1) {
      l.quantity = q - 1;
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
    if (l.quantity === 0) this.remove(l);
    else this.lines = [...this.lines];
  }

  discountChanged(l: CartLine, val: any) {
    l.discountAmount = Math.max(0, Number(val) || 0);
    this.lines = [...this.lines];
  }

  remaining(l: CartLine): number {
    return Math.max(0, this.onHand(l.product) - Number(l.quantity || 0));
  }

  remove(l: CartLine) {
    this.lines = this.lines.filter(x => x !== l);
  }

  clear() { this.lines = []; }

  // --- Totals & checkout ---

  get totals() {
    const ex = this.lines.reduce(
      (a, l) =>
        a +
        Math.max(
          0,
          Number(l.quantity) * Number(l.unitPrice) -
            Number(l.discountAmount || 0)
        ),
      0
    );
    const vat = ex * this.vatRate;
    const inc = ex + vat;
    return { ex: +ex.toFixed(2), vat: +vat.toFixed(2), inc: +inc.toFixed(2) };
  }

  private validateAgainstStock(): string[] {
    const errors: string[] = [];
    for (const l of this.lines) {
      const available = this.onHand(l.product);
      if (l.quantity > available) {
        errors.push(
          `${l.product.productName} (wanted ${l.quantity}, available ${available})`
        );
      }
    }
    return errors;
  }

  checkout() {
    if (!this.lines.length) return;

    const over = this.validateAgainstStock();
    if (over.length) {
      alert('Some lines exceed available stock:\n\n' + over.join('\n'));
      return;
    }

    const header: CreateUpdateStockMovementHeaderDto = {
      stockMovementNo: '',
      stockMovementType: StockMovementType.Sale,
      businessPartnerName: '',
      description: 'POS Sale',
      amountExclVat: this.totals.ex,
      amountVat: this.totals.vat,
      amountInclVat: this.totals.inc,
      ...(this.isAdmin && this.branchId ? { branchId: this.branchId as any } : {}),
      details: this.lines.map<CreateUpdateStockMovementDetailDto>(l => {
        const ex = Math.max(
          0,
          Number(l.quantity) * Number(l.unitPrice) -
            Number(l.discountAmount || 0)
        );
        return {
          productId: l.product.id as any,
          uoM: l.product.uoM,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          amountExclVat: +ex.toFixed(2),
          amountVat: +(ex * this.vatRate).toFixed(2),
          amountInclVat: +(ex * (1 + this.vatRate)).toFixed(2)
        };
      }),
      isCancelled: false
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
