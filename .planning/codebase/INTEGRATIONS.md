# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**Shopify Admin API:**
- Provisioning configurator products, metafields, and collections
  - SDK/Client: Native Node.js `fetch` API
  - Auth: OAuth2 client credentials (hardcoded in scripts)
  - Endpoints used:
    - `POST /admin/oauth/access_token` - Token acquisition
    - `POST /products.json` - Create products
    - `POST /metafield_definitions.json` (GraphQL) - Define metafield schemas
    - `POST /collections.json` - Create smart collections
    - `GET /products.json` - List products
    - `GET /smart_collections.json`, `GET /custom_collections.json` - List collections
  - Rate limiting: 2 requests/second enforced via `delay(550)` in `scripts/setup-configurator.mjs`

**Shopify Storefront API:**
- Implicit integration via Liquid templating
- Product data loaded via `product`, `collection`, `shop` globals
- Cart operations via Shopify's native form submission

**GSAP Animation Library:**
- CDN: `https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js`
- Version: 3.x
- Plugins: ScrollTrigger (`https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js`)
- Loaded in `layout/theme.liquid` (lines 63-64)
- Used for: Smooth scroll animations, section reveal effects

## Data Storage

**Databases:**
- Shopify Product Database (managed)
  - Connection: Via Shopify Admin & Storefront APIs
  - Client: Native REST/GraphQL via fetch

**Metafields:**
- Namespace: `configurator` - Custom metafields for configurator products
- Key metafields:
  - `step` (number) - Which configurator step (1-15)
  - `input_type` (text) - UI control type (dropdown, checkbox, card, quantity)
  - `depends_on` (text) - Parent option dependency
  - `default_qty`, `min_qty`, `max_qty` (numbers) - Quantity options
  - `info_tooltip` (text) - Help text
  - `sort_order` (number) - Display order
  - `is_default` (boolean) - Default selection flag
  - `oven_type` (text) - External/internal for oven products
- Defined via GraphQL mutation in `scripts/setup-configurator.mjs` (lines 82-127)

**File Storage:**
- Local filesystem only
- `generated-images/` directory - Product preview images for configurator
- Theme assets (`assets/` directory) served via Shopify CDN

**Caching:**
- Not detected - No caching service (Redis, Memcached)
- Browser caching via HTTP headers (managed by Shopify)

## Authentication & Identity

**Auth Provider:**
- Shopify OAuth2 - For admin API access
- Flow: Client credentials (hardcoded CLIENT_ID and CLIENT_SECRET in scripts)
- Token endpoint: `https://{STORE}/admin/oauth/access_token`
- Token stored in: Memory variable `ACCESS_TOKEN` during script execution

**Session Management:**
- Shopify-managed customer sessions
- No custom session handling

## Monitoring & Observability

**Error Tracking:**
- Not detected - No third-party error tracking service

**Logs:**
- Console output only - Scripts log progress via `console.log()` and `console.error()`
- Client-side errors logged to browser console (no remote logging)

## CI/CD & Deployment

**Hosting:**
- Shopify - Managed hosting
- Store domain: `aurowe-2.myshopify.com`
- Theme deployed via Shopify CLI (`shopify theme push`)

**CI Pipeline:**
- Not detected - No automated CI/CD workflow (GitHub Actions, etc.)

## Environment Configuration

**Required env vars:**
- `STORE` - Shopify store domain (hardcoded in scripts as `aurowe-2.myshopify.com`)
- `CLIENT_ID` - Shopify API app client ID (hardcoded in scripts)
- `CLIENT_SECRET` - Shopify API app secret (hardcoded in scripts)

**Secrets location:**
- `.env` file - Contains environment configuration
- Script credentials: Hardcoded in `scripts/setup-configurator.mjs` and `scripts/fix-collections.mjs`
- Shop currency: Injected to browser as `window.__shopCurrency` (line 62 in `layout/theme.liquid`)

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook listeners defined

**Outgoing:**
- Not detected - No outbound webhooks configured

## Third-party Integrations

**CDN:**
- jsDelivr - Hosts GSAP library
- Shopify CDN - Serves theme assets, product images, fonts

**Fonts:**
- Shopify Font API - Plus Jakarta Sans (default fonts specified in `config/settings_schema.json`)
- Font face definitions injected via `{{ settings.font_heading | font_face }}` (line 39, `layout/theme.liquid`)

## Client-Side Data Exchanges

**Product Data Serialization:**
- `snippets/configurator-product-json.liquid` - Converts Shopify product data (including metafields) to JSON
- JSON embedded in DOM as `<script type="application/json" data-configurator-products>`
- Read by `assets/configurator.js` and parsed at component initialization (line 40)

**Cart Operations:**
- Native Shopify form submission (no custom API)
- Form POST to `/cart/add.js` with variant IDs and quantities
- Add to cart button in configurator (`data-add-to-cart`) handles form submission

---

*Integration audit: 2026-02-20*
