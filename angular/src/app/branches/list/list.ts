import { Component, OnInit } from '@angular/core';
import { PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { BranchDto, BranchService } from 'src/app/proxy/branches';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branches-list',
  imports: [RouterModule, CommonModule],
  templateUrl: './list.html',
  styleUrls: ['./list.scss'],
})
export class List implements OnInit {
  items: BranchDto[] = [];
  total = 0;
  loading = false;

  pageSize = 20;
  pageIndex = 0;
  skipCount = 0;
  sorting: string | undefined = 'name';

  constructor(private service: BranchService) {}

  ngOnInit() {
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

    this.skipCount = this.pageIndex * this.pageSize;

    const rq: PagedAndSortedResultRequestDto = {
      skipCount: this.skipCount,
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

  refresh() {
    this.load();
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

  trackById(_: number, item: BranchDto) {
    return item.id;
  }
}