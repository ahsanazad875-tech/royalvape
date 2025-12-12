import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';

import { provideAbpCore, withOptions } from '@abp/ng.core';
import { provideAbpOAuth } from '@abp/ng.oauth';
import { provideSettingManagementConfig } from '@abp/ng.setting-management/config';
import { provideFeatureManagementConfig } from '@abp/ng.feature-management';
import { provideAbpThemeShared } from '@abp/ng.theme.shared';
import { provideIdentityConfig } from '@abp/ng.identity/config';
import { provideAccountConfig } from '@abp/ng.account/config';
import { provideTenantManagementConfig } from '@abp/ng.tenant-management/config';
import { registerLocale } from '@abp/ng.core/locale';
import { provideThemeLeptonX } from '@abp/ng.theme.lepton-x';
import { provideSideMenuLayout } from '@abp/ng.theme.lepton-x/layouts';
import { provideLogo, withEnvironmentOptions } from '@volo/ngx-lepton-x.core';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { GlobalHttpInterceptor } from './core/global-http.interceptor';

import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';
import { APP_ROUTE_PROVIDER } from './route.provider';

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Angular locale (pipes like date/number)
    { provide: LOCALE_ID, useValue: 'en-US' },

    // ✅ NG-ZORRO locale (pagination "items/page", etc.)
    { provide: NZ_I18N, useValue: en_US },

    provideRouter(APP_ROUTES),
    APP_ROUTE_PROVIDER,
    provideAnimations(),

    provideHttpClient(withInterceptors([GlobalHttpInterceptor])),

    provideAbpCore(
      withOptions({
        environment,
        registerLocaleFn: registerLocale(),
      }),
    ),
    provideAbpOAuth(),
    provideIdentityConfig(),
    provideSettingManagementConfig(),
    provideFeatureManagementConfig(),
    provideThemeLeptonX(),
    provideSideMenuLayout(),
    provideLogo(withEnvironmentOptions(environment)),
    provideAccountConfig(),
    provideTenantManagementConfig(),
    provideAbpThemeShared(),
  ],
};