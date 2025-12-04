import { mapEnumToOptions } from '@abp/ng.core';

export enum UoMEnum {
  Piece = 0,
  Pack = 1,
  Box = 2,
  Bottle = 3,
  Milliliter = 4,
  Gram = 5,
}

export const uoMEnumOptions = mapEnumToOptions(UoMEnum);
