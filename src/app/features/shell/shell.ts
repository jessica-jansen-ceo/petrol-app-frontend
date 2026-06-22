import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NAV_ITEMS, NavItem } from '../../core/models/nav';
import { ROLE_LABELS } from '../../core/models/roles';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly brand = CLIENT_CONFIG.brand;
  readonly roleLabels = ROLE_LABELS;
  readonly user = this.auth.user;
  sidebarOpen = signal(false);

  /** Nav items visible to the current role, respecting feature flags. */
  readonly nav = computed<NavItem[]>(() => {
    const role = this.auth.role();
    if (!role) return [];
    return NAV_ITEMS.filter(
      (item) =>
        item.roles.includes(role) &&
        (!item.feature || CLIENT_CONFIG.features[item.feature]),
    );
  });

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
