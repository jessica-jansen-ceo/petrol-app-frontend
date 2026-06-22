import { Pipe, PipeTransform } from '@angular/core';
import { CLIENT_CONFIG } from '../config/client.config';

/** Formats a number as the configured currency, e.g. {{ 55100 | money }}. */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  private readonly fmt = new Intl.NumberFormat(CLIENT_CONFIG.locale.code, {
    style: 'currency',
    currency: CLIENT_CONFIG.locale.currency,
    maximumFractionDigits: 0,
  });
  transform(value: number | null | undefined): string {
    return this.fmt.format(value ?? 0);
  }
}
