import { authGuard, permissionGuard } from '@abp/ng.core';
import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then(c => c.HomeComponent),
    canActivate: [authGuard],
  },
  // {
  //   path: 'account',
  //   loadChildren: () => import('@abp/ng.account').then(c => c.createRoutes()),
  //   canActivate: [authGuard, permissionGuard],
  // },
  {
    path: 'identity',
    loadChildren: () => import('@abp/ng.identity').then(c => c.createRoutes()),
    canActivate: [authGuard, permissionGuard],
  },
  // {
  //   path: 'tenant-management',
  //   loadChildren: () => import('@abp/ng.tenant-management').then(c => c.createRoutes()),
  //   canActivate: [authGuard, permissionGuard],
  // },
  {
    path: 'setting-management',
    loadChildren: () => import('@abp/ng.setting-management').then(c => c.createRoutes()),
    canActivate: [authGuard, permissionGuard],
  },
  {
    path: 'products',
    loadChildren: () =>
      import('./products/products.routes').then(m => m.productsRoutes),
    canActivate: [authGuard, permissionGuard],
  },
  {
    path: 'product-types',
    loadChildren: () =>
      import('./product-types/product-types.routes').then(m => m.productTypesRoutes),
    canActivate: [authGuard, permissionGuard],
  },
  {
    path: 'branches',
    loadChildren: () =>
      import('./branches/branches.routes').then(m => m.branchesRoutes),
    canActivate: [authGuard, permissionGuard],
  },

  // --- Split stock movement pages (top-level) ---
  {
    path: 'stock-movement',
    title: 'Stock Movement',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPolicy: 'POS.StockMovements' }, // read/report permission
    loadComponent: () =>
      import('./stock-movements/stock-movement/stock-movement').then(m => m.StockMovementComponent),
  },
  {
    path: 'physical-inventory',
    title: 'Physical Inventory',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPolicy: 'POS.StockMovements.PhysicalInventory' }, // read/report permission
    loadComponent: () =>
      import('./stock-movements/physical-inventory/physical-inventory').then(m => m.PhysicalInventoryComponent),
  },
  {
    path: 'stock-report',
    title: 'Stock Report',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPolicy: 'POS.StockMovements' }, // read/report permission
    loadComponent: () =>
      import('./stock-movements/stock-report/stock-report').then(m => m.StockReport),
  },
  {
    path: 'shopping-cart',
    title: 'Shopping Cart',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPolicy: 'POS.StockMovements.Create'}, // create permission
    loadComponent: () =>
      import('./stock-movements/cart/cart').then(m => m.Cart),
  },
  {
    path: 'add-stock',
    title: 'Add Stock',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPolicy: 'POS.StockMovements.Create'}, // create permission
    loadComponent: () =>
      import('./stock-movements/inventory-add/inventory-add').then(m => m.InventoryAdd),
  },
];
