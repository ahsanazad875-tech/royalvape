// environment.prod.ts
import { Environment } from '@abp/ng.core';

const baseUrl = 'https://royalvape.netlify.app';

const oAuthConfig = {
  issuer: 'https://royalvape.onrender.com',
  redirectUri: baseUrl,
  clientId: 'POS_App',
  responseType: 'code',
  scope: 'offline_access POS',
  requireHttps: true,
};

export const environment = {
  production: true,
  application: {
    baseUrl,
    name: 'Royal Vapes',
  },
  oAuthConfig,
  apis: {
    default: {
      url: 'https://royalvape.onrender.com',
      rootNamespace: 'POS',
    },
    AbpAccountPublic: {
      url: oAuthConfig.issuer,
      rootNamespace: 'AbpAccountPublic',
    },
  },
} as Environment;