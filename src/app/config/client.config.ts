import { WhiteLabelConfig } from './white-label.model';

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  ACTIVE CLIENT CONFIG — white-label template                          │
 * │                                                                       │
 * │  This is the single source of truth for all client/brand details.    │
 * │  To onboard a new client: copy this file, change the values below,    │
 * │  and the entire app re-brands. No component code needs to change.     │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const CLIENT_CONFIG: WhiteLabelConfig = {
  clientId: 'petrol-app',

  brand: {
    appName: 'FuelFlow',
    tagline: 'Petrol Pump Management System',
    companyName: 'Acme Fuel Co.',
    logoUrl: undefined, // drop a file in /public and set e.g. 'logo.svg'
    primaryColor: '#0f766e', // teal-700
    accentColor: '#f59e0b', // amber-500
  },

  api: {
    baseUrl: '', // e.g. 'https://api.fuelflow.app' once backend exists
    useMockData: true, // POC: frontend-only
  },

  locale: {
    code: 'en-ZA',
    currency: 'ZAR',
    volumeUnit: 'L',
  },

  features: {
    reports: true,
    expenses: true,
    inventory: true,
    employees: true,
    shifts: true,
  },
};
