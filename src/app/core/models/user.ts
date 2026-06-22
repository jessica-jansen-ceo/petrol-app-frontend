import { UserRole } from './roles';

/** The authenticated user. In the POC this is fabricated at login time. */
export interface AppUser {
  username: string;
  role: UserRole;
  /** Display name derived from the username. */
  displayName: string;
}
