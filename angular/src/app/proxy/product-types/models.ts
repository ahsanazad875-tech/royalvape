import type { FullAuditedEntityDto } from '@abp/ng.core';

export interface CreateUpdateProductTypeDto {
  type: string;
  typeDesc?: string;
}

export interface ProductTypeDto extends FullAuditedEntityDto<string> {
  type?: string;
  typeDesc?: string;
  creatorName?: string;
  lastModifiedBy?: string;
}
