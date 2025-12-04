import { Routes } from '@angular/router';
import { List } from './list/list';
import { Edit } from './edit/edit';
import { authGuard, permissionGuard } from '@abp/ng.core';

export const branchesRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPolicy: 'POS.Branches' },
    children: [
      { path: '', component: List },
      { path: 'edit', component: Edit, data: { requiredPolicy: 'POS.Branches.Create' } },
      { path: 'edit/:id', component: Edit, data: { requiredPolicy: 'POS.Branches.Edit' } },
    ],
  },
];