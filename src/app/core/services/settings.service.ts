import { Injectable, signal } from '@angular/core';
import { CLIENT_CONFIG } from '../../config/client.config';

const KEY = `${CLIENT_CONFIG.clientId}.settings.currency`;

/** Currencies an admin can switch between in the POC. */
export const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'NGN', 'KES'];

/**
 * App-wide, admin-editable settings. Currency is persisted to localStorage and
 * exposed as a signal so the MoneyPipe re-formats everywhere when it changes.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly currency = signal<string>(this.restore());

  setCurrency(code: string): void {
    this.currency.set(code);
    try {
      localStorage.setItem(KEY, code);
    } catch {
      /* ignore */
    }
  }

  private restore(): string {
    try {
      return localStorage.getItem(KEY) || CLIENT_CONFIG.locale.currency;
    } catch {
      return CLIENT_CONFIG.locale.currency;
    }
  }
}
