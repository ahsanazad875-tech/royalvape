import type { PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface LookupDto<TKey> {
  id: TKey;
  displayName?: string;
}

export interface LookupRequestDto extends PagedAndSortedResultRequestDto {
  filter?: string;
}
