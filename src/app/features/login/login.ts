import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ALL_ROLES, ROLE_LABELS, UserRole } from '../../core/models/roles';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly brand = CLIENT_CONFIG.brand;
  readonly roles = ALL_ROLES;
  readonly roleLabels = ROLE_LABELS;

  username = signal('');
  password = signal('');
  role = signal<UserRole>(UserRole.Admin);
  showPassword = signal(false);

  /** Demo usernames chosen to line up with seed data (operator owns shifts). */
  private readonly demoUser: Record<UserRole, string> = {
    [UserRole.Admin]: 'Admin',
    [UserRole.Manager]: 'Paul',
    [UserRole.Operator]: 'John',
  };

  constructor(private auth: AuthService, private router: Router) {}

  submit(event: Event): void {
    event.preventDefault();
    // POC: credentials are accepted as-is; the role drives access.
    this.auth.login(this.username() || 'demo', this.password(), this.role());
    this.router.navigate(['/app/dashboard']);
  }

  /** One-tap demo login for a role. */
  loginAs(role: UserRole): void {
    this.auth.login(this.demoUser[role], 'demo', role);
    this.router.navigate(['/app/dashboard']);
  }
}
