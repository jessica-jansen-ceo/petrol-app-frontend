import { Component, computed, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { StatCard } from '../../shared/stat-card';
import { BarChart } from '../../shared/bar-chart';
import { StackedBarChart } from '../../shared/stacked-bar-chart';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';
import { AuthService } from '../../core/services/auth.service';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, BarChart, StackedBarChart, MoneyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private data = inject(MockDataService);
  readonly unit = CLIENT_CONFIG.locale.volumeUnit;
  readonly user = inject(AuthService).user;

  private readonly sales = this.data.viewSales;
  readonly summary = computed(() => { this.sales(); this.data.shifts()(); this.data.stock()(); return this.data.summary(); });
  readonly revenue = computed(() => { this.sales(); this.data.fuelColors()(); return this.data.weeklyRevenueStacked(); });
  readonly fuelMix = computed(() => { this.sales(); return this.data.fuelMix(); });
  readonly recentSales = computed(() => this.sales().slice(0, 5));
}
