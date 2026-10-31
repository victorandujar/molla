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
      'Pan que solo se hornea si lo has reservado',
    );
    // The packaging crumb, traced into one path per alveolus, wraps the footer.
    expect(
      await page.locator('.site-footer .crumb-field path').count(),
    ).toBeGreaterThan(400);
    // The hero is the loaf opened in the maker's mother's hands.
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
  // Home delivery is the default and asks for the town and the street.
  await expect(page.locator('#address')).toBeVisible();
  await page.locator('input[name=delivery][value=pickup]').check({
    force: true,
  });
  await expect(page.locator('#address')).toBeHidden();
  await page.locator('input[name=delivery][value=home]').check({
    force: true,
  });
  await page.locator('#town').selectOption('sant-just');
  await page.locator('#address').fill('Carrer Major 1, 2n 1a');
  await page.locator('input[name=pickup]').check();
  await page.locator('input[name=privacy]').check();
  // An empty order explains itself instead of reaching the server.
  await page.locator('#reservation-form button[type=submit]').click();
  await expect(page.locator('#reservation-form .form-error')).toContainText(
    'Añade una hogaza, un banana bread o bollería',
  );
  const moreLoaves = page.locator(
    '#reservation-form [data-target=quantity][data-step="1"]',
  );
  await moreLoaves.click();
  await moreLoaves.click();
  await expect(page.locator('#total')).toContainText('10,00');
  await page
    .locator('#reservation-form [data-target=banana][data-step="1"]')
    .click();
  await expect(page.locator('#banana-view')).toHaveText('½');
  await expect(page.locator('#total')).toContainText('18,00');
  await page.locator('#reservation-form button[type=submit]').click();
  await expect(page.locator('#confirmation')).toBeVisible();
  await expect(page.locator('#confirmation')).toContainText(
    '2 × La de cada semana · 1 × Medio banana bread',
  );
  await expect(page.locator('#confirmation')).toContainText(
    'Entrega a domicilio en Sant Just Desvern · Carrer Major 1, 2n 1a',
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
  expect(d.orders[0].total).toBe(1800);
  expect(d.orders[0].quantity).toBe(2);
  expect(d.orders[0].lang).toBe('es');
  expect(d.orders[0].delivery).toEqual({
    town: 'Sant Just Desvern',
    address: 'Carrer Major 1, 2n 1a',
  });
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
    send({ ...input, requestId: crypto.randomUUID(), quantity: 4 }),
    send({ ...input, requestId: crypto.randomUUID(), quantity: 4 }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  const d = JSON.parse(await readFile(dataPath, 'utf8'));
  expect(
    d.orders.reduce((n: number, o: { quantity: number }) => n + o.quantity, 0),
  ).toBe(8);
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
          quantity: 10,
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
    'Pa que només es cou si l’has reservat',
  );
  for (const path of [
    '/pa-a-domicili',
    '/es/pan-a-domicilio',
    '/pa-fix',
    '/es/pan-fijo',
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

test('banana bread is ordered by halves, alone or with bread, within its quota', async ({
  page,
  request,
}) => {
  const order = (banana: number, quantity = 0) =>
    request.post('/api/reservations', {
      headers: origin,
      data: {
        requestId: crypto.randomUUID(),
        bakeId: 'hornada-001',
        name: 'Pau',
        email: 'pau@example.com',
        phone: '612345678',
        quantity,
        banana,
        pickup: 'yes',
        privacy: 'yes',
      },
    });
  const empty = await order(0);
  expect(empty.status()).toBe(400);
  const whole = await order(2);
  expect(whole.status()).toBe(201);
  expect((await whole.json()).total).toBe(1500);
  const oneAndHalf = await order(1);
  expect((await oneAndHalf.json()).total).toBe(800);
  // Four halves per bake: one half is left, a whole one no longer fits.
  const tooMuch = await order(2);
  expect(tooMuch.status()).toBe(409);
  expect((await tooMuch.json()).error).toContain('banana bread');
  const d = await readData();
  expect(
    d.orders.map((o: { items: { product: string }[] }) => o.items[0]?.product),
  ).toEqual(['banana', 'banana-mitad']);
  // Loaves stay untouched by banana orders.
  const bake = await (await request.get('/api/bake')).json();
  expect(bake.bread).toEqual({ level: 'ok', max: 4 });
  expect(bake.banana).toEqual({ level: 'low', max: 1 });
  // Counts never leave the server.
  expect(bake).not.toHaveProperty('reserved');
  expect(bake).not.toHaveProperty('capacity');
  // The product card adds to the same order as the ticket.
  await page.goto('/es/');
  await page.locator('[data-buy="loaf"] > [data-add]').click();
  await expect(page.locator('#quantity')).toHaveValue('1');
  await expect(page.locator('[data-cart-count]')).toHaveText('1');
  await expect(page.locator('[data-count="loaf"]')).toHaveText(
    '1 en tu pedido',
  );
});

test('pastries on every bake: the Wednesday bake takes them too', async ({
  page,
  request,
}) => {
  await writeFile(
    dataPath,
    JSON.stringify({ orders: [], waitlist: [], limits: {}, bakeDay: 3 }),
  );
  const bake = await (await request.get('/api/bake')).json();
  expect(bake.pastry.max).toBeGreaterThan(0);
  const post = await request.post('/api/reservations', {
    headers: origin,
    data: {
      requestId: crypto.randomUUID(),
      bakeId: 'hornada-001',
      name: 'Nil',
      email: 'nil@example.com',
      phone: '612345678',
      quantity: 1,
      croissant: 1,
      pain: 1,
      pickup: 'yes',
      privacy: 'yes',
    },
  });
  expect(post.status()).toBe(201);
  await page.goto('/es/');
  await expect(page.locator('#hornada .stub-day')).toContainText('miércoles');
  await expect(page.locator('[data-buy="croissant"]')).toHaveCount(1);
  await expect(page.locator('#croissant')).toHaveCount(1);
  await expect(page.locator('[data-combo]')).toHaveCount(3);
});

test('Google reviews: verbatim quotes in both languages and exact links', async ({
  page,
}) => {
  for (const [path, count, all, leave] of [
    [
      '/',
      '7 ressenyes a Google',
      'Veure les 7 ressenyes a Google',
      'Deixa’n una',
    ],
    [
      '/es/',
      '7 reseñas en Google',
      'Ver las 7 reseñas en Google',
      'Deja la tuya',
    ],
  ] as const) {
    await page.goto(path);
    const reviews = page.locator('section.reviews');
    await expect(reviews.getByRole('heading', { level: 2 })).toContainText(
      `5/5 ${count}`,
    );
    // Same quotes, untranslated, on both pages.
    await expect(reviews.locator('blockquote')).toHaveCount(5);
    await expect(reviews.locator('blockquote').first()).toContainText(
      'TOTALMENTE ESPECTACULAR',
    );
    await expect(reviews.locator('blockquote').last()).toHaveAttribute(
      'lang',
      'es',
    );
    await expect(
      reviews.getByRole('link', { name: new RegExp(all) }),
    ).toHaveAttribute('href', 'https://share.google/OwE1uCFKRkCMsFFOa');
    const review = reviews.getByRole('link', { name: new RegExp(leave) });
    await expect(review).toHaveAttribute(
      'href',
      'https://g.page/r/CYMY0tZs2YLiEBM/review',
    );
    await expect(review).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(review).toHaveAttribute('target', '_blank');
  }
  // One poster at a time, chosen from the index (tabs) or with the keys.
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(5);
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.getByRole('tabpanel')).toContainText('Carlos M.');
  await tabs.nth(1).click();
  await expect(page.getByRole('tabpanel')).toContainText('David L.');
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Ramiro R.');
  await page.getByRole('button', { name: 'Reseña siguiente' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Guille M.');
});

test('croissants and pains au chocolat share 48 pieces per bake, by the unit', async ({
  page,
  request,
}) => {
  await writeFile(
    dataPath,
    JSON.stringify({ orders: [], waitlist: [], limits: {}, bakeDay: 6 }),
  );
  const order = (croissant: number, pain: number, email = 'nil@example.com') =>
    request.post('/api/reservations', {
      headers: origin,
      data: {
        requestId: crypto.randomUUID(),
        bakeId: 'hornada-001',
        name: 'Nil',
        email,
        phone: '612345678',
        quantity: 0,
        croissant,
        pain,
        pickup: 'yes',
        privacy: 'yes',
      },
    });
  // A pastry-only order is valid and priced by the unit.
  const mixed = await order(3, 2);
  expect(mixed.status()).toBe(201);
  expect((await mixed.json()).total).toBe(3 * 220 + 2 * 250);
  // More than a dozen of one piece in a single order is refused.
  expect((await order(13, 0)).status()).toBe(400);
  // Any split counts against the same 48: 5 + 12 + 12 + 12 = 41, 7 left.
  for (const [c, p] of [
    [12, 0],
    [0, 12],
    [6, 6],
  ] as const)
    expect((await order(c, p)).status()).toBe(201);
  const tooMuch = await order(4, 4);
  expect(tooMuch.status()).toBe(409);
  expect((await tooMuch.json()).error).toContain('bollería');
  expect((await order(4, 3)).status()).toBe(201);
  let bake = await (await request.get('/api/bake')).json();
  expect(bake.pastry).toEqual({ level: 'out', max: 0 });
  // Loaves and banana bread keep their own quotas.
  expect(bake.bread.level).toBe('ok');
  expect(bake.banana).toEqual({ level: 'ok', max: 4 });
  expect((await order(1, 0)).status()).toBe(409);
  const d = await readData();
  expect(d.orders[0].items).toEqual([
    { product: 'croissant', name: 'Croissant', quantity: 3, unitPrice: 220 },
    {
      product: 'pain-au-chocolat',
      name: 'Pain au chocolat',
      quantity: 2,
      unitPrice: 250,
    },
  ]);

  // In the page, the two steppers share what is left of the pool.
  await writeFile(
    dataPath,
    JSON.stringify({ orders: [], waitlist: [], limits: {}, bakeDay: 6 }),
  );
  for (const [c, p] of [
    [12, 12],
    [12, 6],
  ] as const)
    expect((await order(c, p, 'ona@example.com')).status()).toBe(201);
  await page.goto('/es/');
  // Six pieces left: the page says «few left», never the number.
  await expect(page.locator('[data-stock="pastry"]').first()).toHaveText(
    'Queda poca bollería',
  );
  await expect(page.locator('body')).not.toContainText(/Quedan \d|libres de/);
  await page.locator('[data-buy="croissant"] > [data-add]').click();
  await expect(page.locator('#croissant')).toHaveValue('1');
  await expect(page.locator('[data-count="croissant"]')).toHaveText(
    '1 en tu pedido',
  );
  const morePain = page.locator(
    '#reservation-form [data-target=pain][data-step="1"]',
  );
  for (let i = 0; i < 5; i++) await morePain.click();
  await expect(page.locator('#pain-view')).toHaveText('5');
  await expect(morePain).toBeDisabled();
  await expect(
    page.locator('#reservation-form [data-target=croissant][data-step="1"]'),
  ).toBeDisabled();
  await expect(page.locator('#total')).toContainText('14,70');
  await expect(page.locator('[data-cart-count]')).toHaveText('6');
});

test('pa fix: sign up, skip, pause, resume and cancel with one click each', async ({
  page,
}) => {
  await page.goto('/es/pan-fijo');
  await expect(page.locator('#sub-total')).toContainText('5,00');
  await page.locator('#sub-quantity').selectOption('2');
  await page.locator('#sub-banana').selectOption('1');
  await expect(page.locator('#sub-total')).toContainText('18,00');
  // Home delivery asks for the town and street; pickup hides them.
  await expect(page.locator('#sub-address')).toBeVisible();
  await page
    .locator('#subscription-form input[value=pickup]')
    .check({ force: true });
  await expect(page.locator('#sub-address')).toBeHidden();
  await page
    .locator('#subscription-form input[value=home]')
    .check({ force: true });
  await page.locator('#sub-town').selectOption('sant-just');
  await page.locator('#sub-address').fill('Carrer Major 1, 2n 1a');
  await page.locator('#sub-name').fill('Ana Prueba');
  await page.locator('#sub-email').fill('ana@example.com');
  await page.locator('#sub-phone').fill('612345678');
  await page.locator('input[name=terms]').check();
  await page.locator('input[name=privacy]').check();
  await page.locator('#subscription-form button[type=submit]').click();
  await expect(page.locator('#subscription-result')).toBeVisible();
  await expect(page.locator('#subscription-result [data-first]')).toContainText(
    'Tu primera entrega',
  );
  let data = await readData();
  expect(data.subscriptions).toHaveLength(1);
  expect(data.subscriptions[0]).toMatchObject({
    quantity: 2,
    banana: 1,
    frequency: 'weekly',
    town: 'sant-just',
    status: 'ACTIVE',
  });
  // The first order is placed right away, flagged as a pa fix with its links.
  expect(data.orders).toHaveLength(1);
  expect(data.orders[0].subscription.token).toBe(data.subscriptions[0].token);
  expect(data.orders[0].cancelToken).toBeTruthy();
  expect(data.orders[0].source).toBe('pafix');

  await page.locator('#subscription-result [data-manage]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Tu pan fijo',
  );
  await expect(page.locator('main')).toContainText('2 × La de cada semana');
  await expect(page.locator('main')).toContainText('Carrer Major 1, 2n 1a');
  // Opening the link never changes anything: only the buttons do.
  data = await readData();
  expect(data.orders[0].status).toBe('CONFIRMED');

  await page.getByRole('button', { name: 'Saltar esta semana' }).click();
  await expect(page.locator('.manage-notice')).toContainText(
    'esta semana no recibirás pan',
  );
  expect((await readData()).orders[0].status).toBe('CANCELLED');
  // With nothing open, the next skip applies to the next bake.
  await page.getByRole('button', { name: 'Saltar la próxima entrega' }).click();
  await expect(page.locator('.manage-notice')).toContainText(
    'saltaremos la próxima entrega',
  );
  expect((await readData()).subscriptions[0].skipRemaining).toBe(1);
  await page
    .getByRole('button', { name: 'No, mantener la próxima entrega' })
    .click();
  expect((await readData()).subscriptions[0].skipRemaining).toBe(0);

  await page.getByRole('button', { name: 'Pausar mi pan fijo' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Tu pan fijo está en pausa',
  );
  await page.getByRole('button', { name: 'Reanudar mi pan fijo' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Tu pan fijo',
  );
  await page.getByRole('button', { name: 'Darme de baja' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Pan fijo cancelado',
  );
  expect((await readData()).subscriptions[0].status).toBe('CANCELLED');
  await expect(
    page.getByRole('link', { name: 'Volver a apuntarme' }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});

test('pa fix sign-up validation, language and bad links', async ({
  page,
  request,
}) => {
  const base = {
    name: 'Ana',
    email: 'ana@example.com',
    phone: '612345678',
    quantity: 1,
    delivery: 'pickup',
    terms: 'yes',
    privacy: 'yes',
  };
  const post = (data: object, lang = 'es', headers = origin) =>
    request.post(`/api/subscriptions?lang=${lang}`, { headers, data });
  expect((await post({ ...base, terms: '' })).status()).toBe(400);
  const noTown = await post(
    { ...base, delivery: 'home', address: 'Carrer Major 1' },
    'ca',
  );
  expect(noTown.status()).toBe(400);
  expect((await noTown.json()).error).toBe(
    'Tria el teu municipi per a l’entrega a domicili.',
  );
  expect((await post({ ...base, quantity: 0 })).status()).toBe(400);
  expect((await post({ ...base, frequency: 'daily' })).status()).toBe(400);
  expect((await post({ ...base, website: 'spam' })).status()).toBe(400);
  expect((await post(base, 'es', {} as typeof origin)).status()).toBe(403);
  expect((await readData()).subscriptions ?? []).toHaveLength(0);
  const ok = await post(base);
  expect(ok.status()).toBe(201);
  // A repeated request does not create a second subscription.
  expect((await post(base)).status()).toBe(201);
  expect((await readData()).subscriptions).toHaveLength(1);

  await page.goto(
    '/subscripcio?token=00000000-0000-4000-8000-000000000000&lang=ca',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'L’enllaç no és vàlid.',
  );
  await page.goto('/subscripcio');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'L’enllaç no és vàlid.',
  );
  await page.goto('/pa-fix');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'El teu pa de cada setmana',
  );
  await expect(page.locator('.lang-switch')).toHaveAttribute(
    'href',
    '/es/pan-fijo',
  );
});

test('cancel an order with one click from its private link', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/reservations?lang=ca', {
    headers: origin,
    data: {
      requestId: crypto.randomUUID(),
      bakeId: 'hornada-001',
      name: 'Ana Prueba',
      email: 'ana@example.com',
      phone: '612345678',
      product: 'clasica',
      quantity: 2,
      pickup: 'yes',
      privacy: 'yes',
    },
  });
  expect(created.status()).toBe(201);
  const [order] = (await readData()).orders;
  expect(order.cancelToken).toMatch(/^[0-9a-f-]{36}$/);
  await page.goto(`/comanda?token=${order.cancelToken}&lang=ca`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Vols cancel·lar aquesta comanda?',
  );
  await expect(page.locator('main')).toContainText(order.code);
  // The page alone (what a mail scanner opens) cancels nothing.
  expect((await readData()).orders[0].status).toBe('CONFIRMED');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Sí, cancel·lar la comanda' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Comanda cancel·lada.',
  );
  expect((await readData()).orders[0].status).toBe('CANCELLED');
  await page.goto(`/comanda?token=${order.cancelToken}&lang=es`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Este pedido ya estaba cancelado.',
  );
  await page.goto('/comanda?token=nope');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'L’enllaç no és vàlid.',
  );
  // Cross-origin posts are ignored.
  const forged = await request.post(`/comanda?lang=es`, {
    headers: { origin: 'https://evil.example' },
    form: { token: order.cancelToken },
  });
  // Astro refuses cross-origin form posts outright.
  expect(forged.status()).toBe(403);
  // The freed loaves can be booked again.
  const left = await request.get('/api/bake');
  expect((await left.json()).bread).toEqual({ level: 'ok', max: 4 });
});

test('owner panel lists pa fix subscribers and can pause, resume and cancel them', async ({
  page,
  request,
}) => {
  const joined = await request.post('/api/subscriptions?lang=es', {
    headers: origin,
    data: {
      name: 'Marta Fija',
      email: 'marta@example.com',
      phone: '612345678',
      quantity: 2,
      frequency: 'biweekly',
      delivery: 'home',
      town: 'sant-boi',
      address: 'Carrer Major 1',
      terms: 'yes',
      privacy: 'yes',
    },
  });
  expect(joined.status()).toBe(201);
  await page.goto('/gestio');
  await page.getByLabel('Contraseña').fill('e2e-password-local');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('#panfijo-title')).toContainText('1 activos');
  const card = page.locator('#panfijo .admin-orders li', {
    hasText: 'Marta Fija',
  });
  await expect(card).toContainText('2 × La de cada semana');
  await expect(card).toContainText('cada dos semanas');
  await expect(card).toContainText('Carrer Major 1');
  await expect(card).toContainText('612345678');
  await card.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.locator('#panfijo .admin-notice')).toContainText(
    'Pan fijo pausado',
  );
  const data = await readData();
  expect(data.subscriptions[0].status).toBe('PAUSED');
  // Pausing also cancels this week's open order.
  expect(data.orders[0].status).toBe('CANCELLED');
  await expect(page.locator('#panfijo-title')).toContainText('1 en pausa');
  await card.getByRole('button', { name: 'Reanudar' }).click();
  expect((await readData()).subscriptions[0].status).toBe('ACTIVE');
  await card.locator('summary', { hasText: 'Dar de baja' }).click();
  await card
    .getByRole('button', { name: 'Sí, dar de baja a Marta Fija' })
    .click();
  await expect(page.locator('#panfijo .admin-notice')).toContainText(
    'Pan fijo dado de baja',
  );
  expect((await readData()).subscriptions[0].status).toBe('CANCELLED');
  await expect(card).toContainText('De baja');
  await expect(card.getByRole('button')).toHaveCount(0);
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});

