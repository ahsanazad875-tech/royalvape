import { RoutesService, eLayoutType, ConfigStateService } from '@abp/ng.core';
import { inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

export const APP_ROUTE_PROVIDER = [
  provideAppInitializer(() => configureRoutes()),
];

function configureRoutes() {
  const routes = inject(RoutesService);
  const config = inject(ConfigStateService);

  // wait until currentUser is available (post ApplicationConfiguration load)
  return firstValueFrom(
    config.getOne$('currentUser').pipe(
      filter(u => u !== undefined && u.isAuthenticated !== undefined),
      take(1)
    )
  ).then(user => {
    const isAdmin = !!user?.roles?.some(r => r.toLowerCase() === 'admin');

    // routes visible to everyone (or by policy)
    const common = [
      {
        path: '/',
        name: '::Menu:Home',
        iconClass: 'fas fa-home',
        order: 1,
        layout: eLayoutType.application,
      },
      {
        path: '/products',
        name: '::Menu:Products',
        iconClass: 'fa fa-box',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.Products',
      },
      {
        path: '/product-types',
        name: '::Menu:ProductTypes',
        iconClass: 'fa fa-tags',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.ProductTypes',
      },
      {
        path: '/stock-movement',
        name: '::Menu:StockMovement',
        iconClass: 'fa fa-chart-bar',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.StockMovements',
        order: 20,
      },
      {
        path: '/stock-report',
        name: '::Menu:StockReport',
        iconClass: 'fa fa-chart-bar',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.StockMovements',
        order: 20,
      },
      {
        path: '/shopping-cart',
        name: '::Menu:ShoppingCart',
        iconClass: 'fa fa-shopping-cart',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.StockMovements.Create',
        order: 21,
      },
    ];

    // admin-only menu entries
    const adminOnly = [
      {
        path: '/add-stock',
        name: '::Menu:AddStock',
        iconClass: 'fa fa-dolly',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.StockMovements.Create',
        order: 22,
      },
      {
        path: '/branches',
        name: '::Menu:Branches',
        iconClass: 'fa fa-code-branch',
        layout: eLayoutType.application,
        requiredPolicy: 'POS.Branches',
      },
    ];

    // add routes; only include admin ones if user is admin
    routes.add([...common, ...(isAdmin ? adminOnly : [])]);
  });
}
