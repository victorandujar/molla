import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const dataPath = '.data/demo.json';
const origin = { origin: 'http://127.0.0.1:4381' };
const readData = async () => JSON.parse(await readFile(dataPath, 'utf8'));
async function reset() {
  await mkdir('.data', { recursive: true });
  await writeFile(
    dataPath,
    JSON.stringify({ orders: [], waitlist: [], limits: {} }),
  );
}
test.beforeEach(reset);
test('real photos, keyboard access, responsive layout and accessibility', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    await page.goto('/es/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Pan artesanal por encargo',
    );
    await expect(page.locator('.hero-photo img')).toHaveCount(2);
    await expect(page.locator('.hero-photo img').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.forEach((img) => img.setAttribute('loading', 'eager')),
      );
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    await page.screenshot({
      path: `docs/screenshots/home-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/es/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
  expect(errors).toEqual([]);
});
test('reservation, validation and waitlist journey', async ({ page }) => {
  await page.goto('/es/');
  await page.locator('#reservation-form button[type=submit]').click();
  await expect(page.locator('#confirmation')).toBeHidden();
  await page.getByLabel('Tu nombre', { exact: true }).fill('Ana Prueba');
  await page.locator('#email').fill('ana@example.com');
  await page.locator('#phone').fill('612345678');
  await page.locator('input[name=pickup]').check();
  await page.locator('input[name=privacy]').check();
  await page.getByRole('button', { name: 'Añadir una hogaza' }).click();
  await expect(page.locator('#total')).toContainText('10,00');
  await page.locator('#reservation-form button[type=submit]').click();
  await expect(page.locator('#confirmation')).toBeVisible();
  await expect(page.locator('#confirmation')).toContainText(
    '2 × La de cada semana',
  );
  await page.locator('#waitlist-email').fill('ana@example.com');
  await page.locator('input[name=consent]').check();
  await page.locator('#waitlist-form button[type=submit]').click();
  await expect(page.locator('.waitlist-success')).toBeVisible();
  await expect(page.locator('.waitlist-success')).toContainText(
    'te he enviado un email para confirmar',
  );
  const d = await readData();
  expect(d.orders).toHaveLength(1);
  expect(d.orders[0].total).toBe(1000);
  expect(d.orders[0].lang).toBe('es');
  expect(d.waitlist).toHaveLength(1);
  expect(d.waitlist[0].confirmedAt).toBeNull();
  // Double opt-in: opening the link does nothing until the button is pressed.
  await page.goto(`/alta?token=${d.waitlist[0].confirmToken}&lang=ca`);
  expect((await readData()).waitlist[0].confirmedAt).toBeNull();
  await page.getByRole('button', { name: 'Sí, avisa’m' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Avís confirmat.',
  );
  expect((await readData()).waitlist[0].confirmedAt).toBeTruthy();
});
test('every request id is generated in the browser, never in shared HTML', async ({
  page,
}) => {
  await page.goto('/es/');
  const first = await page.locator('input[name=requestId]').inputValue();
  await page.reload();
  const second = await page.locator('input[name=requestId]').inputValue();
  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  expect(second).not.toBe(first);
  const html = await (await page.request.get('/es/')).text();
  expect(html).toContain('name="requestId" value=""');
});
test('server errors follow the page language', async ({ request }) => {
  const ca = await request.post('/api/reservations?lang=ca', {
    headers: origin,
    data: {
      requestId: crypto.randomUUID(),
      bakeId: 'hornada-001',
      name: 'Ana',
      email: 'ana@example.com',
      phone: 'abc',
      product: 'clasica',
      quantity: 1,
      pickup: 'yes',
      privacy: 'yes',
    },
  });
  expect(ca.status()).toBe(400);
  expect((await ca.json()).error).toBe('Revisa el telèfon.');
  const broken = await request.post('/api/reservations?lang=ca', {
    headers: { ...origin, 'content-type': 'application/json' },
    data: '{not json',
  });
  expect(broken.status()).toBe(400);
  const stale = await request.post('/api/reservations', {
    headers: origin,
    data: {
      requestId: crypto.randomUUID(),
      bakeId: 'hornada-000',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '612345678',
      product: 'clasica',
      quantity: 1,
      pickup: 'yes',
      privacy: 'yes',
    },
  });
  expect(stale.status()).toBe(409);
  expect((await stale.json()).error).toBe(
    'La hornada ha cambiado. Recarga la página.',
  );
});
test('cookie-free counters store only event, channel and day', async ({
  page,
  request,
}) => {
  await page.goto('/?utm_source=instagram');
  await expect
    .poll(async () => Object.keys((await readData()).events || {}))
    .toContainEqual(expect.stringMatching(/\|landing_view\|instagram$/));
  expect(
    (
      await request.post('/api/events', {
        headers: origin,
        data: { event: 'nope', source: 'x' },
      })
    ).status(),
  ).toBe(204);
  expect(
    (
      await request.post('/api/events', {
        headers: { origin: 'https://elsewhere.example' },
        data: { event: 'landing_view', source: 'direct' },
      })
    ).status(),
  ).toBe(204);
  const keys = Object.keys((await readData()).events);
  expect(keys.some((k) => k.includes('|nope|') || k.endsWith('|direct'))).toBe(
    false,
  );
});
test('owner panel needs the password and marks orders at pickup', async ({
  page,
  request,
}) => {
  // Set by `npm run dev:e2e`; astro dev does not load .env into process.env.
  const password = 'e2e-password-local';
  const created = await request.post('/api/reservations', {
    headers: origin,
    data: {
      requestId: crypto.randomUUID(),
      bakeId: 'hornada-001',
      name: 'Marta',
      email: 'marta@example.com',
      phone: '612345678',
      product: 'clasica',
      quantity: 2,
      pickup: 'yes',
      privacy: 'yes',
    },
  });
  const { code } = await created.json();
  await page.goto('/gestio');
  await expect(page.locator('main')).not.toContainText(code);
  await page.getByLabel('Contraseña').fill('incorrecta-del-todo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Contraseña incorrecta.');
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  const card = page.locator('.admin-orders li', { hasText: code });
  await expect(card).toContainText('Marta');
  await card.getByRole('button', { name: 'Marcar recogido' }).click();
  await expect(page.locator('.admin-notice')).toHaveText(
    'Pedido marcado como recogido.',
  );
  expect((await readData()).orders[0].status).toBe('COLLECTED');
  await page
    .locator('.admin-orders li', { hasText: code })
    .getByRole('button', { name: 'Deshacer' })
    .click();
  expect((await readData()).orders[0].status).toBe('CONFIRMED');
  const forged = await request.post('/gestio', {
    headers: origin,
    form: {
      action: 'status',
      id: (await readData()).orders[0].id,
      to: 'CANCELLED',
    },
  });
  expect(forged.status()).toBe(200);
  expect((await readData()).orders[0].status).toBe('CONFIRMED');
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});
test('duplicate request and simultaneous last loaf never overbook', async ({
  request,
}) => {
  const input = {
    requestId: crypto.randomUUID(),
    bakeId: 'hornada-001',
    name: 'Test',
    email: 'test@example.com',
    phone: '612345678',
    product: 'clasica',
    quantity: 4,
    pickup: 'yes',
    privacy: 'yes',
  };
  const send = (payload: unknown) =>
    request.post('/api/reservations', {
      headers: { origin: 'http://127.0.0.1:4381' },
      data: payload,
    });
  const first = await send(input);
  expect(first.status()).toBe(201);
  const firstBody = await first.json();
  const retry = await send(input);
  expect((await retry.json()).id).toBe(firstBody.id);
  const responses = await Promise.all([
    send({ ...input, requestId: crypto.randomUUID(), quantity: 2 }),
    send({ ...input, requestId: crypto.randomUUID(), quantity: 2 }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  const d = JSON.parse(await readFile(dataPath, 'utf8'));
  expect(
    d.orders.reduce((n: number, o: { quantity: number }) => n + o.quantity, 0),
  ).toBe(6);
});
test('sold out bake becomes waitlist and cannot accept more orders', async ({
  page,
}) => {
  await writeFile(
    dataPath,
    JSON.stringify({
      orders: [
        {
          id: 'fixture',
          bakeId: 'hornada-001',
          quantity: 6,
          status: 'CONFIRMED',
        },
      ],
      waitlist: [],
      limits: {},
    }),
  );
  await page.goto('/es/');
  await expect(page.locator('[data-bake-label]')).toHaveText('Hornada agotada');
  await expect(page.locator('#reservation-form')).toHaveCount(0);
  await page.locator('[data-bake-cta]').click();
  await expect(page.locator('#waitlist-email')).toBeVisible();
});
test('reject invalid data and cross-origin writes', async ({ request }) => {
  expect(
    (
      await request.post('/api/reservations', {
        headers: { origin: 'https://elsewhere.example' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/reservations', {
        headers: { origin: 'http://127.0.0.1:4381' },
        data: { quantity: -1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post('/api/waitlist', {
        headers: { origin: 'http://127.0.0.1:4381' },
        data: { email: 'test@example.com' },
      })
    ).status(),
  ).toBe(400);
});
test('SEO draft safeguards and internal navigation', async ({
  page,
  request,
}) => {
  await page.goto('/es/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
  const paths = await page
    .locator('a[href^="/"]')
    .evaluateAll((links) => [
      ...new Set(
        links.map((a) => a.getAttribute('href')!.split('#')[0]).filter(Boolean),
      ),
    ]);
  for (const path of paths)
    expect((await request.get(path!)).status()).toBe(200);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect(await (await request.get('/sitemap.xml')).text()).toContain('<urlset');
});

test('closed bake rejects reservations but accepts next-bake waitlist', async ({
  page,
  request,
}) => {
  await writeFile(
    dataPath,
    JSON.stringify({
      bakeStatus: 'CLOSED',
      orders: [],
      waitlist: [],
      limits: {},
    }),
  );
  await page.goto('/es/');
  await expect(page.locator('[data-bake-label]')).toHaveText(
    'Pedidos cerrados',
  );
  await expect(page.locator('#reservation-form')).toHaveCount(0);
  const response = await request.post('/api/reservations', {
    headers: { origin: 'http://127.0.0.1:4381' },
    data: {
      requestId: crypto.randomUUID(),
      bakeId: 'hornada-001',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '612345678',
      product: 'clasica',
      quantity: 1,
      pickup: 'yes',
      privacy: 'yes',
    },
  });
  expect(response.status()).toBe(409);
  await page.locator('#waitlist-email').fill('closed@example.com');
  await page.locator('input[name=consent]').check();
  await page.locator('#waitlist-form button').click();
  await expect(page.locator('.waitlist-success')).toBeVisible();
});
test('Catalan privacy page mirrors the Spanish one', async ({ page }) => {
  await page.goto('/privacitat');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Privacitat i condicions.',
  );
  await page.locator('.lang-switch').click();
  await expect(page).toHaveURL(/\/privacidad$/);
});
test('waitlist deduplicates emails and unsubscribe requires explicit POST', async ({
  page,
  request,
}) => {
  const data = { email: 'unsubscribe@example.com', consent: 'yes' };
  for (let i = 0; i < 2; i++)
    expect(
      (
        await request.post('/api/waitlist', {
          headers: { origin: 'http://127.0.0.1:4381' },
          data,
        })
      ).status(),
    ).toBe(200);
  const d = await readData();
  expect(d.waitlist).toHaveLength(1);
  await page.goto('/baja?token=' + d.waitlist[0].token);
  expect(JSON.parse(await readFile(dataPath, 'utf8')).waitlist).toHaveLength(1);
  await page.getByRole('button', { name: 'Confirmar baja' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Baja confirmada.',
  );
  expect(JSON.parse(await readFile(dataPath, 'utf8')).waitlist).toHaveLength(0);
});

test('Catalan is the main language, Spanish lives under /es/', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Pa artesà per encàrrec',
  );
  for (const path of [
    '/recollida',
    '/poolish',
    '/es/',
    '/es/recogida',
    '/es/poolish',
  ]) {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  }
  for (const [from, to] of [
    ['/ca/', '/'],
    ['/ca/recollida', '/recollida'],
    ['/ca/poolish', '/poolish'],
    ['/recogida', '/es/recogida'],
  ]) {
    const res = await request.get(from!, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(new URL(res.headers().location!, 'http://x').pathname).toBe(to);
  }
  await page.goto('/es/recogida');
  await expect(page.locator('main')).toContainText('Sant Boi de Llobregat');
  await expect(page.locator('main')).toContainText(
    'Te confirmaremos el punto exacto de recogida con tu pedido',
  );
  await expect(page.locator('body')).not.toContainText('Ronda de Sant Ramon');
  await page.locator('.lang-switch').click();
  await expect(page).toHaveURL(/\/recollida$/);
});
