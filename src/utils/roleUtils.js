// Utility for normalizing/mapping user role strings to the application's
// canonical role enums used across models (Chat participant roles, Notification recipientType, etc.)
// Keep mappings here so all controllers/services use a single source of truth.

export const CANONICAL_ROLES = ['client', 'fundi', 'admin', 'shop_owner'];

// Normalize arbitrary role-like strings into one of the canonical roles.
// Examples:
//  - 'super_admin' -> 'admin'
//  - 'secretary' -> 'admin'
//  - 'system' -> 'admin'
//  - 'shopowner' -> 'shop_owner'
//  - null/undefined -> 'client' (safe default)
export function normalizeRole(role) {
  if (!role) return 'client';
  const r = String(role).toLowerCase();

  if (r === 'client') return 'client';
  if (r === 'fundi' || r === 'tradesman' || r === 'tradesperson') return 'fundi';
  if (r === 'shopowner' || r === 'shop_owner' || r === 'shop-owner') return 'shop_owner';

  // Treat any admin-like or system roles as admin
  if (r.includes('admin') || r === 'secretary' || r === 'system' || r === 'system_user') return 'admin';

  // Fallback: if it's one of the canonical roles keep it, otherwise default to client
  if (CANONICAL_ROLES.includes(r)) return r;
  return 'client';
}

// Map a requested recipientType (from APIs) into the canonical recipient type used
// for Notification.recipientType enum. Accepts values like 'all' (returns null),
// or role names which will be normalized.
export function resolveRecipientType(requested) {
  if (!requested) return null;
  const r = String(requested).toLowerCase();
  if (r === 'all' || r === 'everyone') return null;
  // If the caller already passed a canonical role, return it
  const normalized = normalizeRole(r);
  return normalized;
}

export default {
  normalizeRole,
  resolveRecipientType,
  CANONICAL_ROLES
};
