export interface MicboxxApiConfig {
  baseUrl: string;
  webBaseUrl?: string;
  useFixtures: boolean;
  getToken: () => Promise<string | null>;
  forceRefreshToken?: () => Promise<string | null>;
  isAuthSessionExpiredError?: (error: unknown) => boolean;
}

let _config: MicboxxApiConfig | null = null;

export function configureMicboxxApi(config: MicboxxApiConfig) {
  _config = config;
}

export function getMicboxxApiConfig(): MicboxxApiConfig {
  if (!_config) {
    throw new Error(
      "MicBoxx API has not been configured. Call configureMicboxxApi() during app startup.",
    );
  }

  return _config;
}
