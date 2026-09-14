import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const dataPath = '.data/demo.json';
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
      'la noche antes',
    );
    await expect(page.locator('.hero-photo img')).toBeVisible();
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
  await expect(page.locator('#total')).toContainText('13,00');
  await page.locator('#reservation-form button[type=submit]').click();
  await expect(page.locator('#confirmation')).toBeVisible();
  await expect(page.locator('#confirmation')).toContainText(
    '2 × La de cada semana',
  );
  await page.locator('#waitlist-email').fill('ana@example.com');
  await page.locator('input[name=consent]').check();
  await page.locator('#waitlist-form button[type=submit]').click();
  await expect(page.locator('.waitlist-success')).toBeVisible();
  const d = JSON.parse(await readFile(dataPath, 'utf8'));
  expect(d.orders).toHaveLength(1);
  expect(d.orders[0].total).toBe(1300);
  expect(d.waitlist).toHaveLength(1);
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
  const d = JSON.parse(await readFile(dataPath, 'utf8'));
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
    'la nit abans',
  );
  for (const path of ['/recollida', '/poolish', '/es/', '/es/recogida', '/es/poolish']) {
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
  await page.locator('.lang-switch').click();
  await expect(page).toHaveURL(/\/recollida$/);
});
