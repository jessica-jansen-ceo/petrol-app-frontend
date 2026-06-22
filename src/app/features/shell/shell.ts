import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { ROLE_LABELS } from '../../core/models/roles';
import { CLIENT_CONFIG } from '../../config/client.config';
import { Overlays } from '../../shared/overlays';
import { Sidebar } from './sidebar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Overlays, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly settings = inject(SettingsService);

  readonly brand = CLIENT_CONFIG.brand;
  readonly roleLabels = ROLE_LABELS;
  readonly user = this.auth.user;
  sidebarOpen = signal(false);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
