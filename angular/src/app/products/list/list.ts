import { Component, OnInit } from '@angular/core';
import { ConfigStateService, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { ProductDto, ProductService, UoMEnum } from 'src/app/proxy/products';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-products-list',
  imports: [RouterModule, CommonModule],
  templateUrl: './list.html',
  styleUrl: './list.scss'
})
export class ListComponent implements OnInit {
  items: ProductDto[] = [];
  total = 0;
  isAdmin = false;
  loading = false;

  pageSize = 20;
  pageIndex = 0;
  sorting: string | undefined = 'productName';

  public UoMEnumMap = UoMEnum as any;

  constructor(
    private productService: ProductService,
    private config: ConfigStateService
  ) {}

  ngOnInit() {
    const user = this.config.getOne('currentUser');
    this.isAdmin = user.roles.includes('admin');
    this.load();
  }

  // --- pagination helpers ---
  get visibleFrom(): number {
    return this.total === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get visibleTo(): number {
    return Math.min(this.total, (this.pageIndex + 1) * this.pageSize);
  }

  apiBase = ((environment as any)?.apis?.default?.url || '').replace(/\/+$/, '');

  /** Build a usable image URL for a product */
  imgSrc(p: ProductDto): string | null {
    const raw = (p as any)?.imageUrl as string | undefined;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw; // already absolute
    const path = raw.replace(/^\/+/, '');       // strip leading slashes
    return this.apiBase ? `${this.apiBase}/${path}` : `/${path}`;
  }

  load() {
    if (this.loading) return;
    this.loading = true;

    const rq: PagedAndSortedResultRequestDto = {
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: this.sorting,
    };

    this.productService.getList(rq).subscribe({
      next: res => {
        this.items = res.items ?? [];
        this.total = res.totalCount ?? this.items.length;
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  changePage(delta: number) {
    if (this.loading) return;

    const next = this.pageIndex + delta;
    if (next < 0) return;

    const maxPageIndex = Math.max(0, Math.ceil(this.total / this.pageSize) - 1);
    if (next > maxPageIndex) return;

    this.pageIndex = next;
    this.load();
  }

  onPageSizeChange(raw: string | number) {
    const val = typeof raw === 'number' ? raw : parseInt(raw, 10);
    this.pageSize = isNaN(val) ? 20 : val;
    this.pageIndex = 0;
    this.load();
  }

  trackById(_: number, item: ProductDto) {
    return item.id;
  }
}