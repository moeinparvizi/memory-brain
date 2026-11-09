import { runtimeConfig } from './runtime-config';

export const environment = {
  production: true,
  firebase: runtimeConfig.firebase,
  apiUrl: runtimeConfig.apiUrl,
  googleClientId: runtimeConfig.googleClientId ?? '',
  phoneLoginEnabled: runtimeConfig.phoneLoginEnabled ?? false
};
