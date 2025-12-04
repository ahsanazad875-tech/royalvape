import type { FullAuditedEntityDto } from '@abp/ng.core';

export interface BranchDto extends FullAuditedEntityDto<string> {
  code?: string;
  name?: string;
  vatPerc: number;
  isActive: boolean;
}

export interface CreateUpdateBranchDto {
  code: string;
  name: string;
  vatPerc: number;
  isActive: boolean;
}
