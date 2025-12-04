import { mapEnumToOptions } from '@abp/ng.core';

export enum StockMovementType {
  Purchase = 1,
  Sale = 2,
  AdjustmentPlus = 5,
  AdjustmentMinus = 6,
}

export const stockMovementTypeOptions = mapEnumToOptions(StockMovementType);
