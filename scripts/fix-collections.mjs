#!/usr/bin/env node
/**
 * Audit & fix Shopify collections for the configurator.
 * 1. Lists all products and collections
 * 2. Creates 3 base-tier smart collections (Classic / Premium / Signature)
 * 3. Tags base products with tier-specific tags
 * 4. Verifies add-on products are in their collections
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
  console.error('  Then run: node -r dotenv/config scripts/fix-collections.mjs');
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
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));
  console.log('✓ Access token obtained');
  return data.access_token;
}

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

// Paginated fetch
async function fetchAll(endpoint, key) {
  let items = [];
  let url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'limit=250';
  while (url) {
    const fullUrl = `https://${STORE}/admin/api/${API_VERSION}${url}`;
    const res = await fetch(fullUrl, {
      headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    items = items.concat(data[key] || []);
    // Parse Link header for pagination
    const link = res.headers.get('link');
    if (link && link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        const nextUrl = new URL(match[1]);
        url = nextUrl.pathname.replace(`/admin/api/${API_VERSION}`, '') + nextUrl.search;
      } else {
        url = null;
      }
    } else {
      url = null;
    }
  }
  return items;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  ACCESS_TOKEN = await getAccessToken();

  // ─── 1. Fetch all products ─────────────────────────────────────────
  console.log('\n── Fetching all products ──');
  const products = await fetchAll('/products.json', 'products');
  console.log(`Found ${products.length} products total`);

  // Categorize products
  const baseProducts = [];
  const addonProducts = [];
  for (const p of products) {
    const tags = p.tags.split(',').map(t => t.trim().toLowerCase());
    if (tags.includes('configurator-base') || p.title.toLowerCase().includes('nordic elite')) {
      baseProducts.push(p);
    } else {
      addonProducts.push(p);
    }
  }
  console.log(`  Base products: ${baseProducts.length}`);
  console.log(`  Add-on products: ${addonProducts.length}`);

  // Print base products
  console.log('\n── Base Products ──');
  for (const p of baseProducts) {
    console.log(`  [${p.id}] "${p.title}" — tags: ${p.tags}`);
  }

  // Print add-on products
  console.log('\n── Add-on Products ──');
  for (const p of addonProducts) {
    console.log(`  [${p.id}] "${p.title}" — tags: ${p.tags}`);
  }

  // ─── 2. Fetch all collections ──────────────────────────────────────
  console.log('\n── Fetching all collections ──');
  const smartCollections = await fetchAll('/smart_collections.json', 'smart_collections');
  const customCollections = await fetchAll('/custom_collections.json', 'custom_collections');
  const allCollections = [...smartCollections, ...customCollections];
  console.log(`Found ${smartCollections.length} smart collections, ${customCollections.length} custom collections`);
  for (const c of allCollections) {
    console.log(`  [${c.id}] "${c.title}" (${c.rules ? 'smart' : 'custom'})`);
    if (c.rules) {
      for (const r of c.rules) {
        console.log(`    Rule: ${r.column} ${r.relation} "${r.condition}"`);
      }
    }
  }

  // ─── 3. Identify tiers for base products ───────────────────────────
  console.log('\n── Identifying tiers for base products ──');
  const tierMap = { classic: [], premium: [], signature: [] };

  for (const p of baseProducts) {
    const titleLower = p.title.toLowerCase();
    if (titleLower.includes('classic')) {
      tierMap.classic.push(p);
    } else if (titleLower.includes('premium')) {
      tierMap.premium.push(p);
    } else if (titleLower.includes('signature')) {
      tierMap.signature.push(p);
    } else {
      console.log(`  ⚠ Cannot classify: "${p.title}"`);
    }
  }

  for (const [tier, prods] of Object.entries(tierMap)) {
    console.log(`  ${tier}: ${prods.length} products`);
    for (const p of prods) console.log(`    - "${p.title}"`);
  }

  // ─── 4. Tag base products with tier-specific tags ──────────────────
  console.log('\n── Tagging base products ──');
  const tierTags = {
    classic: 'configurator-base-classic',
    premium: 'configurator-base-premium',
    signature: 'configurator-base-signature',
  };

  for (const [tier, prods] of Object.entries(tierMap)) {
    const tag = tierTags[tier];
    for (const p of prods) {
      const existingTags = p.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (existingTags.map(t => t.toLowerCase()).includes(tag)) {
        console.log(`  ✓ "${p.title}" already has tag "${tag}"`);
        continue;
      }
      // Add the tier tag + ensure configurator-base is present
      const newTags = [...new Set([...existingTags, 'configurator-base', tag])];
      const result = await shopifyRest('PUT', `/products/${p.id}.json`, {
        product: { id: p.id, tags: newTags.join(', ') }
      });
      if (result) {
        console.log(`  ✓ Tagged "${p.title}" with "${tag}"`);
      } else {
        console.log(`  ✗ Failed to tag "${p.title}"`);
      }
      await sleep(300);
    }
  }

  // ─── 5. Create base tier smart collections (if missing) ────────────
  console.log('\n── Creating base tier collections ──');
  const existingTitles = allCollections.map(c => c.title.toLowerCase());

  const tierCollections = [
    {
      title: 'Nordic Elite Classic',
      tag: 'configurator-base-classic',
      body: 'Classic tier hot tubs — all sizes and oven configurations.',
    },
    {
      title: 'Nordic Elite Premium',
      tag: 'configurator-base-premium',
      body: 'Premium tier hot tubs — all sizes and oven configurations.',
    },
    {
      title: 'Nordic Elite Signature',
      tag: 'configurator-base-signature',
      body: 'Signature tier hot tubs — all sizes and oven configurations.',
    },
  ];

  for (const tc of tierCollections) {
    if (existingTitles.includes(tc.title.toLowerCase())) {
      console.log(`  ✓ "${tc.title}" already exists`);
      continue;
    }
    const result = await shopifyRest('POST', '/smart_collections.json', {
      smart_collection: {
        title: tc.title,
        body_html: `<p>${tc.body}</p>`,
        rules: [
          { column: 'tag', relation: 'equals', condition: tc.tag }
        ],
        published: true,
        sort_order: 'best-selling',
      }
    });
    if (result?.smart_collection) {
      console.log(`  ✓ Created smart collection "${tc.title}" (id: ${result.smart_collection.id})`);
    } else {
      console.log(`  ✗ Failed to create "${tc.title}"`);
    }
    await sleep(500);
  }

  // ─── 6. Check add-on products have correct tags ────────────────────
  console.log('\n── Checking add-on product tags ──');
  const expectedAddonTags = [
    'configurator-liner', 'configurator-oven', 'configurator-oven-addon',
    'configurator-exterior', 'configurator-hydro', 'configurator-air',
    'configurator-filter', 'configurator-led', 'configurator-thermometer',
    'configurator-cover'
  ];

  const untagged = [];
  for (const p of addonProducts) {
    const tags = p.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const hasCfgTag = tags.some(t => t.startsWith('configurator-'));
    if (!hasCfgTag) {
      untagged.push(p);
      console.log(`  ⚠ "${p.title}" has NO configurator tag — tags: ${p.tags || '(none)'}`);
    }
  }

  if (untagged.length === 0) {
    console.log('  ✓ All add-on products have configurator tags');
  } else {
    console.log(`\n  ⚠ ${untagged.length} add-on products missing configurator tags`);
  }

  // ─── 7. Check add-on collections exist ─────────────────────────────
  console.log('\n── Checking add-on collections ──');
  const expectedCollections = [
    { title: 'Fiberglass Liners', tag: 'configurator-liner' },
    { title: 'Ovens', tag: 'configurator-oven' },
    { title: 'Oven Add-ons', tag: 'configurator-oven-addon' },
    { title: 'Exterior Panels', tag: 'configurator-exterior' },
    { title: 'Hydro Massage', tag: 'configurator-hydro' },
    { title: 'Air System', tag: 'configurator-air' },
    { title: 'Filter System', tag: 'configurator-filter' },
    { title: 'LED Lighting', tag: 'configurator-led' },
    { title: 'Thermometer', tag: 'configurator-thermometer' },
    { title: 'Covers', tag: 'configurator-cover' },
  ];

  const missingCollections = [];
  for (const ec of expectedCollections) {
    const found = allCollections.find(c => {
      if (c.rules) {
        return c.rules.some(r => r.condition === ec.tag);
      }
      return c.title.toLowerCase() === ec.title.toLowerCase();
    });
    if (found) {
      console.log(`  ✓ "${ec.title}" exists (id: ${found.id})`);
    } else {
      missingCollections.push(ec);
      console.log(`  ✗ "${ec.title}" MISSING`);
    }
  }

  // Create any missing add-on collections
  if (missingCollections.length > 0) {
    console.log(`\n── Creating ${missingCollections.length} missing add-on collections ──`);
    for (const mc of missingCollections) {
      const result = await shopifyRest('POST', '/smart_collections.json', {
        smart_collection: {
          title: mc.title,
          rules: [
            { column: 'tag', relation: 'equals', condition: mc.tag }
          ],
          published: true,
          sort_order: 'best-selling',
        }
      });
      if (result?.smart_collection) {
        console.log(`  ✓ Created "${mc.title}" (id: ${result.smart_collection.id})`);
      } else {
        console.log(`  ✗ Failed to create "${mc.title}"`);
      }
      await sleep(500);
    }
  }

  // ─── 8. Final verification ─────────────────────────────────────────
  console.log('\n── Final verification ──');
  const finalCollections = await fetchAll('/smart_collections.json', 'smart_collections');
  console.log(`\nAll smart collections (${finalCollections.length}):`);
  for (const c of finalCollections) {
    // Count products in collection
    const collects = await shopifyRest('GET', `/smart_collections/${c.id}/products.json?limit=250`);
    const count = collects?.products?.length || 0;
    console.log(`  [${c.id}] "${c.title}" — ${count} products`);
    if (count > 0) {
      for (const p of collects.products) {
        console.log(`    - "${p.title}"`);
      }
    }
    await sleep(300);
  }

  console.log('\n✓ Done!');
}

main().catch(console.error);
