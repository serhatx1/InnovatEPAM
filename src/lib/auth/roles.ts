export const ROLES = {
  SUBMITTER: "submitter",
  ADMIN: "admin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN;
}
