import type { CreateUpdateStockMovementHeaderDto, DailySalesPointDto, OnHandItemDto, ProductMovementDto, ProductMovementFlatRequestDto, StockByProductTypeDto, StockDashboardSummaryDto, StockMovementHeaderDto, StockReportDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StockMovementService {
  apiName = 'Default';
  

  addStock = (dto: CreateUpdateStockMovementHeaderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementHeaderDto>({
      method: 'POST',
      url: '/api/app/stock-movement/stock',
      body: dto,
    },
    { apiName: this.apiName,...config });
  

  adjustStock = (dto: CreateUpdateStockMovementHeaderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementHeaderDto>({
      method: 'POST',
      url: '/api/app/stock-movement/adjust-stock',
      body: dto,
    },
    { apiName: this.apiName,...config });
  

  cancel = (id: string, reason?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/stock-movement/${id}/cancel`,
      params: { reason },
    },
    { apiName: this.apiName,...config });
  

  checkoutCart = (dto: CreateUpdateStockMovementHeaderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementHeaderDto>({
      method: 'POST',
      url: '/api/app/stock-movement/checkout-cart',
      body: dto,
    },
    { apiName: this.apiName,...config });
  

  create = (input: CreateUpdateStockMovementHeaderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementHeaderDto>({
      method: 'POST',
      url: '/api/app/stock-movement',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/stock-movement/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementHeaderDto>({
      method: 'GET',
      url: `/api/app/stock-movement/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getDashboardSummary = (branchId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockDashboardSummaryDto>({
      method: 'GET',
      url: '/api/app/stock-movement/dashboard-summary',
      params: { branchId },
    },
    { apiName: this.apiName,...config });
  

  getLast7DaysSales = (branchId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DailySalesPointDto[]>({
      method: 'GET',
      url: '/api/app/stock-movement/last7Days-sales',
      params: { branchId },
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<StockMovementHeaderDto>>({
      method: 'GET',
      url: '/api/app/stock-movement',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  getOnHandList = (productIds: string[], branchId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnHandItemDto[]>({
      method: 'GET',
      url: '/api/app/stock-movement/on-hand-list',
      params: { productIds, branchId },
    },
    { apiName: this.apiName,...config });
  

  getOnHandMap = (productIds: string[], branchId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Record<string, number>>({
      method: 'GET',
      url: '/api/app/stock-movement/on-hand-map',
      params: { productIds, branchId },
    },
    { apiName: this.apiName,...config });
  

  getProductMovements = (input: ProductMovementFlatRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ProductMovementDto>>({
      method: 'GET',
      url: '/api/app/stock-movement/product-movements',
      params: { branchId: input.branchId, productId: input.productId, dateFrom: input.dateFrom, dateTo: input.dateTo, productTypeId: input.productTypeId, stockMovementType: input.stockMovementType, includeCancelled: input.includeCancelled, sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  getStockByProductType = (branchId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockByProductTypeDto[]>({
      method: 'GET',
      url: '/api/app/stock-movement/stock-by-product-type',
      params: { branchId },
    },
    { apiName: this.apiName,...config });
  

  getStockReport = (branchId?: string, productId?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockReportDto[]>({
      method: 'GET',
      url: '/api/app/stock-movement/stock-report',
      params: { branchId, productId },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateStockMovementHeaderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockMovementHeaderDto>({
      method: 'PUT',
      url: `/api/app/stock-movement/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });

  constructor(private restService: RestService) {}
}