test('no banana bread gift anywhere; the first order still gets the pa fix voucher', async ({
  page,
  request,
}) => {
  await page.goto('/es/');
  await expect(page.locator('.hero-lede')).toContainText(
    'Miércoles y sábado en tu puerta. Pagas al recibirlo.',
  );
  // The banana bread welcome gift is over: not in the hero nor by the ticket.
  await expect(page.locator('.hero-gift')).toHaveCount(0);
  await expect(page.locator('#regal')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/regalo|dos trozos/i);
  await expect(page.locator('.fix')).toContainText(
    'Solo para el Pan fijo: cuando te haya entregado 3 panes, el 4.º corre de mi cuenta.',
  );
  await expect(page.locator('body')).not.toContainText('chutney');
  await expect(page.locator('body')).not.toContainText('suscripciones');
  await expect(page.locator('.why')).toContainText('de fermentación lenta');
  // The pa fix block leads to the sign-up page.
  await expect(
    page.locator('.fix').getByRole('link', { name: /Pan fijo/ }),
  ).toHaveAttribute('href', '/es/pan-fijo');
  await expect(page.locator('.form-footnote').first()).toContainText(
    'Cancelas con un clic hasta el cierre.',
  );
  const book = (email: string) =>
    request.post('/api/reservations', {
      headers: origin,
      data: {
        requestId: crypto.randomUUID(),
        bakeId: 'hornada-001',
        name: 'Ana Prueba',
        email,
        phone: '612345678',
        product: 'clasica',
        quantity: 1,
        pickup: 'yes',
        privacy: 'yes',
      },
    });
  expect((await (await book('ana@example.com')).json()).firstOrder).toBe(true);
  expect((await (await book('ana@example.com')).json()).firstOrder).toBe(false);
  expect((await (await book('otra@example.com')).json()).firstOrder).toBe(true);
  const orders = (await readData()).orders;
  expect(orders.map((o: { firstOrder: boolean }) => o.firstOrder)).toEqual([
    true,
    false,
    true,
  ]);
  // The on-screen confirmation offers the pa fix, without any gift.
  await reset();
  await page.goto('/es/');
  await page
    .locator('#reservation-form [data-target=quantity][data-step="1"]')
    .click();
  await page.locator('#town').selectOption('sant-boi');
  await page.locator('#address').fill('Carrer Major 1, 2n');
  await page.getByLabel('Tu nombre', { exact: true }).fill('Bea Prueba');
  await page.locator('#email').fill('bea@example.com');
  await page.locator('#phone').fill('612345678');
  await page.locator('input[name=pickup]').check();
  await page.locator('input[name=privacy]').check();
  await page.locator('#reservation-form button[type=submit]').click();
  await expect(page.locator('#confirmation')).toBeVisible();
  await expect(page.locator('#confirmation')).not.toContainText(/regalo/i);
  await expect(
    page.locator('#confirmation').getByRole('link', { name: /Pan fijo/ }),
  ).toHaveAttribute('href', '/es/pan-fijo');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('Combina Molla: three pairings at the sum of their pieces, counted per pairing', async ({
  page,
}) => {
  await writeFile(
    dataPath,
    JSON.stringify({ orders: [], waitlist: [], limits: {}, bakeDay: 6 }),
  );
  await page.goto('/es/');
  const combos = page.locator('#combina .combo');
  await expect(combos).toHaveCount(3);
  // No discount: 5 + 2,20 · 5 + 2,50 · 2 × 5 + 2 × 2,20.
  await expect(combos.nth(0)).toContainText('7,20€');
  await expect(combos.nth(1)).toContainText('7,50€');
  await expect(combos.nth(2)).toContainText('14,40€');
  await expect(page.locator('#combina')).not.toContainText(
    /descuento|gratis|oferta/i,
  );
  // The single products stay on the page.
  await expect(page.locator('[data-buy="loaf"]')).toBeVisible();
  await page
    .getByRole('button', { name: 'Añadir Para compartir al pedido' })
    .click();
  await expect(page.locator('#quantity')).toHaveValue('2');
  await expect(page.locator('#croissant')).toHaveValue('2');
  await expect(page.locator('#total')).toContainText('14,40');
  // The trial is measured in /gestio: adds per pairing.
  await expect
    .poll(async () =>
      Object.keys((await readData()).events || {}).some((k) =>
        k.includes('|combo_compartir|'),
      ),
    )
    .toBe(true);
});
