# Exiracks — Tienda en línea

Landing de e‑commerce para **Exiracks** (Hermosillo, Sonora): catálogo completo
(maniquíes, racks, exhibidores, estantes, mesas, joyería, accesorios…), carrito,
cotización de envío por código postal, pago con **Mercado Pago** y panel de pedidos.

- **Frontend:** React + Vite + TypeScript + Tailwind + componentes estilo shadcn/ui · estado del carrito con Zustand · mobile‑first · estética oro sobre negro.
- **Backend:** Node + Express + Prisma + PostgreSQL.
- **Pagos:** Mercado Pago Checkout Pro (con **modo demo** cuando no hay credenciales, para probar en local).
- **Envíos:** módulo aislado `shippingService` con tabla de tarifas editable y mapeo CP→zona (listo para cambiar a una API de paquetería sin tocar el resto).

> Catálogo, fotos, logo y tarifas se extrajeron de los PDFs que entregaste. Los
> precios de maniquíes y muebles vienen del catálogo; los **pesos y medidas** se
> precargaron por tipo (de tu tabla de envíos) en un archivo editable —ver abajo.

---

## 1. Estructura

```
Exiracks/
├─ frontend/                 # React + Vite + Tailwind (Zustand para el carrito)
│  ├─ public/
│  │  ├─ products/           # 1 imagen por producto (recortada del catálogo)
│  │  ├─ catalog/pages/      # renders de cada página del PDF (referencia / re-recorte)
│  │  └─ brand/logo.png      # logo
│  └─ src/{pages,components,store,lib}
├─ backend/                  # Express + Prisma + PostgreSQL
│  ├─ prisma/{schema.prisma, seed.ts}
│  ├─ data/
│  │  ├─ catalog.json        # catálogo maestro (nombres, precios, categorías)
│  │  └─ productos.config.json   # ⭐ PESOS Y MEDIDAS POR PRODUCTO (editable)
│  └─ src/
│     ├─ shipping/           # ⭐ módulo de envío aislado
│     │  ├─ shippingService.ts     # interfaz pública (única que usa el resto)
│     │  ├─ tableRateProvider.ts    # implementación con tabla
│     │  ├─ shipping.config.json    # ⭐ TARIFAS + ZONAS + mapeo CP (editable)
│     │  └─ cpToZone.ts
│     ├─ routes/  services/  middleware/
│     └─ index.ts
├─ docker-compose.yml        # Postgres para local (un comando)
└─ README.md
```

---

## 2. Requisitos

- **Node.js 18+** y npm
- **PostgreSQL** (local). La forma más fácil es Docker; si ya tienes Postgres, sólo ajusta `DATABASE_URL`.

---

## 3. Correr en local (paso a paso)

### 3.1 Base de datos
Con Docker (recomendado), desde la raíz del proyecto:
```bash
docker compose up -d
```
Esto levanta Postgres en `localhost:5432` con usuario/clave/db = `exiracks`.

### 3.2 Backend
```bash
cd backend
cp .env.example .env          # en Windows PowerShell: copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:push           # crea las tablas
npm run seed                  # carga los 121 productos + 5 zonas de envío
npm run dev                   # API en http://localhost:4000
```
Verifica: abre <http://localhost:4000/api/health> → debe responder `{ ok: true, ... }`.

### 3.3 Frontend
En otra terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # tienda en http://localhost:5173
```

### 3.3‑bis (Atajo) Ver la tienda SIN base de datos
Si sólo quieres **ver la página** sin instalar Postgres, hay un servidor de
previsualización en memoria que usa el catálogo y el módulo de envío reales:
```bash
cd backend && npm install && npm run preview:nodb   # API de preview en :4000
cd frontend && npm install && npm run dev            # tienda en :5173
```
> Es sólo para previsualizar (pedidos en memoria, sin pagos reales). Para el
> flujo completo y producción usa el backend real con Postgres (pasos 3.1–3.2).

### 3.4 Probar el flujo completo SIN Mercado Pago (modo demo)
Como aún no hay credenciales de MP, el checkout corre en **modo demo**:
1. Agrega productos al carrito → **Continuar al pago**.
2. Llena tus datos y tu **código postal** (ej. `83190` Hermosillo, `06000` CDMX) → se cotiza el envío en vivo.
3. **Pagar ahora** → crea el pedido y te lleva a la confirmación.
4. En la confirmación pulsa **“Confirmar pago (demo)”** para simular el pago: el pedido pasa a *Pagado*, se descuenta stock y se “envía” el correo (en consola).

### 3.5 Panel de pedidos
- Entra a <http://localhost:5173/admin>
- Usuario/clave por defecto (de `.env`): **admin@exiracks.com / cambiame123**
- Verás los pedidos, podrás filtrarlos, **marcarlos como enviados** y agregar la **guía**.

---

## 4. Cómo funciona el envío (y cómo ajustarlo)

El costo se calcula por **peso facturable = el mayor entre el peso real y el volumétrico**:

```
peso volumétrico (kg) = (largo × ancho × alto en cm) / 5000
```

Luego se busca el rango de peso y la **zona** (resuelta desde el CP) en la tabla de tarifas.

- **Tarifas, zonas y mapeo CP → zona:** `backend/src/shipping/shipping.config.json`
  (ahí ajustas precios por rango/zona, días de entrega y a qué zona pertenece cada estado).
- **Pesos y medidas de cada producto:** `backend/data/productos.config.json`
  (mide tus cajas reales y actualiza `lengthCm/widthCm/heightCm/weightKg`; pon `_verificado: true` cuando lo confirmes). Tras editarlo, vuelve a correr `npm run seed`.

**Migrar a una API de paquetería (Skydropx / Envía / DHL):** crea una clase que
implemente la interfaz `ShippingProvider` (ver `backend/src/shipping/types.ts`) y
cámbiala en `shippingService.ts`. Nada más del sistema (rutas, checkout, frontend) cambia.

---

## 5. Deploy

### Backend → Railway
1. Crea un proyecto y agrega el plugin **PostgreSQL**.
2. Sube `/backend`. Configura las variables de entorno (sección 6) — usa la `DATABASE_URL` que da Railway.
3. Build: `npm install && npm run build && npm run prisma:generate`. Start: `npm run start`.
   (Ejecuta `npm run prisma:push` y `npm run seed` una vez para inicializar la DB.)
4. Apunta el **webhook** de Mercado Pago a `https://TU-BACKEND/api/webhooks/mercadopago`.

