import { Pipe, PipeTransform, inject } from '@angular/core';
import { CLIENT_CONFIG } from '../config/client.config';
import { SettingsService } from '../core/services/settings.service';

/**
 * Formats a number as the currently configured currency, e.g. {{ 55100 | money }}.
 * Impure so it re-evaluates when an admin changes the currency at runtime.
 */
@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private settings = inject(SettingsService);
  private cache?: { code: string; fmt: Intl.NumberFormat };

  transform(value: number | null | undefined): string {
    const code = this.settings.currency();
    if (!this.cache || this.cache.code !== code) {
      this.cache = {
        code,
        fmt: new Intl.NumberFormat(CLIENT_CONFIG.locale.code, {
          style: 'currency',
          currency: code,
          maximumFractionDigits: 0,
        }),
      };
    }
    return this.cache.fmt.format(value ?? 0);
  }
}
