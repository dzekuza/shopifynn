#!/usr/bin/env node
/**
 * Shopify Configurator Setup Script
 * Creates all add-on products, metafield definitions, and collections
 * for the Nordic Elite Hot Tub configurator.
 *
 * Usage: node scripts/setup-configurator.mjs
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
  console.error('  Then run: node -r dotenv/config scripts/setup-configurator.mjs');
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
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));
  console.log('✓ Access token obtained, scopes:', data.scope);
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
  const url = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error('  ✗ GraphQL errors:', JSON.stringify(data.errors));
  }
  return data;
}

async function createProduct(productData) {
  const result = await shopifyRest('POST', '/products.json', { product: productData });
  if (result?.product) {
    console.log(`  ✓ Created: ${result.product.title} (${result.product.variants.length} variants)`);
    return result.product;
  }
  return null;
}

// Rate limit helper — Shopify allows ~2 requests/second for REST
async function delay(ms = 550) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Metafield Definitions ──────────────────────────────────────────
async function createMetafieldDefinitions() {
  console.log('\n══ Creating Metafield Definitions ══');

  const definitions = [
    { name: 'Configurator Step', namespace: 'configurator', key: 'step', type: 'number_integer', description: 'Which configurator step this product belongs to (1-15)' },
    { name: 'Input Type', namespace: 'configurator', key: 'input_type', type: 'single_line_text_field', description: 'UI control type: dropdown, checkbox, card, quantity' },
    { name: 'Depends On', namespace: 'configurator', key: 'depends_on', type: 'single_line_text_field', description: 'Parent option dependency (e.g. "external" for external oven sub-options)' },
    { name: 'Default Quantity', namespace: 'configurator', key: 'default_qty', type: 'number_integer', description: 'Default quantity for quantity-selectable items' },
    { name: 'Min Quantity', namespace: 'configurator', key: 'min_qty', type: 'number_integer', description: 'Minimum selectable quantity' },
    { name: 'Max Quantity', namespace: 'configurator', key: 'max_qty', type: 'number_integer', description: 'Maximum selectable quantity' },
    { name: 'Info Tooltip', namespace: 'configurator', key: 'info_tooltip', type: 'multi_line_text_field', description: 'Tooltip/help text shown on hover or click' },
    { name: 'Sort Order', namespace: 'configurator', key: 'sort_order', type: 'number_integer', description: 'Display order within a step' },
    { name: 'Is Default', namespace: 'configurator', key: 'is_default', type: 'boolean', description: 'Whether this option is selected by default' },
    { name: 'Oven Type', namespace: 'configurator', key: 'oven_type', type: 'single_line_text_field', description: 'external or internal — for oven products' },
  ];

  for (const def of definitions) {
    const mutation = `
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id name }
          userErrors { field message }
        }
      }
    `;
    const variables = {
      definition: {
        name: def.name,
        namespace: def.namespace,
        key: def.key,
        type: def.type,
        description: def.description,
        ownerType: 'PRODUCT',
      }
    };
    const result = await shopifyGraphQL(mutation, variables);
    const created = result?.data?.metafieldDefinitionCreate?.createdDefinition;
    const errors = result?.data?.metafieldDefinitionCreate?.userErrors || [];
    if (created) {
      console.log(`  ✓ Metafield: ${def.namespace}.${def.key}`);
    } else if (errors.length > 0) {
      // Already exists is OK
      const msg = errors.map(e => e.message).join(', ');
      if (msg.includes('already exists') || msg.includes('taken')) {
        console.log(`  ~ Metafield: ${def.namespace}.${def.key} (already exists)`);
      } else {
        console.error(`  ✗ Metafield ${def.namespace}.${def.key}: ${msg}`);
      }
    }
    await delay(300);
  }
}

// ─── Product Definitions ────────────────────────────────────────────
function getConfiguratorProducts() {
  return [
    // ── Step 2: Fiberglass Liners ──
    {
      title: 'Fiberglass Liner - Solid Color',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-liner, step-2',
      status: 'active',
      options: [{ name: 'Color' }],
      variants: [
        { option1: 'White', price: '0.00', sku: 'LINER-SOLID-WHITE' },
        { option1: 'Blue', price: '0.00', sku: 'LINER-SOLID-BLUE' },
        { option1: 'Gray', price: '0.00', sku: 'LINER-SOLID-GRAY' },
        { option1: 'Custom RAL', price: '200.00', sku: 'LINER-SOLID-RAL' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '2', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'Fiberglass Liner - Pearl Collection',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-liner, step-2',
      status: 'active',
      options: [{ name: 'Color' }],
      variants: [
        { option1: 'Azure Pearl', price: '0.00', sku: 'LINER-PEARL-AZURE' },
        { option1: 'Ivory Pearl', price: '0.00', sku: 'LINER-PEARL-IVORY' },
        { option1: 'Silver Pearl', price: '0.00', sku: 'LINER-PEARL-SILVER' },
        { option1: 'Midnight Pearl', price: '0.00', sku: 'LINER-PEARL-MIDNIGHT' },
        { option1: 'Custom RAL', price: '200.00', sku: 'LINER-PEARL-RAL' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '2', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },
    {
      title: 'Fiberglass Liner - Granite Collection',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-liner, step-2',
      status: 'active',
      options: [{ name: 'Color' }],
      variants: [
        { option1: 'Crystal Granite', price: '0.00', sku: 'LINER-GRANITE-CRYSTAL' },
        { option1: 'Glacier Granite', price: '0.00', sku: 'LINER-GRANITE-GLACIER' },
        { option1: 'Arctic Granite', price: '0.00', sku: 'LINER-GRANITE-ARCTIC' },
        { option1: 'Custom RAL', price: '200.00', sku: 'LINER-GRANITE-RAL' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '2', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '3', type: 'number_integer' },
      ]
    },

    // ── Step 3: Hot Tub Insulation ──
    {
      title: 'Hot Tub Insulation',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-addon, step-3',
      status: 'active',
      variants: [
        { price: '350.00', sku: 'INSULATION-UPGRADE' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '3', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'checkbox', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'Additional foam insulation layer for improved heat retention and energy efficiency.', type: 'multi_line_text_field' },
      ]
    },

    // ── Step 4: Ovens — External ──
    {
      title: 'External Oven 50cm (24 kW)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-oven, configurator-oven-external, step-4',
      status: 'active',
      body_html: 'Standard configuration: steel 1.5 mm',
      options: [{ name: 'Steel Grade' }],
      variants: [
        { option1: 'AISI 304', price: '0.00', sku: 'OVEN-EXT-50-304' },
        { option1: 'AISI 316', price: '150.00', sku: 'OVEN-EXT-50-316' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '4', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'oven_type', value: 'external', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'AISI 304: Standard stainless steel, excellent corrosion resistance.\nAISI 316: Marine-grade stainless steel with superior corrosion resistance, ideal for harsh environments.', type: 'multi_line_text_field' },
      ]
    },
    {
      title: 'External Oven 75cm (30 kW)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-oven, configurator-oven-external, step-4',
      status: 'active',
      body_html: 'Standard configuration: steel 2 mm',
      options: [{ name: 'Steel Grade' }],
      variants: [
        { option1: 'AISI 304', price: '0.00', sku: 'OVEN-EXT-75-304' },
        { option1: 'AISI 316', price: '200.00', sku: 'OVEN-EXT-75-316' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '4', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'oven_type', value: 'external', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
        { namespace: 'configurator', key: 'is_default', value: 'true', type: 'boolean' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'AISI 304: Standard stainless steel, excellent corrosion resistance.\nAISI 316: Marine-grade stainless steel with superior corrosion resistance, ideal for harsh environments.', type: 'multi_line_text_field' },
      ]
    },
    {
      title: 'External Oven 100cm (35 kW)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-oven, configurator-oven-external, step-4',
      status: 'active',
      body_html: 'Standard configuration: steel 2 mm',
      options: [{ name: 'Steel Grade' }],
      variants: [
        { option1: 'AISI 304', price: '0.00', sku: 'OVEN-EXT-100-304' },
        { option1: 'AISI 316', price: '250.00', sku: 'OVEN-EXT-100-316' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '4', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'oven_type', value: 'external', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '3', type: 'number_integer' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'AISI 304: Standard stainless steel, excellent corrosion resistance.\nAISI 316: Marine-grade stainless steel with superior corrosion resistance, ideal for harsh environments.', type: 'multi_line_text_field' },
      ]
    },

    // ── Step 4: Ovens — Internal ──
    {
      title: 'Internal Oven 30 kW',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-oven, configurator-oven-internal, step-4',
      status: 'active',
      options: [{ name: 'Steel Grade' }, { name: 'Steel Thickness' }],
      variants: [
        { option1: 'AISI 304', option2: '1.5 mm', price: '0.00', sku: 'OVEN-INT-304-15' },
        { option1: 'AISI 304', option2: '2 mm', price: '100.00', sku: 'OVEN-INT-304-20' },
        { option1: 'AISI 316', option2: '1.5 mm', price: '150.00', sku: 'OVEN-INT-316-15' },
        { option1: 'AISI 316', option2: '2 mm', price: '250.00', sku: 'OVEN-INT-316-20' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '4', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'oven_type', value: 'internal', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '4', type: 'number_integer' },
      ]
    },

    // ── Step 4: Oven Add-ons ──
    {
      title: 'Oven Door with Glass',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-oven-addon, step-4',
      status: 'active',
      variants: [
        { price: '120.00', sku: 'OVEN-ADDON-GLASS-DOOR' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '4', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'checkbox', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'depends_on', value: 'oven', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '10', type: 'number_integer' },
      ]
    },
    {
      title: 'Chimney with Heat Protection',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-oven-addon, step-4',
      status: 'active',
      variants: [
        { price: '80.00', sku: 'OVEN-ADDON-CHIMNEY' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '4', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'checkbox', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'depends_on', value: 'oven', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '11', type: 'number_integer' },
      ]
    },

    // ── Step 5: Exterior Panels ──
    {
      title: 'Exterior Panel - Natural Spruce Wood',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-exterior, step-5',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'EXT-NATURAL-SPRUCE' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '5', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'Exterior Panel - Painted Spruce Wood',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-exterior, step-5',
      status: 'active',
      options: [{ name: 'Color' }],
      variants: [
        { option1: 'RAL 7016 Anthracite Grey', price: '0.00', sku: 'EXT-PAINT-7016' },
        { option1: 'RAL 9005 Jet Black', price: '0.00', sku: 'EXT-PAINT-9005' },
        { option1: 'RAL 8017 Chocolate Brown', price: '0.00', sku: 'EXT-PAINT-8017' },
        { option1: 'RAL 6009 Fir Green', price: '0.00', sku: 'EXT-PAINT-6009' },
        { option1: 'RAL 7035 Light Grey', price: '0.00', sku: 'EXT-PAINT-7035' },
        { option1: 'RAL 9010 Pure White', price: '0.00', sku: 'EXT-PAINT-9010' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '5', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },
    {
      title: 'Exterior Panel - WPC (Wood Plastic Composite)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-exterior, step-5',
      status: 'active',
      options: [{ name: 'Color' }],
      variants: [
        { option1: 'Grey', price: '0.00', sku: 'EXT-WPC-GREY' },
        { option1: 'Brown', price: '0.00', sku: 'EXT-WPC-BROWN' },
        { option1: 'Black', price: '0.00', sku: 'EXT-WPC-BLACK' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '5', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '3', type: 'number_integer' },
      ]
    },
    {
      title: 'Exterior Panel - Thermal Wood',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-exterior, step-5',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'EXT-THERMAL' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '5', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '4', type: 'number_integer' },
      ]
    },
    {
      title: 'Exterior Panel - Cedar Wood',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-exterior, step-5',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'EXT-CEDAR' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '5', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '5', type: 'number_integer' },
      ]
    },

    // ── Step 6: Hydro Massage ──
    {
      title: 'Hydro Massage System 1.1 kW (8 nozzles)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-hydro, step-6',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'HYDRO-11KW' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '8', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'Hydro Massage System 1.5 kW (10 nozzles)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-hydro, step-6',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'HYDRO-15KW' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '10', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },

    // ── Step 7: Air System ──
    {
      title: 'Air System - Standard 12 Nozzles',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-air, step-7',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'AIR-STANDARD' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '7', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'Air System - Small 12 Nozzles',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-air, step-7',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'AIR-SMALL' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '7', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },
    {
      title: 'Air System - LED 12 Nozzles',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-air, step-7',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'AIR-LED' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '7', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '6', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '3', type: 'number_integer' },
      ]
    },

    // ── Step 8: Filter System ──
    {
      title: 'Filter - Outlet for Connection Only',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-filter, step-8',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'FILTER-OUTLET' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '8', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'Complete Filtration System',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-filter, step-8',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'FILTER-COMPLETE' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '8', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },

    // ── Step 9: LED Lighting ──
    {
      title: 'LED Lamp 65 mm',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-led, step-9',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'LED-65MM' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '9', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '1', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '1', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '3', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'LED Lamp 50 mm',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-led, step-9',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'LED-50MM' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '9', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '1', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '1', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '3', type: 'number_integer' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },

    // ── Step 10: Thermometer ──
    {
      title: 'Floating Thermometer',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-thermometer, step-10',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'THERMO-FLOATING' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '10', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'is_default', value: 'true', type: 'boolean' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
      ]
    },
    {
      title: 'Integrated Electronic Thermometer',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-thermometer, step-10',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'THERMO-ELECTRONIC' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '10', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },

    // ── Step 11: Stairs ──
    {
      title: 'Stairs (Matching Exterior Material)',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-addon, step-11',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'STAIRS' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '11', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'checkbox', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'Stairs are manufactured from the same material and color as the hot tub exterior panels.', type: 'multi_line_text_field' },
      ]
    },

    // ── Step 12: Head Pillows ──
    {
      title: 'Hot Tub Head Pillow',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-addon, step-12',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'PILLOW' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '12', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'checkbox', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'default_qty', value: '2', type: 'number_integer' },
        { namespace: 'configurator', key: 'min_qty', value: '2', type: 'number_integer' },
        { namespace: 'configurator', key: 'max_qty', value: '8', type: 'number_integer' },
      ]
    },

    // ── Step 13: Cover ──
    {
      title: 'Fiberglass Cover',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-cover, step-13',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'COVER-FIBERGLASS' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '13', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '1', type: 'number_integer' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'Fiberglass cover matches the color of your selected fiberglass liner.', type: 'multi_line_text_field' },
      ]
    },
    {
      title: 'Thermal Cover',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-cover, step-13',
      status: 'active',
      options: [{ name: 'Color' }],
      variants: [
        { option1: 'Black', price: '0.00', sku: 'COVER-THERMAL-BLACK' },
        { option1: 'Grey', price: '0.00', sku: 'COVER-THERMAL-GREY' },
        { option1: 'Brown', price: '0.00', sku: 'COVER-THERMAL-BROWN' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '13', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'dropdown', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'sort_order', value: '2', type: 'number_integer' },
      ]
    },

    // ── Step 15: Heater Connection 90-degree ──
    {
      title: 'Heater Connection 90-Degree Angle',
      product_type: 'Configurator Add-on',
      vendor: 'Nordic Elite',
      tags: 'configurator, configurator-addon, step-15',
      status: 'active',
      variants: [
        { price: '0.00', sku: 'HEATER-90DEG' },
      ],
      metafields: [
        { namespace: 'configurator', key: 'step', value: '15', type: 'number_integer' },
        { namespace: 'configurator', key: 'input_type', value: 'card', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'depends_on', value: 'external-oven', type: 'single_line_text_field' },
        { namespace: 'configurator', key: 'info_tooltip', value: 'Select 90-degree angle connection if your oven placement requires it. Additional connection parts included.', type: 'multi_line_text_field' },
      ]
    },
  ];

  return products;
}

// ─── Collections ────────────────────────────────────────────────────
async function createCollections() {
  console.log('\n══ Creating Smart Collections ══');

  const collections = [
    { title: 'Configurator - All Options', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator' }] },
    { title: 'Configurator - Fiberglass Liners', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-liner' }] },
    { title: 'Configurator - Ovens', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-oven' }] },
    { title: 'Configurator - Oven Add-ons', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-oven-addon' }] },
    { title: 'Configurator - Exterior Panels', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-exterior' }] },
    { title: 'Configurator - Hydro Massage', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-hydro' }] },
    { title: 'Configurator - Air System', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-air' }] },
    { title: 'Configurator - Filter System', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-filter' }] },
    { title: 'Configurator - LED Lighting', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-led' }] },
    { title: 'Configurator - Thermometer', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-thermometer' }] },
    { title: 'Configurator - Covers', rules: [{ column: 'tag', relation: 'equals', condition: 'configurator-cover' }] },
  ];

  for (const col of collections) {
    const result = await shopifyRest('POST', '/smart_collections.json', {
      smart_collection: {
        title: col.title,
        rules: col.rules,
        published: false,  // Not visible in storefront, just for API/configurator use
      }
    });
    if (result?.smart_collection) {
      console.log(`  ✓ Collection: ${result.smart_collection.title}`);
    }
    await delay();
  }
}

// ─── Tag existing base products ─────────────────────────────────────
async function tagBaseProducts() {
  console.log('\n══ Tagging Base Products ══');

  const result = await shopifyRest('GET', '/products.json?limit=50&fields=id,title,tags');
  const products = result?.products || [];
  const baseProducts = products.filter(p => p.title.startsWith('Nordic Elite'));

  for (const p of baseProducts) {
    const existingTags = p.tags.split(',').map(t => t.trim());
    const newTags = new Set(existingTags);
    newTags.add('configurator');
    newTags.add('configurator-base');

    // Determine size tag
    if (p.title.includes(' M ')) newTags.add('step-1-m');
    if (p.title.includes(' L ')) newTags.add('step-1-l');
    if (p.title.includes(' XL ')) newTags.add('step-1-xl');

    const tagStr = [...newTags].filter(Boolean).join(', ');
    if (tagStr !== p.tags) {
      await shopifyRest('PUT', `/products/${p.id}.json`, { product: { id: p.id, tags: tagStr } });
      console.log(`  ✓ Tagged: ${p.title}`);
      await delay();
    } else {
      console.log(`  ~ Already tagged: ${p.title}`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Nordic Elite Configurator — Shopify Setup Script ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // 1. Get access token
  ACCESS_TOKEN = await getAccessToken();

  // 2. Create metafield definitions
  await createMetafieldDefinitions();

  // 3. Tag existing base products
  await tagBaseProducts();

  // 4. Create configurator add-on products
  console.log('\n══ Creating Configurator Products ══');
  const products = getConfiguratorProducts();
  let created = 0;
  let failed = 0;

  for (const product of products) {
    const result = await createProduct(product);
    if (result) {
      created++;
    } else {
      failed++;
    }
    await delay();
  }

  // 5. Create smart collections
  await createCollections();

  // Summary
  console.log('\n╔════════════════════════════════════╗');
  console.log(`║  Done! Created ${created} products, ${failed} failed  ║`);
  console.log('╚════════════════════════════════════╝');
  console.log('\nNext steps:');
  console.log('  1. Go to Shopify Admin > Products and set real prices');
  console.log('  2. Upload product images for each add-on');
  console.log('  3. Update the configurator section to read from these products');
  console.log('  4. ROTATE your API credentials after running this script!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
