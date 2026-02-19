#!/usr/bin/env node
const STORE = process.env.SHOPIFY_STORE || 'aurowe-2.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

// Validate required credentials are present
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing required environment variables.');
  console.error('  SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set.');
  console.error('  Copy .env.example to .env and fill in your credentials.');
  console.error('  Then run: node -r dotenv/config scripts/list-products.mjs');
  process.exit(1);
}

async function run() {
  const authRes = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  });
  const authData = await authRes.json();
  if (!authData.access_token) {
    console.error('Auth failed:', JSON.stringify(authData));
    return;
  }
  const TOKEN = authData.access_token;
  console.log('Access token obtained. Scopes:', authData.scope);
  console.log('---\n');

  const query = `{
    products(first: 50) {
      edges {
        node {
          id
          title
          handle
          status
          productType
          vendor
          tags
          variants(first: 20) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
              }
            }
          }
          metafields(first: 50) {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    }
  }`;

  const gqlRes = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  const gqlData = await gqlRes.json();

  if (gqlData.errors) {
    console.error('GraphQL errors:', JSON.stringify(gqlData.errors, null, 2));
    return;
  }

  const products = gqlData.data.products.edges;
  console.log(`Found ${products.length} products:\n`);

  for (const { node: p } of products) {
    console.log('═══════════════════════════════════════════');
    console.log(`PRODUCT: ${p.title}`);
    console.log(`  ID:     ${p.id}`);
    console.log(`  Handle: ${p.handle}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Type:   ${p.productType || '(none)'}`);
    console.log(`  Vendor: ${p.vendor || '(none)'}`);
    console.log(`  Tags:   ${p.tags.length ? p.tags.join(', ') : '(none)'}`);

    console.log(`  Variants (${p.variants.edges.length}):`);
    for (const { node: v } of p.variants.edges) {
      console.log(`    - ${v.title} | $${v.price} | SKU: ${v.sku || 'n/a'} | Qty: ${v.inventoryQuantity}`);
    }

    console.log(`  Metafields (${p.metafields.edges.length}):`);
    if (p.metafields.edges.length === 0) {
      console.log('    (none)');
    } else {
      for (const { node: m } of p.metafields.edges) {
        const val = m.value.length > 200 ? m.value.substring(0, 200) + '...' : m.value;
        console.log(`    - ${m.namespace}.${m.key} [${m.type}] = ${val}`);
      }
    }
    console.log('');
  }
}

run().catch(e => console.error(e));
