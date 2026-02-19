#!/usr/bin/env node
/**
 * Update existing hot tub prices and create missing integrated oven ("I") products.
 * Prices are EUR with 21% VAT included.
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
  console.error('  Then run: node -r dotenv/config scripts/update-products.mjs');
  process.exit(1);
}

let ACCESS_TOKEN = '';

// ─── Auth ───────────────────────────────────────────────────────────
async function getAccessToken() {
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data));
  console.log('✓ Access token obtained');
  return data.access_token;
}

// ─── API helpers ────────────────────────────────────────────────────
async function shopifyRest(method, endpoint, body = null) {
  const url = `https://${STORE}/admin/api/${API_VERSION}${endpoint}`;
  const opts = {
    method,
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
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

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await res.json();
  if (data.errors) {
    console.error('  ✗ GraphQL errors:', JSON.stringify(data.errors, null, 2));
    return null;
  }
  return data.data;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Price updates for existing products ────────────────────────────
// Prices are EUR with 21% VAT
const PRICE_UPDATES = {
  'nordic-elite-xl-classic':    '4970.00',
  'nordic-elite-l-classic':     '4280.00',
  'nordic-elite-m-classic':     '4050.00',
  'nordic-elite-xl-premium':    '5500.00',
  'nordic-elite-l-premium':     '4780.00',
  'nordic-elite-m-premium':     '4470.00',
  'nordic-elite-xl-signature':  '8180.00',
  'nordic-elite-l-signature':   '7220.00',
  'nordic-elite-m-signature':   '6550.00',
};

// ─── New integrated oven products to create ─────────────────────────
const NEW_PRODUCTS = [
  // Classic I
  {
    title: 'Nordic Elite XL Classic I',
    handle: 'nordic-elite-xl-classic-i',
    sourceHandle: 'nordic-elite-xl-classic',
    price: '4960.00',
    size: 'XL',
    tier: 'Classic',
    ovenType: 'integrated',
  },
  {
    title: 'Nordic Elite L Classic I',
    handle: 'nordic-elite-l-classic-i',
    sourceHandle: 'nordic-elite-l-classic',
    price: '4500.00',
    size: 'L',
    tier: 'Classic',
    ovenType: 'integrated',
  },
  // Premium I
  {
    title: 'Nordic Elite XL Premium I',
    handle: 'nordic-elite-xl-premium-i',
    sourceHandle: 'nordic-elite-xl-premium',
    price: '5320.00',
    size: 'XL',
    tier: 'Premium',
    ovenType: 'integrated',
  },
  {
    title: 'Nordic Elite L Premium I',
    handle: 'nordic-elite-l-premium-i',
    sourceHandle: 'nordic-elite-l-premium',
    price: '4870.00',
    size: 'L',
    tier: 'Premium',
    ovenType: 'integrated',
  },
  // Signature I
  {
    title: 'Nordic Elite XL Signature I',
    handle: 'nordic-elite-xl-signature-i',
    sourceHandle: 'nordic-elite-xl-signature',
    price: '7790.00',
    size: 'XL',
    tier: 'Signature',
    ovenType: 'integrated',
  },
  {
    title: 'Nordic Elite L Signature I',
    handle: 'nordic-elite-l-signature-i',
    sourceHandle: 'nordic-elite-l-signature',
    price: '7100.00',
    size: 'L',
    tier: 'Signature',
    ovenType: 'integrated',
  },
];

// ─── Step 1: Update prices on existing products (REST API) ──────────
async function updateExistingPrices() {
  console.log('\n═══ STEP 1: Updating existing product prices ═══\n');

  for (const [handle, newPrice] of Object.entries(PRICE_UPDATES)) {
    // Get product by handle via REST
    const data = await shopifyRest('GET', `/products.json?handle=${handle}&fields=id,title,variants`);

    if (!data || !data.products || data.products.length === 0) {
      console.error(`  ✗ Product not found: ${handle}`);
      continue;
    }

    const product = data.products[0];
    console.log(`  ${product.title} (current: €${product.variants[0]?.price} → new: €${newPrice})`);

    // Update each variant price via REST
    for (const variant of product.variants) {
      const result = await shopifyRest('PUT', `/variants/${variant.id}.json`, {
        variant: { id: variant.id, price: newPrice }
      });

      if (!result) {
        console.error(`    ✗ Failed to update variant ${variant.title}`);
      }
    }
    console.log(`    ✓ All variants updated to €${newPrice}`);
    await sleep(500);
  }
}

// ─── Step 2: Create new integrated oven products ────────────────────
async function createIntegratedProducts() {
  console.log('\n═══ STEP 2: Creating integrated oven (I) products ═══\n');

  for (const newProd of NEW_PRODUCTS) {
    // First check if it already exists
    const existing = await shopifyGraphQL(`{
      productByHandle(handle: "${newProd.handle}") { id title }
    }`);

    if (existing?.productByHandle) {
      console.log(`  ⏭ Already exists: ${newProd.title} — skipping`);
      continue;
    }

    // Get source product for metafields and variant structure via REST + GraphQL
    const sourceRest = await shopifyRest('GET', `/products.json?handle=${newProd.sourceHandle}&fields=id,title,body_html,product_type,vendor,variants`);
    if (!sourceRest || !sourceRest.products || sourceRest.products.length === 0) {
      console.error(`  ✗ Source not found: ${newProd.sourceHandle}`);
      continue;
    }
    const sourceProduct = sourceRest.products[0];

    // Get metafields via REST
    const mfData = await shopifyRest('GET', `/products/${sourceProduct.id}/metafields.json`);
    const sourceMetafields = mfData?.metafields || [];

    const sourceData = {
      productByHandle: {
        id: sourceProduct.id,
        title: sourceProduct.title,
        descriptionHtml: sourceProduct.body_html,
        productType: sourceProduct.product_type,
        vendor: sourceProduct.vendor,
        variants: { edges: sourceProduct.variants.map(v => ({ node: { title: v.title, sku: v.sku } })) },
        metafields: { edges: sourceMetafields.map(m => ({ node: { namespace: m.namespace, key: m.key, value: m.value, type: m.type } })) },
      }
    };

    if (!sourceData?.productByHandle) {
      console.error(`  ✗ Source not found: ${newProd.sourceHandle}`);
      continue;
    }

    const source = sourceData.productByHandle;
    console.log(`  Creating ${newProd.title} (based on ${source.title})...`);

    // Build variant data from source — use option1 for variant option value
    const variants = source.variants.edges.map(({ node: v }) => {
      const sku = v.sku ? v.sku.replace(/(CL|PR|SG)-/, '$1I-') : '';
      return {
        option1: v.title,
        price: newProd.price,
        sku: sku || undefined,
      };
    });

    // Build tags
    const sizeTag = `step-1-${newProd.size.toLowerCase()}`;
    const tierLower = newProd.tier.toLowerCase();
    const tags = [
      newProd.tier,
      'configurator',
      'configurator-base',
      `configurator-base-${tierLower}`,
      'Hot Tub',
      newProd.size,
      'Nordic Elite',
      sizeTag,
      'integrated-oven',
    ].join(', ');

    // Adjust description for integrated oven
    const ovenNote = 'with integrated wood-fired oven';
    const descriptionHtml = source.descriptionHtml
      ? source.descriptionHtml.replace(/wood-fired/i, 'integrated wood-fired')
      : `<p>${newProd.title} — Nordic hot tub ${ovenNote}.</p>`;

    // Create product via REST API
    const productPayload = {
      product: {
        title: newProd.title,
        handle: newProd.handle,
        body_html: descriptionHtml,
        vendor: source.vendor,
        product_type: source.productType,
        tags: tags,
        status: 'active',
        options: [{ name: 'Color' }],
        variants: variants,
      }
    };
    console.log('    Payload variants:', JSON.stringify(variants, null, 2));

    const created = await shopifyRest('POST', '/products.json', productPayload);

    if (!created || !created.product) {
      console.error(`    ✗ Failed to create ${newProd.title}`);
      continue;
    }

    const productId = created.product.id;
    console.log(`    ✓ Created product ID: ${productId}`);

    // Set metafields — copy from source with adjusted oven_description
    const metafields = [];
    for (const { node: mf } of source.metafields.edges) {
      let value = mf.value;

      // Adjust oven_description for integrated
      if (mf.key === 'oven_description') {
        value = 'Integrated wood-fired oven with chimney protection, glass door, and metal strips';
      }

      // Adjust title_tag
      if (mf.namespace === 'global' && mf.key === 'title_tag') {
        value = `${newProd.title} | Integrated Oven Wood-Fired Hot Tub`;
      }

      // Adjust description_tag
      if (mf.namespace === 'global' && mf.key === 'description_tag') {
        value = value.replace(/hot tub/i, 'hot tub with integrated wood-fired oven');
      }

      metafields.push({
        namespace: mf.namespace,
        key: mf.key,
        value: value,
        type: mf.type,
      });
    }

    // Ensure configurator metafields are set
    const hasConfigSize = metafields.some(m => m.namespace === 'custom' && m.key === 'configurator_size');
    const hasConfigTier = metafields.some(m => m.namespace === 'custom' && m.key === 'configurator_tier');

    if (!hasConfigSize) {
      metafields.push({ namespace: 'custom', key: 'configurator_size', value: JSON.stringify([newProd.size]), type: 'list.single_line_text_field' });
    }
    if (!hasConfigTier) {
      metafields.push({ namespace: 'custom', key: 'configurator_tier', value: JSON.stringify([newProd.tier]), type: 'list.single_line_text_field' });
    }

    // Add oven_type metafield
    metafields.push({ namespace: 'custom', key: 'oven_type', value: 'integrated', type: 'single_line_text_field' });

    // Set metafields via REST
    for (const mf of metafields) {
      await shopifyRest('POST', `/products/${productId}/metafields.json`, {
        metafield: {
          namespace: mf.namespace,
          key: mf.key,
          value: mf.value,
          type: mf.type,
        }
      });
    }
    console.log(`    ✓ Set ${metafields.length} metafields`);

    await sleep(1000); // rate limiting
  }
}

// ─── Step 3: Also add oven_type metafield to existing external products ──
async function tagExternalOvenProducts() {
  console.log('\n═══ STEP 3: Tagging existing products as external oven ═══\n');

  for (const handle of Object.keys(PRICE_UPDATES)) {
    const data = await shopifyGraphQL(`{
      productByHandle(handle: "${handle}") {
        id
        title
        metafields(first: 50) {
          edges {
            node { namespace key value }
          }
        }
      }
    }`);

    if (!data?.productByHandle) continue;

    const product = data.productByHandle;
    const hasOvenType = product.metafields.edges.some(
      ({ node: m }) => m.namespace === 'custom' && m.key === 'oven_type'
    );

    if (hasOvenType) {
      console.log(`  ⏭ ${product.title} already has oven_type — skipping`);
      continue;
    }

    // Extract numeric ID from GID
    const numericId = product.id.split('/').pop();
    await shopifyRest('POST', `/products/${numericId}/metafields.json`, {
      metafield: {
        namespace: 'custom',
        key: 'oven_type',
        value: 'external',
        type: 'single_line_text_field',
      }
    });
    console.log(`  ✓ ${product.title} → oven_type: external`);
    await sleep(300);
  }
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  ACCESS_TOKEN = await getAccessToken();

  await updateExistingPrices();
  await createIntegratedProducts();
  await tagExternalOvenProducts();

  console.log('\n═══ DONE ═══');
  console.log('Summary:');
  console.log(`  • Updated prices on ${Object.keys(PRICE_UPDATES).length} existing products`);
  console.log(`  • Created ${NEW_PRODUCTS.length} new integrated oven products`);
  console.log(`  • Tagged existing products with oven_type: external`);
}

main().catch(e => console.error(e));
