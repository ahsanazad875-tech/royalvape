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

  // ✅ currency flag for KPI formatting
  isCurrency?: boolean;
}

type SalesGranularity = 'day' | 'week' | 'month';

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

  // Branch
  branches: BranchOption[] = [];
  selectedBranchId: string | '' = '';
  currentBranchName = '';

  // Date range (ISO: yyyy-MM-dd)
  fromDateStr = '';
  toDateStr = '';

  summaryCards: SummaryCard[] = [];

  // ===== Charts =====

  salesChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Sales',
        data: [],
        backgroundColor: '#2563eb',
        hoverBackgroundColor: '#1d4ed8',
        borderRadius: 8,
        maxBarThickness: 26,
      },
    ],
  };

  salesChartOptions: ChartOptions<'bar'> = this.buildSalesChartOptions();

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

  stockChartOptions: ChartOptions<'doughnut'> = this.buildStockChartOptions();

  // =====================

  get hasLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  ngOnInit(): void {
    this.applyThemeColorsToCharts();

    // Default date range: last 7 days (including today)
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);

    this.fromDateStr = this.formatDateInput(from);
    this.toDateStr = this.formatDateInput(today);

    this.currentUser$ = this.configState.getOne$('currentUser');

    this.currentUser$.pipe(take(1)).subscribe(user => {
      this.isAdmin = !!user.roles?.some(r => r.toLowerCase() === 'admin');

      const extra = (user as any).extraProperties || {};
      const userBranchId = extra.BranchId ?? '';
      const userBranchName = extra.BranchName ?? '';

      if (!this.isAdmin) {
        this.selectedBranchId = userBranchId;
        this.currentBranchName = userBranchName;
        this.loadDashboardData();
      } else {
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

  onBranchChanged(): void {
    const b = this.branches.find(x => x.id === this.selectedBranchId);
    this.currentBranchName = b?.name || '';
    this.loadDashboardData();
  }

  onDateRangeChanged(): void {
    this.normalizeDateInputs();
    this.loadDashboardData();
  }

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

        if (!this.selectedBranchId && this.branches.length) {
          this.selectedBranchId = this.branches[0].id;
        }

        this.currentBranchName =
          this.branches.find(x => x.id === this.selectedBranchId)?.name || '';

        this.loadDashboardData();
      });
  }

  private loadDashboardData(): void {
    const effectiveBranchId =
      this.isAdmin && this.selectedBranchId
        ? (this.selectedBranchId as string)
        : undefined;

    const branchSuffix =
      this.isAdmin && !this.selectedBranchId ? ' · all branches' : '';

    const apiFrom = this.toApiDateTime(this.fromDateStr);
    const apiTo = this.toApiDateTime(this.toDateStr);

    forkJoin({
      summary: this.stockMovementService.getDashboardSummary(
        effectiveBranchId,
        apiFrom,
        apiTo
      ),
      sales: this.stockMovementService.getLast7DaysSales(
        effectiveBranchId,
        apiFrom,
        apiTo
      ),
      stock: this.stockMovementService.getStockByProductType(
        effectiveBranchId,
        apiFrom,
        apiTo
      ),
    }).subscribe(({ summary, sales, stock }) => {
      const s = summary as StockDashboardSummaryDto;

      const rangeText =
        `${this.displayDate(this.fromDateStr)} → ${this.displayDate(this.toDateStr)}` +
        `${branchSuffix}`;

      // Summary cards
      this.summaryCards = [
        {
          label: 'Sales (Period)',
          icon: 'fa fa-cash-register',
          value: (s as any)?.periodSalesInclVat ?? 0,
          format: '1.0-0',
          subtitle: rangeText,
          isCurrency: true,
        },
        {
          label: 'Profit (Period)',
          icon: 'fa fa-chart-line',
          value: (s as any)?.periodProfitInclVat ?? (s as any)?.periodProfitExclVat ?? 0,
          format: '1.0-0',
          subtitle: rangeText,
          isCurrency: true,
        },
        {
          label: 'Stock Value',
          icon: 'fa fa-boxes',
          value: s?.stockValue ?? 0,
          format: '1.0-0',
          subtitle: `As of ${this.displayDate(this.toDateStr)}${branchSuffix}`,
          isCurrency: true,
        },
        {
          label: 'Active Products',
          icon: 'fa fa-box',
          value: s?.activeProducts ?? 0,
          format: '1.0-0',
          subtitle: `As of ${this.displayDate(this.toDateStr)}${branchSuffix}`,
        },
        {
          label: 'Low Stock Items',
          icon: 'fa fa-exclamation-triangle',
          value: s?.lowStockItems ?? 0,
          format: '1.0-0',
          subtitle: 'Below reorder level',
        },
      ];

      // ==========================
      // SALES CHART: aggregate series for long periods
      // ==========================
      const salesPoints = (sales ?? []) as DailySalesPointDto[];

      const start = new Date(this.fromDateStr);
      const end = new Date(this.toDateStr);
      const days = this.diffDaysInclusive(start, end);

      const granularity: SalesGranularity =
        days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';

      const agg = this.aggregateSales(salesPoints, granularity);

      this.salesChartData = {
        ...this.salesChartData,
        labels: agg.labels,
        datasets: [{ ...this.salesChartData.datasets[0], data: agg.values }],
      };

      this.salesChartOptions = this.buildSalesChartOptions();

      // ==========================
      // STOCK (doughnut with built-in right legend)
      // ==========================
      const stockPoints = (stock ?? []) as StockByProductTypeDto[];

      const sorted = [...stockPoints].sort(
        (a, b) => (b.onHand ?? 0) - (a.onHand ?? 0)
      );

      const stockLabels = sorted.map(x => x.productType || 'N/A');
      const stockValues = sorted.map(x => x.onHand ?? 0);

      this.stockChartData = {
        ...this.stockChartData,
        labels: stockLabels,
        datasets: [{ ...this.stockChartData.datasets[0], data: stockValues }],
      };

      this.stockChartOptions = this.buildStockChartOptions();
    });
  }

  // -------- Sales aggregation (handles “period axis”) --------
  private aggregateSales(
    points: DailySalesPointDto[],
    granularity: SalesGranularity
  ): { labels: string[]; values: number[] } {
    const rows = (points || [])
      .map(p => ({ d: new Date(p.date as any), v: Number(p.amount ?? 0) }))
      .filter(x => !isNaN(x.d.getTime()));

    const buckets = new Map<string, { keyDate: Date; sum: number }>();

    for (const r of rows) {
      const keyDate = this.bucketDate(r.d, granularity);
      const key = this.formatKey(keyDate, granularity);

      const existing = buckets.get(key);
      if (existing) existing.sum += r.v;
      else buckets.set(key, { keyDate, sum: r.v });
    }

    const sorted = Array.from(buckets.values()).sort(
      (a, b) => a.keyDate.getTime() - b.keyDate.getTime()
    );

    return {
      labels: sorted.map(x => this.formatLabel(x.keyDate, granularity)),
      values: sorted.map(x => Number((x.sum ?? 0).toFixed(0))),
    };
  }

  private bucketDate(d: Date, granularity: SalesGranularity): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);

    if (granularity === 'day') return x;

    if (granularity === 'week') {
      // week start: Monday
      const day = (x.getDay() + 6) % 7; // Mon=0 ... Sun=6
      x.setDate(x.getDate() - day);
      return x;
    }

    // month
    x.setDate(1);
    return x;
  }

  private formatKey(d: Date, granularity: SalesGranularity): string {
    if (granularity === 'month') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatLabel(d: Date, granularity: SalesGranularity): string {
    if (granularity === 'day') {
      return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
    }
    if (granularity === 'week') {
      return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
    }
    return d.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
  }

  private diffDaysInclusive(a: Date, b: Date): number {
    const start = new Date(a);
    start.setHours(0, 0, 0, 0);

    const end = new Date(b);
    end.setHours(0, 0, 0, 0);

    const ms = end.getTime() - start.getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  }

  // -------- Chart options --------
  private buildSalesChartOptions(): ChartOptions<'bar'> {
    return {
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
              return `PKR ${v.toLocaleString('en-PK', {
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
            autoSkip: true,
            maxTicksLimit: 10,
            maxRotation: 0,
            minRotation: 0,
            font: { size: 11 },
            color: '#6b7280',
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148,163,184,0.25)' },
          ticks: {
            font: { size: 11 },
            color: '#6b7280',
            precision: 0,
          },
        },
      },
    };
  }

  private buildStockChartOptions(): ChartOptions<'doughnut'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      layout: { padding: { right: 8 } },
      plugins: {
        legend: {
          display: true,
          position: 'right',
          align: 'center',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: { size: 12 },
            color: '#6b7280',
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const label = ctx.label || '';
              const value = ctx.parsed ?? 0;
              const total =
                ((ctx.chart.data.datasets?.[0]?.data as number[]) || []).reduce(
                  (s, n) => s + (n || 0),
                  0
                ) || 1;
              const pct = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${pct}%)`;
            },
          },
        },
      },
    };
  }

  // -------- Helpers --------
  private normalizeDateInputs(): void {
    if (!this.fromDateStr && this.toDateStr) this.fromDateStr = this.toDateStr;
    if (!this.toDateStr && this.fromDateStr) this.toDateStr = this.fromDateStr;

    if (this.fromDateStr && this.toDateStr) {
      const f = new Date(this.fromDateStr);
      const t = new Date(this.toDateStr);
      if (f.getTime() > t.getTime()) {
        const tmp = this.fromDateStr;
        this.fromDateStr = this.toDateStr;
        this.toDateStr = tmp;
      }
    }
  }

  private toApiDateTime(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    return `${dateStr}T00:00:00`;
  }

  private formatDateInput(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private displayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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