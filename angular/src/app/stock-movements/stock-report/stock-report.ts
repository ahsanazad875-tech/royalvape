import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { finalize } from 'rxjs';

// proxies — adjust paths/names if yours differ
import { StockMovementService, StockReportDto } from 'src/app/proxy/stock-movements';
import { BranchService, BranchDto } from 'src/app/proxy/branches';
import { ProductService, ProductDto } from 'src/app/proxy/products';
import { ConfigStateService } from '@abp/ng.core';

type Opt = { id: string; name: string };

@Component({
  selector: 'app-stock-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stock-report.html',
  styleUrls: ['./stock-report.scss'],
})
export class StockReport implements OnInit {
  filtersCollapsed = false;

  form = this.fb.group({
    branchId: [''],
    productId: [''],
  });

  branches: Opt[] = [];
  products: Opt[] = [];
  isAdmin = false;
  loading = false;

  // full result set from backend
  rows: StockReportDto[] = [];

  // pagination state (client-side)
  totalCount = 0;
  pageIndex = 0;
  pageSize = 25;

  constructor(
    private fb: FormBuilder,
    private stockSvc: StockMovementService,
    private branchSvc: BranchService,
    private productSvc: ProductService,
    private config: ConfigStateService
  ) {}

  // ------ computed helpers ------

  get visibleFrom(): number {
    return this.totalCount === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get visibleTo(): number {
    return Math.min(this.totalCount, (this.pageIndex + 1) * this.pageSize);
  }

  get pagedRows(): StockReportDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  // ------ lifecycle ------

  ngOnInit(): void {
    const user = this.config.getOne('currentUser');
    this.isAdmin = user.roles.includes('admin');

    if (this.isAdmin) {
      this.loadBranches();
    }
    this.loadProducts();
    this.search();
  }

  // ------ lookups ------

  private loadBranches(): void {
    this.branchSvc
      .getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe((res: any) => {
        const items: BranchDto[] = res?.items ?? res ?? [];
        this.branches = items.map(b => ({
          id: String((b as any).id),
          name: (b as any).name,
        }));
      });
  }

  private loadProducts(): void {
    this.productSvc
      .getList({ skipCount: 0, maxResultCount: 1000 })
      .subscribe((res: any) => {
        const items: ProductDto[] = res?.items ?? res ?? [];
        this.products = items.map(p => ({
          id: String((p as any).id),
          name: (p as any).productName ?? (p as any).name ?? '(unnamed)',
        }));
      });
  }

  // ------ data load ------

  search(): void {
    this.pageIndex = 0; // reset to first page on new search
    this.loading = true;

    const branchId = this.form.value.branchId || undefined;
    const productId = this.form.value.productId || undefined;

    this.stockSvc
      .getStockReport(branchId, productId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => {
          this.rows = data ?? [];
          this.totalCount = this.rows.length;
        },
        error: e => console.error(e),
      });
  }

  reset(): void {
    this.form.reset({ branchId: '', productId: '' });
    this.search();
  }

  // ------ pagination actions ------

  changePage(delta: number): void {
    const next = this.pageIndex + delta;
    if (next < 0) {
      return;
    }

    const maxPageIndex = Math.max(
      0,
      Math.ceil(this.totalCount / this.pageSize) - 1
    );
    if (next > maxPageIndex) {
      return;
    }

    this.pageIndex = next;
  }

  onPageSizeChange(raw: string | number): void {
    const val = typeof raw === 'number' ? raw : parseInt(raw, 10);
    this.pageSize = isNaN(val) ? 25 : val;
    this.pageIndex = 0; // go back to first page when page size changes
  }

  // ------ trackBy ------

  trackRow = (_: number, r: StockReportDto) =>
    `${r.branchId ?? 'x'}:${r.productId ?? 'x'}`;
}
