import { runtimeConfig } from './runtime-config';

export const environment = {
  production: false,
  apiUrl: runtimeConfig.apiUrl,
  googleClientId: runtimeConfig.googleClientId ?? '983693051576-m5f02nrjc1dq72t3uhc4t2dtho9qg2rn.apps.googleusercontent.com',
  phoneLoginEnabled: runtimeConfig.phoneLoginEnabled ?? true
};
