# Molla · microobrador por encargo

MVP independiente para probar la demanda de pan de poolish (fermentación lenta) en el Baix Llobregat, con recogida en Sant Boi de Llobregat. Astro, TypeScript estricto, Tailwind, fotografías reales optimizadas y una pequeña capa PostgreSQL. Pago al recoger. Marca provisional configurable.

## Ver el proyecto

```sh
npm ci
npm run dev -- --background --host 127.0.0.1
```

Las 15 fotos originales se conservan en `assets/originals/` (fuera de Git); la web sirve las variantes optimizadas de `public/images/`. `npm run photos` regenera las variantes.

La dirección de desarrollo es `http://127.0.0.1:4381`. Se usa otro puerto para evitar interferir con los demás proyectos del ordenador. Gestión: `npx astro dev status`, `npx astro dev logs`, `npx astro dev stop`.

En desarrollo se activa una demo con archivo local `.data/demo.json`. Solo usar datos ficticios. Los pedidos se conservan entre reinicios; para empezar de cero, detener el servidor y borrar únicamente ese archivo. En una compilación desplegada la demo está siempre deshabilitada, aunque LOCAL_DEMO esté definido.

## Verificación

```sh
npm run check
npm test
npm run build
npm run dev:e2e -- --background --host 127.0.0.1
npm run test:e2e
```

`dev:e2e` arranca la demo con una contraseña de prueba para `/gestio` (`astro dev` no carga `.env` en `process.env`). Las pruebas E2E reinician los datos de DEMOSTRACIÓN; ejecutarlas únicamente sobre la demo local. No apuntarlas a producción. La compilación es para Vercel. `node scripts/serve-built.mjs` permite inspeccionar localmente el handler compilado en el puerto 4382, sin simular una base de datos de producción. Resultados y límites en `docs/verificacion.md`.

## Activar un entorno real

1. Crear `.env` con las variables de `src/lib/config.ts`, `src/lib/email.ts` y los scripts (o `vercel env pull`). Los secretos son solo de servidor; nunca se incluyen en el JavaScript del cliente.
2. Crear una base PostgreSQL dedicada (por ejemplo, Neon), con conexiones DATABASE_URL y DATABASE_URL_UNPOOLED del mismo entorno. No usar la base de otro proyecto.
3. Ejecutar `npm run db:migrate` y `npm run db:seed`. Las migraciones se registran con checksum y rechazan cambios a archivos ya aplicados. Las hornadas siguientes se crean con `npm run bake` (ver `docs/operacion.md`).
4. Verificar recogida, fechas, capacidad, precio, receta y alérgenos. Completar responsable, domicilio, contacto, proveedores de datos, plazos de conservación y condiciones de transferencias. `LAUNCH_REVIEWED=true` confirma esta revisión. No representa una licencia ni una validación jurídica.
5. Configurar las variables de ese entorno en Vercel y conectar el repositorio. Build: `npm run build`; salida gestionada por `@astrojs/vercel`. Poner `PUBLIC_SITE_URL` al dominio HTTPS real. Mantener `LIVE_ORDERS=false` hasta probar la reserva, la confirmación y las exportaciones con PostgreSQL y verificar los datos operativos.
6. Activar LIVE_ORDERS y desplegar. La disponibilidad y cada reserva se validan en servidor. Si falta configuración, no se admiten pedidos ni se recogen emails reales.

No requiere credenciales de pago para arrancar. El email transaccional es opcional: RESEND_API_KEY y EMAIL_FROM. Instagram y WhatsApp se muestran solo si sus contactos están configurados. Antes de vender, el titular debe confirmar que la actividad y la recogida pueden realizarse en las condiciones descritas.

## Git y despliegue

Remoto `github.com/victorandujar/molla`. `main` despliega producción en Vercel; las demás ramas generan Preview contra la base `molla_dev`, sin emails.

Entornos locales: `.env` apunta a `molla_dev` y `.env.production` a producción. Los scripts de producción llevan el sufijo `:prod`. Si un despliegue incluye migraciones nuevas, ejecuta `npm run db:migrate:prod` antes de publicarlo; las migraciones deben ser compatibles con la versión anterior. Gestión diaria: `/gestio` (ver `docs/operacion.md`).

## Documentos

- `docs/brand-spec.md`: dirección visual y alternativas de nombre.
- `docs/fotografia.md`: selección de las 15 fotos originales.
- `docs/operacion.md`: abrir hornadas, consultar pedidos, pagos, avisos y métricas.
- `docs/lanzamiento-30-dias.md`: captación local y primeros textos de Instagram.
- `docs/verificacion.md`: pruebas realizadas y límites de la entrega.

## Referencias consultadas

- [Routing de Astro](https://docs.astro.build/en/guides/routing/)
- [Componentes de Astro](https://docs.astro.build/en/basics/astro-components/)
- [Estilos](https://docs.astro.build/en/guides/styling/)
- [Renderizado en servidor](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Despliegue en Vercel](https://docs.astro.build/en/guides/deploy/vercel/)
- [Guía de la AEPD sobre información de privacidad](https://www.aepd.es/guias/guia-modelo-clausula-informativa.pdf), guía en revisión; la página incluida es una base configurable, pendiente de completar con los datos de la actividad.
