interface PublicRuntimeConfig {
  firebase?: { apiKey: string; authDomain: string; projectId: string; appId: string };
  apiUrl?: string;
  useHashRouting?: boolean;
  googleClientId?: string;
  phoneLoginEnabled?: boolean;
}

const config = typeof window === 'undefined' ? {} : (window as Window & {
  __MEMORY_BRAIN_CONFIG__?: PublicRuntimeConfig;
}).__MEMORY_BRAIN_CONFIG__ || {};

export const runtimeConfig = {
  firebase: config.firebase,
  apiUrl: config.apiUrl || '/api/v1',
  useHashRouting: config.useHashRouting === true,
  googleClientId: config.googleClientId,
  phoneLoginEnabled: config.phoneLoginEnabled,
};
