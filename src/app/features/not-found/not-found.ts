import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: `
    <div class="wrap">
      <div class="card">
        <div class="logo">{{ brand.appName.charAt(0) }}</div>
        <h1>404</h1>
        <p>We couldn't find that page.</p>
        <button class="btn-primary" (click)="goHome()">{{ authed() ? 'Back to dashboard' : 'Back to login' }}</button>
      </div>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 1.5rem; background: var(--bg); }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 2.5rem 2rem; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.1); max-width: 360px; }
    .logo { width: 52px; height: 52px; margin: 0 auto 1rem; border-radius: 14px; display: grid; place-items: center; font-weight: 800; font-size: 1.4rem; color: #fff; background: var(--primary); }
    h1 { margin: 0; font-size: 3rem; color: var(--primary); }
    p { margin: 0.25rem 0 1.5rem; color: var(--text-muted); }
  `],
})
export class NotFound {
  readonly brand = CLIENT_CONFIG.brand;
  private auth = inject(AuthService);
  private router = inject(Router);

  authed = this.auth.isAuthenticated;

  goHome() {
    this.router.navigate([this.auth.isAuthenticated() ? '/app/dashboard' : '/login']);
  }
}
