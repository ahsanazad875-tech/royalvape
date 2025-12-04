import { Routes } from '@angular/router';
import { List } from './list/list';
import { Edit } from './edit/edit';
import { AuthGuard } from '@abp/ng.core';

export const productTypesRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    data: { requiredPolicy: 'POS.ProductTypes' },
    children: [
      { path: '', component: List },
      { path: 'edit', component: Edit, data: { requiredPolicy: 'POS.ProductTypes.Create' } },
      { path: 'edit/:id', component: Edit, data: { requiredPolicy: 'POS.ProductTypes.Edit' } }
    ]
  }
];
