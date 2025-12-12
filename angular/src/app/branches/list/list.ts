import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';

import { firstValueFrom } from 'rxjs';

import { BranchDto, BranchService } from 'src/app/proxy/branches';

type NzSortOrder = 'ascend' | 'descend' | null;

const SORT = {
  Code: 'Code',
  Name: 'Name',
  VatPerc: 'VatPerc',
  IsActive: 'IsActive',
} as const;

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [RouterModule, CommonModule, NzTableModule],
  templateUrl: './list.html',
  styleUrls: ['./list.scss'],
})
export class List implements OnInit {
  readonly SORT = SORT;

  loading = false;

  // Full dataset loaded once
  items: BranchDto[] = [];

  // Page slice for nz-table
  rows: BranchDto[] = [];

  total = 0;

  // nz-table is 1-based
  pageIndex = 1;
  pageSize = 20;

  private currentSortKey: string = SORT.Name;
  private currentSortOrder: NzSortOrder = 'ascend';

  // fetch size per call (only used to load everything once)
  private readonly FETCH_SIZE = 1000;

  constructor(private service: BranchService) {}

  ngOnInit(): void {
    void this.loadAll();
  }

  refresh(): void {
    void this.loadAll();
  }

  // nz-table emits paging/sorting changes — we apply locally ONLY
  onQueryParamsChange(params: NzTableQueryParams): void {
    const { pageIndex, pageSize, sort } = params;

    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    const active = sort.find(s => s.value !== null);
    if (active?.key && active.value) {
      this.currentSortKey = active.key;
      this.currentSortOrder = active.value as NzSortOrder;
    } else {
      this.currentSortKey = SORT.Name;
      this.currentSortOrder = 'ascend';
    }

    this.applyClientQuery();
  }

  sortOrder(key: string): NzSortOrder {
    return this.currentSortKey === key ? this.currentSortOrder : null;
  }

  trackById(_: number, item: BranchDto) {
    return item.id;
  }

  // -----------------------------
  // Load ALL branches once (no backend sorting/paging)
  // -----------------------------
  private async loadAll(): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    try {
      const all: BranchDto[] = [];
      let skip = 0;

      while (true) {
        // NOTE: no "sorting" passed; no user-driven paging/sorting hits backend
        const res = await firstValueFrom(
          this.service.getList({
            skipCount: skip,
            maxResultCount: this.FETCH_SIZE,
          } as any)
        );

        const batch = res.items ?? [];
        all.push(...batch);

        // stop conditions
        if (batch.length < this.FETCH_SIZE) break;
        skip += this.FETCH_SIZE;

        // If API returns totalCount, we can stop early
        const total = res.totalCount ?? 0;
        if (total > 0 && all.length >= total) break;
      }

      this.items = all;
      this.total = all.length;

      // reset to first page on refresh
      this.pageIndex = 1;
      this.applyClientQuery();
    } finally {
      this.loading = false;
    }
  }

  // -----------------------------
  // Client-side sort + paginate
  // -----------------------------
  private applyClientQuery(): void {
    const sorted = [...this.items];

    const dir = this.currentSortOrder === 'descend' ? -1 : 1;
    const key = this.currentSortKey;

    sorted.sort((a, b) => dir * this.compare(a, b, key));

    const start = (this.pageIndex - 1) * this.pageSize;
    this.rows = sorted.slice(start, start + this.pageSize);
  }

  private compare(a: BranchDto, b: BranchDto, key: string): number {
    switch (key) {
      case SORT.Code:
        return (a.code ?? '').localeCompare(b.code ?? '');

      case SORT.Name:
        return (a.name ?? '').localeCompare(b.name ?? '');

      case SORT.VatPerc: {
        const av = Number((a as any).vatPerc ?? 0);
        const bv = Number((b as any).vatPerc ?? 0);
        return av - bv;
      }

      case SORT.IsActive: {
        const av = (a as any).isActive ? 1 : 0;
        const bv = (b as any).isActive ? 1 : 0;
        return av - bv;
      }

      default:
        return 0;
    }
  }
}