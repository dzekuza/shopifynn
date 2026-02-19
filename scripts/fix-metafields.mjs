#!/usr/bin/env node
/**
 * Fix missing metafields on integrated oven products that were rate-limited.
 */

const STORE = process.env.SHOPIFY_STORE || 'aurowe-2.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

// Validate required credentials are present
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing required environment variables.');
  console.error('  SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set.');
  console.error('  Copy .env.example to .env and fill in your credentials.');
  console.error('  Then run: node -r dotenv/config scripts/fix-metafields.mjs');
  process.exit(1);
}

let ACCESS_TOKEN = '';

async function getAccessToken() {
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function shopifyRest(method, endpoint, body = null) {
  const url = `https://${STORE}/admin/api/${API_VERSION}${endpoint}`;
  const opts = {
    method,
    headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (data.errors) {
    console.error(`  ✗ ${method} ${endpoint}:`, JSON.stringify(data.errors));
    return null;
  }
  return data;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Products that need metafield repair
const INTEGRATED_PRODUCTS = [
  { handle: 'nordic-elite-xl-classic-i', sourceHandle: 'nordic-elite-xl-classic', size: 'XL', tier: 'Classic' },
  { handle: 'nordic-elite-l-classic-i', sourceHandle: 'nordic-elite-l-classic', size: 'L', tier: 'Classic' },
  { handle: 'nordic-elite-xl-premium-i', sourceHandle: 'nordic-elite-xl-premium', size: 'XL', tier: 'Premium' },
  { handle: 'nordic-elite-l-premium-i', sourceHandle: 'nordic-elite-l-premium', size: 'L', tier: 'Premium' },
  { handle: 'nordic-elite-xl-signature-i', sourceHandle: 'nordic-elite-xl-signature', size: 'XL', tier: 'Signature' },
  { handle: 'nordic-elite-l-signature-i', sourceHandle: 'nordic-elite-l-signature', size: 'L', tier: 'Signature' },
];

async function main() {
  ACCESS_TOKEN = await getAccessToken();
  console.log('✓ Access token obtained\n');

  for (const prod of INTEGRATED_PRODUCTS) {
    // Get product
    const pData = await shopifyRest('GET', `/products.json?handle=${prod.handle}&fields=id,title`);
    if (!pData?.products?.length) { console.error(`  ✗ Not found: ${prod.handle}`); continue; }
    const product = pData.products[0];

    // Get existing metafields
    const mfData = await shopifyRest('GET', `/products/${product.id}/metafields.json`);
    const existing = new Set((mfData?.metafields || []).map(m => `${m.namespace}.${m.key}`));
    await sleep(600);

    // Get source metafields
    const srcData = await shopifyRest('GET', `/products.json?handle=${prod.sourceHandle}&fields=id`);
    if (!srcData?.products?.length) continue;
    const srcMfData = await shopifyRest('GET', `/products/${srcData.products[0].id}/metafields.json`);
    const srcMetafields = srcMfData?.metafields || [];
    await sleep(600);

    console.log(`${product.title} — has ${existing.size} metafields, source has ${srcMetafields.length}`);

    // Apply missing metafields
    let added = 0;
    for (const mf of srcMetafields) {
      const key = `${mf.namespace}.${mf.key}`;
      if (existing.has(key)) continue;

      let value = mf.value;
      if (mf.key === 'oven_description') {
        value = 'Integrated wood-fired oven with chimney protection, glass door, and metal strips';
      }
      if (mf.namespace === 'global' && mf.key === 'title_tag') {
        value = `${product.title} | Integrated Oven Wood-Fired Hot Tub`;
      }
      if (mf.namespace === 'global' && mf.key === 'description_tag') {
        value = value.replace(/hot tub/i, 'hot tub with integrated wood-fired oven');
      }

      await sleep(600);
      const result = await shopifyRest('POST', `/products/${product.id}/metafields.json`, {
        metafield: { namespace: mf.namespace, key: mf.key, value, type: mf.type }
      });
      if (result) added++;
    }

    // Ensure oven_type = integrated
    if (!existing.has('custom.oven_type')) {
      await sleep(600);
      await shopifyRest('POST', `/products/${product.id}/metafields.json`, {
        metafield: { namespace: 'custom', key: 'oven_type', value: 'integrated', type: 'single_line_text_field' }
      });
      added++;
    }

    // Ensure configurator_size
    if (!existing.has('custom.configurator_size')) {
      await sleep(600);
      await shopifyRest('POST', `/products/${product.id}/metafields.json`, {
        metafield: { namespace: 'custom', key: 'configurator_size', value: JSON.stringify([prod.size]), type: 'list.single_line_text_field' }
      });
      added++;
    }

    // Ensure configurator_tier
    if (!existing.has('custom.configurator_tier')) {
      await sleep(600);
      await shopifyRest('POST', `/products/${product.id}/metafields.json`, {
        metafield: { namespace: 'custom', key: 'configurator_tier', value: JSON.stringify([prod.tier]), type: 'list.single_line_text_field' }
      });
      added++;
    }

    console.log(`  ✓ Added ${added} missing metafields\n`);
    await sleep(1000);
  }

  console.log('Done!');
}

main().catch(e => console.error(e));
