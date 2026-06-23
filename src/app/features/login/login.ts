import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ALL_ROLES, ROLE_LABELS, UserRole } from '../../core/models/roles';
import { CLIENT_CONFIG } from '../../config/client.config';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly brand = CLIENT_CONFIG.brand;
  readonly roles = ALL_ROLES;
  readonly roleLabels = ROLE_LABELS;

  /** Demo usernames chosen to line up with seed data (operator owns shifts). */
  private readonly demoUser: Record<UserRole, string> = {
    [UserRole.Admin]: 'Admin',
    [UserRole.Manager]: 'Paul',
    [UserRole.Operator]: 'John',
  };

  constructor(private auth: AuthService, private router: Router) {}

  /** One-tap demo login for a role — the only sign-in path in the POC. */
  loginAs(role: UserRole): void {
    this.auth.login(this.demoUser[role], 'demo', role);
    this.router.navigate(['/app/dashboard']);
  }
}