### Frontend → Vercel
1. Importa `/frontend`. Framework: **Vite**.
2. Variable `VITE_API_URL=https://TU-BACKEND.up.railway.app/api` y `VITE_WHATSAPP_NUMBER`.
3. Deploy.

---

## 6. Variables de entorno

Cada carpeta tiene su `.env.example` documentado. Las clave:

**backend/.env**
| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Postgres |
| `FRONTEND_URL` / `BACKEND_URL` | CORS y URLs de retorno/webhook |
| `MP_ACCESS_TOKEN` | Credencial de Mercado Pago (vacío = modo demo) |
| `BUSINESS_WHATSAPP` | WhatsApp del negocio para el link wa.me |
| `MAIL_PROVIDER` (`resend`/`smtp`/`none`) + claves | Correo de confirmación |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `JWT_SECRET` | Acceso a `/admin` |
| `IVA_RATE` | IVA que se suma sólo si piden factura (0.16) |

**frontend/.env**: `VITE_API_URL`, `VITE_WHATSAPP_NUMBER`.

---

## 7. ⚠️ PENDIENTES POR LLENAR

Lo que debes completar antes de salir a producción:

1. **Credenciales de Mercado Pago** — en `backend/.env`:
   - `MP_ACCESS_TOKEN` (panel de MP → tus integraciones). Mientras esté vacío, el checkout es modo demo (no cobra).
   - Configura el **webhook** a `/api/webhooks/mercadopago` en el panel de MP.
2. **Pesos y medidas reales** — `backend/data/productos.config.json`.
   Vienen **precargados por tipo** (maniquíes desde tu tabla; muebles con las medidas del catálogo + peso estimado). **Mide tus cajas reales** y corrige; luego `npm run seed`.
3. **Tarifas de envío reales** — `backend/src/shipping/shipping.config.json`.
   Son el **estimado** de tu PDF (Estafeta/FedEx/agregadores 2026). Confirma con tu paquetería y ajusta. *(Nota: Colima quedó en la zona Z3 por cercanía; el PDF no lo listaba.)*
4. **WhatsApp del negocio** — `BUSINESS_WHATSAPP` (backend) y `VITE_WHATSAPP_NUMBER` (frontend). Formato internacional sin “+”, ej. `526621234567`.
5. **Correo de confirmación** — define `MAIL_PROVIDER` = `resend` o `smtp` y sus claves (por defecto `none` = sólo registra en consola).
6. **Usuario y contraseña del panel** — cambia `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `JWT_SECRET`.
7. **Stock inicial** — el seed pone 8 unidades a todo (y deja `rack-360` y `sam` en 0 para demostrar el badge “Agotado”). Ajústalo a tu inventario real.
8. **Fotos de producto (opcional)** — las imágenes se recortaron automáticamente de tu catálogo PDF (`frontend/public/products/`). La mayoría quedan muy bien; en algunas páginas densas puede colarse un poco de texto o quedar un encuadre ajustado. Si quieres fotos perfectas, reemplaza el PNG de cada producto (mismo nombre de archivo) o re-recorta desde los renders en `frontend/public/catalog/pages/`.

---

## 8. Notas del catálogo

- **121 productos en 16 categorías.** Los precios mostrados son **sin IVA** (como en tu catálogo); el IVA del 16% se agrega sólo si el cliente pide factura.
- Varios precios venían cruzados en el texto del PDF; se verificaron **contra las imágenes** del catálogo (la fuente correcta).
- Disponibles en negro y dorado; fabricación a medida; imágenes ilustrativas.
