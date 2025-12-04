import type { UoMEnum } from '../products/uo-menum.enum';
import type { StockMovementType } from './stock-movement-type.enum';
import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateUpdateStockMovementDetailDto {
  productId: string;
  uoM?: UoMEnum;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
  amountExclVat?: number;
  amountVat?: number;
  amountInclVat?: number;
}

export interface CreateUpdateStockMovementHeaderDto {
  stockMovementNo?: string;
  stockMovementType: StockMovementType;
  businessPartnerName?: string;
  description?: string;
  amountExclVat?: number;
  amountVat?: number;
  amountInclVat?: number;
  branchId?: string;
  isCancelled: boolean;
  details: CreateUpdateStockMovementDetailDto[];
}

export interface DailySalesPointDto {
  date?: string;
  amount: number;
}

export interface OnHandItemDto {
  productId?: string;
  onHand: number;
}

export interface ProductMovementDto extends EntityDto<string> {
  headerId?: string;
  stockMovementNo?: string;
  movementDate?: string;
  branchId?: string;
  branchName?: string;
  stockMovementType?: StockMovementType;
  productId?: string;
  productName?: string;
  productType?: string;
  quantitySigned: number;
  unitPrice?: number;
  amountExclVat?: number;
  amountVat?: number;
  amountInclVat?: number;
  description?: string;
}

export interface ProductMovementFlatRequestDto extends PagedAndSortedResultRequestDto {
  branchId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  productTypeId?: string;
  stockMovementType?: StockMovementType;
  includeCancelled: boolean;
}

export interface StockByProductTypeDto {
  productTypeId?: string;
  productType?: string;
  onHand: number;
}

export interface StockDashboardSummaryDto {
  todaySales: number;
  stockValue: number;
  activeProducts: number;
  lowStockItems: number;
}

export interface StockMovementDetailDto extends FullAuditedEntityDto<string> {
  stockMovementHeaderId?: string;
  productId?: string;
  productName?: string;
  uoM?: UoMEnum;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
  amountExclVat?: number;
  amountVat?: number;
  amountInclVat?: number;
}

export interface StockMovementHeaderDto extends FullAuditedEntityDto<string> {
  stockMovementNo?: string;
  stockMovementType?: StockMovementType;
  businessPartnerName?: string;
  description?: string;
  amountExclVat?: number;
  amountVat?: number;
  amountInclVat?: number;
  branch?: string;
  isCancelled: boolean;
  details: StockMovementDetailDto[];
}

export interface StockReportDto {
  branchId?: string;
  branchName?: string;
  productId?: string;
  productName?: string;
  productTypeId?: string;
  productType?: string;
  onHand: number;
}
