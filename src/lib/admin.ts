import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
// The owner's panel at /gestio is protected by one password (ADMIN_PASSWORD).
// The session cookie is an expiry signed with a key derived from it, so
// changing the password signs everyone out.
export const sessionCookie = 'molla_admin';
export const sessionHours = 12;
const password = () => process.env.ADMIN_PASSWORD || '';
export const adminEnabled = () => password().length >= 12;
const digest = (s: string) => createHash('sha256').update(s).digest();
const sign = (payload: string) =>
  createHmac('sha256', digest(`molla-admin:${password()}`))
    .update(payload)
    .digest('base64url');
export const checkPassword = (given: string) =>
  adminEnabled() && timingSafeEqual(digest(given), digest(password()));
export function createSession(now = Date.now()) {
  const expires = String(now + sessionHours * 3600000);
  return `${expires}.${sign(expires)}`;
}
export function validSession(value: string | undefined, now = Date.now()) {
  if (!adminEnabled() || !value) return false;
  const [expires = '', signature = ''] = value.split('.');
  if (!/^\d+$/.test(expires) || Number(expires) <= now) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
