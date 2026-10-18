// Acquisition channels, shared by the page script and the server schemas.
// `qr` tags printed flyers and posters; `facebook` covers local groups.
export const sources = [
  'instagram',
  'google',
  'whatsapp',
  'facebook',
  'qr',
  'pafix',
  'direct',
  'referral',
] as const;
export type Source = (typeof sources)[number];
