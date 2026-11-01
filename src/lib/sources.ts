// Acquisition channels, shared by the page script and the server schemas.
// `qr` tags printed flyers and posters; `facebook` covers local groups;
// `email` the automated funnel emails and `ads` paid campaigns (Meta, Google).
export const sources = [
  'instagram',
  'google',
  'whatsapp',
  'facebook',
  'qr',
  'pafix',
  'email',
  'ads',
  'direct',
  'referral',
] as const;
export type Source = (typeof sources)[number];
