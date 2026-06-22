import { Component, inject } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { StatCard } from '../../shared/stat-card';
import { BarChart } from '../../shared/bar-chart';
import { MoneyPipe } from '../../shared/money.pipe';
import { MockDataService } from '../../core/services/mock-data.service';
import { AuthService } from '../../core/services/auth.service';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeader, StatCard, BarChart, MoneyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private data = inject(MockDataService);
  readonly unit = CLIENT_CONFIG.locale.volumeUnit;
  readonly user = inject(AuthService).user;
  readonly summary = this.data.summary();
  readonly revenue = this.data.weeklyRevenue();
  readonly recentSales = this.data.fuelSales().slice(0, 4);
}
