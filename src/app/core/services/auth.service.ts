import { Injectable, computed, signal } from '@angular/core';
import { AppUser } from '../models/user';
import { UserRole } from '../models/roles';
import { CLIENT_CONFIG } from '../../config/client.config';

const STORAGE_KEY = `${CLIENT_CONFIG.clientId}.session`;

/**
 * POC authentication.
 *
 * Username + password are accepted but NOT validated — any non-empty values
 * pass. The chosen role determines access. The session is persisted to
 * localStorage so a refresh keeps you logged in.
 *
 * To go live: replace `login()` with a real POST to `${baseUrl}/auth/login`
 * and store the returned token instead of fabricating the user here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AppUser | null>(this.restore());

  /** Reactive current user (null when logged out). */
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);

  /** POC login: fabricates a session. Returns the created user. */
  login(username: string, _password: string, role: UserRole): AppUser {
    const user: AppUser = {
      username,
      role,
      displayName: this.toDisplayName(username),
    };
    this._user.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  hasRole(roles: UserRole[]): boolean {
    const r = this.role();
    return r !== null && roles.includes(r);
  }

  private restore(): AppUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

  private toDisplayName(username: string): string {
    const base = username.trim() || 'User';
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
}
