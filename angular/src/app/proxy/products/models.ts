import type { UoMEnum } from './uo-menum.enum';
import type { FullAuditedEntityDto } from '@abp/ng.core';

export interface CreateUpdateProductDto {
  productNo?: string;
  productName: string;
  productDesc?: string;
  imageUrl?: string;
  buyingUnitPrice: number;
  sellingUnitPrice: number;
  uoM?: UoMEnum;
  productTypeId: string;
}

export interface ProductDto extends FullAuditedEntityDto<string> {
  productNo?: string;
  productName?: string;
  productDesc?: string;
  imageUrl?: string;
  buyingUnitPrice: number;
  sellingUnitPrice: number;
  uoM?: UoMEnum;
  productTypeId?: string;
  productTypeName?: string;
  creatorName?: string;
  modifiedBy?: string;
}
