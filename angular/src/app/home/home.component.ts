import { Component, OnInit, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

import {
  ChartConfiguration,
  ChartOptions,
  Chart,
  registerables,
} from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { AuthService, ConfigStateService, CurrentUserDto } from '@abp/ng.core';

// 👉 Your existing proxies
import {
  StockMovementService,
  StockDashboardSummaryDto,
  DailySalesPointDto,
  StockByProductTypeDto,
} from 'src/app/proxy/stock-movements';

import { BranchService, BranchDto } from 'src/app/proxy/branches';

Chart.register(...registerables);

interface BranchOption {
  id: string;
  name: string;
  vatPerc?: number | null;
}

interface SummaryCard {
  label: string;
  icon: string;
  value: number;
  format: string;
  subtitle?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [CommonModule, FormsModule, BaseChartDirective],
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private configState = inject(ConfigStateService);
  private stockMovementService = inject(StockMovementService);
  private branchService = inject(BranchService);

  currentUser$!: Observable<CurrentUserDto>;
  isAdmin = false;

  // 🔹 Branches (aligned with Cart logic)
  branches: BranchOption[] = [];
  selectedBranchId: string | '' = '';
  currentBranchName = '';

  summaryCards: SummaryCard[] = [];

  // ===== Charts =====

  // Bar: sales last 7 days
  salesChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Sales',
        data: [],
        backgroundColor: '#2563eb',
        hoverBackgroundColor: '#1d4ed8',
        borderRadius: 8,
        maxBarThickness: 40,
      },
    ],
  };

  salesChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: ctx => {
            const v = ctx.parsed.y ?? 0;
            return `Rs ${v.toLocaleString('en-PK', {
              maximumFractionDigits: 0,
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: '#6b7280',
        },
      },
      y: {
        grid: { color: 'rgba(148,163,184,0.25)' },
        ticks: {
          font: { size: 11 },
          color: '#6b7280',
          precision: 0,
        },
      },
    },
  };

  // Doughnut: stock by product type
  stockChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: ['#2563eb', '#4f46e5', '#7c3aed', '#0ea5e9', '#22c55e'],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  stockChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 11 },
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const label = ctx.label || '';
            const value = ctx.parsed ?? 0;
            const total =
              (ctx.chart.data.datasets?.[0]?.data as number[]).reduce(
                (s, n) => s + (n || 0),
                0,
              ) || 1;
            const pct = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  // =====================

  get hasLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  ngOnInit(): void {
    this.applyThemeColorsToCharts();

    this.currentUser$ = this.configState.getOne$('currentUser');

    this.currentUser$.pipe(take(1)).subscribe(user => {
      this.isAdmin = !!user.roles?.some(r => r.toLowerCase() === 'admin');

      const extra = (user as any).extraProperties || {};
      const userBranchId = extra.BranchId ?? '';
      const userBranchName = extra.BranchName ?? '';

      if (!this.isAdmin) {
        // Non-admin: fixed to their branch
        this.selectedBranchId = userBranchId;
        this.currentBranchName = userBranchName;
        this.loadDashboardData();
      } else {
        // Admin: load branches via BranchAppService (Cart-like behaviour)
        this.loadBranches();
      }
    });
  }

  login(): void {
    this.authService.navigateToLogin();
  }

  refresh(): void {
    this.loadDashboardData();
  }

  // 🔹 Branch loading logic copied from Cart (adapted)
  private loadBranches(): void {
    if (!this.isAdmin) return;

    this.branchService
      .getList({ skipCount: 0, maxResultCount: 1000 })
      .pipe(take(1))
      .subscribe(res => {
        const items = res.items ?? [];

        this.branches = items.map((b: BranchDto) => ({
          id: b.id as string,
          name: (b.name || '').trim(),
          vatPerc: (b as any).vatPerc ?? null,
        }));

        // default selection for admin
        if (!this.selectedBranchId && this.branches.length) {
          this.selectedBranchId = this.branches[0].id;
        }

        this.currentBranchName =
          this.branches.find(x => x.id === this.selectedBranchId)?.name || '';

        // Once branches are loaded, load dashboard
        this.loadDashboardData();
      });
  }

  onBranchChanged(): void {
    // Update display name and reload dashboard when admin switches branch
    const b = this.branches.find(x => x.id === this.selectedBranchId);
    this.currentBranchName = b?.name || '';
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // For non-admins: backend reads branch from claim
    const effectiveBranchId =
      this.isAdmin && this.selectedBranchId
        ? (this.selectedBranchId as string)
        : undefined;

    const branchSuffix =
      this.isAdmin && !this.selectedBranchId ? ' · all branches' : '';

    forkJoin({
      summary: this.stockMovementService.getDashboardSummary(effectiveBranchId),
      sales: this.stockMovementService.getLast7DaysSales(effectiveBranchId),
      stock: this.stockMovementService.getStockByProductType(effectiveBranchId),
    }).subscribe(({ summary, sales, stock }) => {
      // ---- Summary cards ----
      this.summaryCards = [
        {
          label: "Today's Sales",
          icon: 'fa fa-cash-register',
          value: summary?.todaySales ?? 0,
          format: '1.0-0',
          subtitle: `Net sales${branchSuffix}`,
        },
        {
          label: 'Stock Value',
          icon: 'fa fa-boxes',
          value: summary?.stockValue ?? 0,
          format: '1.0-0',
          subtitle: `At cost${branchSuffix}`,
        },
        {
          label: 'Active Products',
          icon: 'fa fa-box',
          value: summary?.activeProducts ?? 0,
          format: '1.0-0',
        },
        {
          label: 'Low Stock Items',
          icon: 'fa fa-exclamation-triangle',
          value: summary?.lowStockItems ?? 0,
          format: '1.0-0',
          subtitle: 'Below reorder level',
        },
      ];

      // ---- Sales chart (last 7 days) ----
      const salesLabels = (sales ?? []).map(p =>
        new Date(p.date as any).toLocaleDateString('en-PK', {
          weekday: 'short',
        }),
      );
      const salesValues = (sales ?? []).map(p => p.amount ?? 0);

      this.salesChartData = {
        ...this.salesChartData,
        labels: salesLabels,
        datasets: [{ ...this.salesChartData.datasets[0], data: salesValues }],
      };

      // ---- Stock chart (by product type) ----
      const stockLabels = (stock ?? []).map(x => x.productType || 'N/A');
      const stockValues = (stock ?? []).map(x => x.onHand ?? 0);

      this.stockChartData = {
        ...this.stockChartData,
        labels: stockLabels,
        datasets: [{ ...this.stockChartData.datasets[0], data: stockValues }],
      };
    });
  }

  private cssVar(name: string, fallback: string): string {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  }

  private applyThemeColorsToCharts(): void {
    const primary = this.cssVar('--primary-blue', '#2563eb');
    const indigo = this.cssVar('--accent-indigo', '#4f46e5');
    const purple = this.cssVar('--accent-purple', '#7c3aed');

    this.salesChartData.datasets[0].backgroundColor = primary;
    (this.salesChartData.datasets[0] as any).hoverBackgroundColor = indigo;

    this.stockChartData.datasets[0].backgroundColor = [
      primary,
      indigo,
      purple,
      '#0ea5e9',
      '#22c55e',
    ];
  }
}
