// src/app/products/products.routes.ts
import { Routes } from '@angular/router';
import { ListComponent } from './list/list';
import { AuthGuard } from '@abp/ng.core';
import { Edit } from './edit/edit';

export const productsRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    data: { requiredPolicy: 'POS.Products' },
    children: [
      { path: '', component: ListComponent },
      { path: 'edit', component: Edit, data: { requiredPolicy: 'POS.Products.Create' } },
      { path: 'edit/:id', component: Edit, data: { requiredPolicy: 'POS.Products.Edit' } }
    ]
  }
];
