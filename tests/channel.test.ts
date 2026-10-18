import { test } from 'node:test';
import assert from 'node:assert/strict';
// Read when `config` loads, so set it before importing anything.
process.env.WHATSAPP_CHANNEL_URL =
  'https://whatsapp.com/channel/0029VbExample123';
process.env.GOOGLE_PROFILE_URL = 'javascript:alert(1)';
const { brand } = await import('../src/lib/config');
const { confirmationHtml, confirmationText } =
  await import('../src/lib/email-templates');
const order = {
  id: 'x',
  code: '001-K7QM',
  requestId: 'r',
  bakeId: 'hornada-001',
  name: 'Ana',
  email: 'a@example.com',
  phone: '600000000',
  quantity: 1,
  product: 'clasica',
  productName: 'La de cada semana',
  total: 500,
  pickupDate: '2026-09-26T10:00:00.000Z',
  pickupAddress: 'Punto de recogida en Sant Boi de Llobregat',
  pickupWindow: '12:00–14:00',
  source: 'direct',
  status: 'CONFIRMED' as const,
  createdAt: '',
  emailStatus: 'PENDING' as const,
  lang: 'ca' as const,
};
test('only a WhatsApp channel link and an https profile link are accepted', () => {
  assert.equal(
    brand.whatsappChannel,
    'https://whatsapp.com/channel/0029VbExample123',
  );
  assert.equal(brand.googleProfile, '');
});
test('the confirmation email invites to the channel in the customer language', () => {
  const html = confirmationHtml(order);
  assert.match(
    html,
    /href="https:\/\/whatsapp\.com\/channel\/0029VbExample123"/,
  );
  assert.match(html, /Segueix el canal/);
  assert.match(
    confirmationText(order),
    /segueix el canal de WhatsApp\. https:\/\/whatsapp\.com\/channel\//,
  );
});
