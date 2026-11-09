import { runtimeConfig } from './runtime-config';

export const environment = {
  production: true,
  apiUrl: runtimeConfig.apiUrl,
  googleClientId: runtimeConfig.googleClientId ?? '',
  phoneLoginEnabled: runtimeConfig.phoneLoginEnabled ?? false
};
