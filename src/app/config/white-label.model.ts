/**
 * White-label configuration contract.
 *
 * Every client app fills in ONE object of this shape (see `client.config.ts`).
 * Copy that file to a new project, edit the values, and the whole app re-brands
 * itself — no other code changes required. Keep this interface backend-agnostic.
 */
export interface WhiteLabelConfig {
  /** Internal client key, e.g. "petrol-app". Used for storage namespacing. */
  clientId: string;

  /** Branding shown throughout the UI. */
  brand: {
    /** Product/app name, e.g. "FuelFlow". */
    appName: string;
    /** Short tagline shown on the login screen. */
    tagline: string;
    /** Legal/company name shown in footers. */
    companyName: string;
    /** Path (under /public) or URL to the logo. Optional. */
    logoUrl?: string;
    /** Primary brand colour (CSS hex). Applied as a CSS custom property. */
    primaryColor: string;
    /** Accent/secondary brand colour (CSS hex). */
    accentColor: string;
  };

  /** Backend wiring. Empty/placeholder during the frontend-only POC. */
  api: {
    /** Base URL for the future REST API, e.g. "https://api.client.com". */
    baseUrl: string;
    /** When true, the app uses in-memory mock data instead of HTTP. */
    useMockData: boolean;
  };

  /** Localisation / formatting. */
  locale: {
    /** BCP-47 locale, e.g. "en-ZA". */
    code: string;
    /** ISO currency code, e.g. "ZAR". */
    currency: string;
    /** Fuel volume unit label, e.g. "L". */
    volumeUnit: string;
  };

  /** Feature flags — toggle modules per client without code changes. */
  features: {
    reports: boolean;
    expenses: boolean;
    inventory: boolean;
    employees: boolean;
    shifts: boolean;
  };
}
