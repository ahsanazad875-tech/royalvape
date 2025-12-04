import { Component, OnInit } from '@angular/core';
import { ConfigStateService, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-types-list',
  imports: [RouterModule, CommonModule],
  templateUrl: './list.html'
})
export class List implements OnInit {
  items: ProductTypeDto[] = [];
  total = 0;
  isAdmin = false;
  loading = false;

  pageSize = 20;
  pageIndex = 0;
  sorting: string | undefined = 'Type'; // adjust to match backend property name

  constructor(
    private service: ProductTypeService,
    private config: ConfigStateService
  ) {}

  ngOnInit() {
    const user = this.config.getOne('currentUser');
    this.isAdmin = user.roles.includes('admin');
    this.load();
  }

  get visibleFrom(): number {
    return this.total === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get visibleTo(): number {
    return Math.min(this.total, (this.pageIndex + 1) * this.pageSize);
  }

  load() {
    if (this.loading) return;
    this.loading = true;

    const rq: PagedAndSortedResultRequestDto = {
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: this.sorting,
    };

    this.service.getList(rq).subscribe({
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

  trackById(_: number, item: ProductTypeDto) {
    return item.id;
  }
}