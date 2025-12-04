import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import {
  NgIf,
  NgForOf,
  NgClass,
  AsyncPipe,
} from '@angular/common';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationEnd,
} from '@angular/router';
import {
  AuthService,
  ConfigStateService,
  CurrentUserDto,
  PermissionService,
} from '@abp/ng.core';
import { LoaderBarComponent } from '@abp/ng.theme.shared';
import { Observable, Subject } from 'rxjs';
import { filter, startWith, takeUntil } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  permission?: string; // ABP policy name
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    NgIf,
    NgForOf,
    NgClass,
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LoaderBarComponent,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  isAdminOpen = true;
  currentTitle = 'Royal Vapes';
  currentUser$: Observable<CurrentUserDto>;

  primaryMenuVisible: NavItem[] = [];
  adminMenuVisible: NavItem[] = [];

  private destroy$ = new Subject<void>();
  private readonly mobileBreakpoint = 768;

  private primaryMenu: NavItem[] = [
  { label: 'Dashboard', icon: 'fa fa-tachometer-alt', link: '/', exact: true },
  {
    label: 'Stock Movement',
    icon: 'fa fa-exchange-alt',
    link: '/stock-movement',
    permission: 'POS.StockMovements',
  },
  {
    label: 'Stock Report',
    icon: 'fa fa-chart-line',
    link: '/stock-report',
    permission: 'POS.StockMovements',
  },
  {
    label: 'Shopping Cart',
    icon: 'fa fa-shopping-cart',
    link: '/shopping-cart',
    permission: 'POS.StockMovements.Create',
  },
  {
    label: 'Add Stock',
    icon: 'fa fa-plus-square',
    link: '/add-stock',
    permission: 'POS.StockMovements.Create',
  },
  {
    label: 'Products',
    icon: 'fa fa-box-open',
    link: '/products',
    permission: 'POS.Products',
  },
  {
    label: 'Product Types',
    icon: 'fa fa-tags',
    link: '/product-types',
    permission: 'POS.ProductTypes',
  },
  {
    label: 'Branches',
    icon: 'fa fa-code-branch',
    link: '/branches',
    permission: 'POS.Branches',
  },
];

private adminMenu: NavItem[] = [
  {
    label: 'Users',
    icon: 'fa fa-users-cog',
    link: '/identity/users',
    permission: 'AbpIdentity.Users',
  },
  {
    label: 'Roles',
    icon: 'fa fa-user-shield',
    link: '/identity/roles',
    permission: 'AbpIdentity.Roles',
  },
  {
    label: 'Settings',
    icon: 'fa fa-cog',
    link: '/setting-management',
    permission: 'SettingManagement.Emailing',
  },
];


  constructor(
    private authService: AuthService,
    private configState: ConfigStateService,
    private permissionService: PermissionService,
    private router: Router
  ) {
    this.currentUser$ = this.configState.getOne$('currentUser');
  }

  ngOnInit(): void {
    this.primaryMenuVisible = this.filterByPermission(this.primaryMenu);
    this.adminMenuVisible = this.filterByPermission(this.adminMenu);

    // set title on load + on navigation
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        startWith(null),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.updateTitleFromRoute());

    // initial responsive state
    this.updateSidebarForWidth(window.innerWidth);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent): void {
    const w = (event.target as Window).innerWidth;
    this.updateSidebarForWidth(w);
  }

  private updateSidebarForWidth(width: number): void {
    if (width <= this.mobileBreakpoint) {
      this.isSidebarCollapsed = true;  // hide sidebar on small screens
    } else {
      this.isSidebarCollapsed = false; // show sidebar on desktop
    }
  }

  private filterByPermission(items: NavItem[]): NavItem[] {
    return items.filter(
      item =>
        !item.permission ||
        this.permissionService.getGrantedPolicy(item.permission)
    );
  }

  private updateTitleFromRoute(): void {
    const url = this.router.url.split('?')[0];

    const allItems = [
      ...(this.primaryMenuVisible || []),
      ...(this.adminMenuVisible || []),
    ];

    const active = allItems.find(item =>
      item?.exact ? url === item.link : url.startsWith(item.link)
    );

    this.currentTitle = active?.label || 'Royal Vapes';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleAdminSection(): void {
    this.isAdminOpen = !this.isAdminOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
