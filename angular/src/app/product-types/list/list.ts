import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ConfigStateService } from '@abp/ng.core';
import { ProductTypeDto, ProductTypeService } from 'src/app/proxy/product-types';

import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';

type NzSortOrder = 'ascend' | 'descend' | null;

const SORT = {
  Type: 'Type',
  TypeDesc: 'TypeDesc',
  CreationTime: 'CreationTime',
  CreatorName: 'Creator.UserName', // only works if backend supports navigation sorting
} as const;

@Component({
  selector: 'app-product-types-list',
  standalone: true,
  imports: [RouterModule, CommonModule, NzTableModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List implements OnInit {
  readonly SORT = SORT;

  items: ProductTypeDto[] = [];
  total = 0;

  isAdmin = false;
  loading = false;

  // nz-table is 1-based
  pageSize = 20;
  pageIndex = 1;

  private currentSortKey: string = SORT.Type;
  private currentSortOrder: NzSortOrder = 'ascend';

  constructor(
    private service: ProductTypeService,
    private config: ConfigStateService
  ) {}

  ngOnInit() {
    const user = this.config.getOne('currentUser') as any;
    const roles: string[] = user?.roles || [];
    this.isAdmin = roles.some(r => (r || '').toLowerCase() === 'admin');

    // initial load will be triggered by nz-table's nzQueryParams on first render
  }

  // Build "Type ASC" etc for backend
  private buildSorting(): string {
    const dir = this.currentSortOrder === 'descend' ? 'DESC' : 'ASC';
    return `${this.currentSortKey} ${dir}`;
  }

  onQueryParamsChange(params: NzTableQueryParams) {
    const { pageIndex, pageSize, sort } = params;

    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    const active = sort.find(s => s.value !== null);
    if (active?.key && active.value) {
      this.currentSortKey = active.key;
      this.currentSortOrder = active.value as NzSortOrder;
    } else {
      this.currentSortKey = SORT.Type;
      this.currentSortOrder = 'ascend';
    }

    this.load();
  }

  sortOrder(key: string): NzSortOrder {
    return this.currentSortKey === key ? this.currentSortOrder : null;
  }

  private load() {
    if (this.loading) return;
    this.loading = true;

    this.service.getList({
      skipCount: (this.pageIndex - 1) * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: this.buildSorting(),
    } as any).subscribe({
      next: res => {
        this.items = res.items ?? [];
        this.total = res.totalCount ?? 0;
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  trackById(_: number, item: ProductTypeDto) {
    return item.id;
  }
}