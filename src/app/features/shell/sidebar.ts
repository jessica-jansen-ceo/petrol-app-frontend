import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NAV_ITEMS, NavItem } from '../../core/models/nav';
import { CLIENT_CONFIG } from '../../config/client.config';

/**
 * The single, reusable left navigation. One source of truth for nav structure,
 * styling and role/feature filtering — guaranteeing identical size and
 * behaviour on every screen.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="brand">
      <div class="logo">{{ brand.appName.charAt(0) }}</div>
      <span>{{ brand.appName }}</span>
    </div>

    <nav>
      @for (item of nav(); track item.path) {
        <a [routerLink]="['/app', item.path]" routerLinkActive="active" (click)="navigate.emit()">
          <span class="dot"></span>{{ item.label }}
        </a>
      }
    </nav>

    <div class="sidebar-foot">{{ brand.companyName }}</div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      width: 240px;
      flex: 0 0 240px;
      height: 100dvh;
      position: sticky;
      top: 0;
      padding: 1.1rem 0.9rem;
      background: var(--sidebar-bg);
      color: var(--sidebar-text);
      overflow-y: auto;
    }
    .brand {
      display: flex; align-items: center; gap: 0.6rem;
      font-weight: 700; font-size: 1.1rem; padding: 0.25rem 0.4rem;
    }
    .brand .logo {
      width: 34px; height: 34px; border-radius: 9px; background: var(--primary);
      color: #fff; display: grid; place-items: center; font-weight: 800;
    }
    nav { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
    nav a {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.6rem 0.7rem; border-radius: 9px;
      color: var(--sidebar-text); text-decoration: none; font-size: 0.92rem;
      transition: background 0.15s ease;
    }
    nav a .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: 0.4; }
    nav a:hover { background: rgba(255, 255, 255, 0.07); }
    nav a.active { background: var(--primary); color: #fff; font-weight: 600; }
    nav a.active .dot { opacity: 1; }
    .sidebar-foot { font-size: 0.72rem; opacity: 0.55; padding: 0 0.4rem; }
  `],
})
export class Sidebar {
  @Output() navigate = new EventEmitter<void>();

  private auth = inject(AuthService);
  readonly brand = CLIENT_CONFIG.brand;

  /** Nav items visible to the current role, respecting feature flags. */
  readonly nav = computed<NavItem[]>(() => {
    const role = this.auth.role();
    if (!role) return [];
    return NAV_ITEMS.filter(
      (item) => item.roles.includes(role) && (!item.feature || CLIENT_CONFIG.features[item.feature]),
    );
  });
}
