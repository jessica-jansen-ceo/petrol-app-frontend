/** User roles supported by the POC. The login dropdown is populated from these. */
export enum UserRole {
  Admin = 'admin',
  Manager = 'manager',
  Operator = 'operator',
}

/** Human-readable labels for the role dropdown. */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Admin (full control)',
  [UserRole.Manager]: 'Manager',
  [UserRole.Operator]: 'Pump Operator',
};

export const ALL_ROLES: UserRole[] = [
  UserRole.Admin,
  UserRole.Manager,
  UserRole.Operator,
];
