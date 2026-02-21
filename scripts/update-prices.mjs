#!/usr/bin/env node
/**
 * Update configurator product prices from client's PDF price list.
 * Prices are EUR with VAT ("WEB Prices with VAT").
 *
 * For size-dependent items (liner, insulation, exterior, cover),
 * XL External price is used as default since the configurator
 * currently doesn't support per-size add-on pricing.
 *
 * Usage: node scripts/update-prices.mjs
 */

const STORE = process.env.SHOPIFY_STORE || 'aurowe-2.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET env vars required.');
  console.error('Run: node -r dotenv/config scripts/update-prices.mjs');
  process.exit(1);
}
const API_VERSION = '2024-10';

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

async function updateVariant(variantId, price) {
  const url = `https://${STORE}/admin/api/${API_VERSION}/variants/${variantId}.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ variant: { id: variantId, price: price.toFixed(2) } })
  });
  const data = await res.json();
  if (data.errors) {
    console.error(`  ✗ Variant ${variantId}: ${JSON.stringify(data.errors)}`);
    return false;
  }
  return true;
}

async function delay(ms = 550) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Configurator Price Update from Client PDF    ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  ACCESS_TOKEN = await getAccessToken();
  console.log('✓ Authenticated\n');

  // ─── Price updates mapped from PDF (variant_id → new_price) ───
  // All prices are EUR with VAT

  const updates = [
    // ── Step 2: Fiberglass Liner ──
    // Standard colors stay at 0.00 (included in base product price)
    // Custom RAL surcharge: PDF says +342 (was 200)
    { id: 56571608105291, price: 342.00, label: 'Liner Solid - Custom RAL' },
    { id: 56571608301899, price: 342.00, label: 'Liner Pearl - Custom RAL' },
    { id: 56571608465739, price: 342.00, label: 'Liner Granite - Custom RAL' },

    // ── Step 3: Insulation (XL price — size-dependent) ──
    // PDF: XL=141.32, L=117.12, M=68.72
    { id: 56571608531275, price: 141.32, label: 'Hot Tub Insulation (XL price)' },

    // ── Step 4: External Ovens ──
    // PDF: Ext 50cm 304=857, 316=1099
    { id: 56571608596811, price: 857.00,  label: 'Ext Oven 50cm AISI 304' },
    { id: 56571608629579, price: 1099.00, label: 'Ext Oven 50cm AISI 316' },
    // PDF: Ext 75cm 304=1099, 316=1341
    { id: 56571608695115, price: 1099.00, label: 'Ext Oven 75cm AISI 304' },
    { id: 56571608727883, price: 1341.00, label: 'Ext Oven 75cm AISI 316' },
    // PDF: Ext 100cm 304=1341, 316=1655.60
    { id: 56571608990027, price: 1341.00,  label: 'Ext Oven 100cm AISI 304' },
    { id: 56571609022795, price: 1655.60, label: 'Ext Oven 100cm AISI 316' },

    // ── Step 4: Internal Oven ──
    // PDF: Int 30kW 304/1.5mm=1210, 316/1.5mm=1500.40
    // 2mm variants not in PDF — adding +100 delta (same as original setup)
    { id: 56571609153867, price: 1210.00,  label: 'Int Oven 304 / 1.5mm' },
    { id: 56571609186635, price: 1310.00,  label: 'Int Oven 304 / 2mm (+100)' },
    { id: 56571609219403, price: 1500.40, label: 'Int Oven 316 / 1.5mm' },
    { id: 56571609252171, price: 1600.40, label: 'Int Oven 316 / 2mm (+100)' },

    // ── Step 4: Oven Add-ons ──
    // PDF: Door with glass=58.40, Chimney=82.60
    { id: 56571609350475, price: 58.40,  label: 'Oven Door with Glass' },
    { id: 56571609547083, price: 82.60,  label: 'Chimney with Heat Protection' },

    // ── Step 5: Exterior Panels (XL External prices — size-dependent) ──
    // PDF: Natural spruce XL=286.34
    { id: 56571609612619, price: 286.34, label: 'Ext Panel - Natural Spruce (XL)' },
    // PDF: Painted spruce XL=342.00
    { id: 56571609678155, price: 342.00, label: 'Ext Panel - Painted RAL 7016' },
    { id: 56571609710923, price: 342.00, label: 'Ext Panel - Painted RAL 9005' },
    { id: 56571609743691, price: 342.00, label: 'Ext Panel - Painted RAL 8017' },
    { id: 56571609776459, price: 342.00, label: 'Ext Panel - Painted RAL 6009' },
    { id: 56571609809227, price: 342.00, label: 'Ext Panel - Painted RAL 7035' },
    { id: 56571609874763, price: 342.00, label: 'Ext Panel - Painted RAL 9010' },
    // PDF: WPC XL=417.02
    { id: 56571609973067, price: 417.02, label: 'Ext Panel - WPC Grey' },
    { id: 56571610005835, price: 417.02, label: 'Ext Panel - WPC Brown' },
    { id: 56571610038603, price: 417.02, label: 'Ext Panel - WPC Black' },
    // PDF: Thermal wood XL=417.02
    { id: 56571610104139, price: 417.02, label: 'Ext Panel - Thermal Wood' },
    // PDF: Cedar wood XL=2200.56
    { id: 56571610202443, price: 2200.56, label: 'Ext Panel - Cedar Wood' },

    // ── Step 6: Hydro Massage ──
    // PDF: 1.1kW 8 nozzles=358.94, 1.5kW 10 nozzles=465.42
    { id: 56571610267979, price: 358.94, label: 'Hydro 1.1kW 8 nozzles' },
    { id: 56571610399051, price: 465.42, label: 'Hydro 1.5kW 10 nozzles' },

    // ── Step 7: Air System ──
    // PDF: Standard=279.08, Small=286.34, LED=373.46
    { id: 56571610464587, price: 279.08, label: 'Air System Standard' },
    { id: 56571610530123, price: 286.34, label: 'Air System Small' },
    { id: 56571610595659, price: 373.46, label: 'Air System LED' },

    // ── Step 8: Filter System ──
    // PDF: Outlet only=127.76, Complete=340.72
    { id: 56571610661195, price: 127.76, label: 'Filter - Outlet Only' },
    { id: 56571610726731, price: 340.72, label: 'Filter - Complete System' },

    // ── Step 9: LED Lighting ──
    // PDF: 65mm 1vnt=45.73, 55mm 1vnt=43.31
    // Note: quantity pricing is non-linear (2=61.46, 3=77.19 for 65mm)
    // Setting per-unit price for qty=1; quantity discount needs JS logic
    { id: 56571610792267, price: 45.73,  label: 'LED Lamp 65mm (per unit)' },
    { id: 56571610890571, price: 43.31,  label: 'LED Lamp 55mm (per unit)' },

    // ── Step 10: Thermometer ──
    // PDF: Floating=39.68, Electronic=56.62
    { id: 56571610956107, price: 39.68,  label: 'Floating Thermometer' },
    { id: 56571611021643, price: 56.62,  label: 'Integrated Electronic Thermometer' },

    // ── Step 11: Stairs ──
    // PDF: Most materials=221, Cedar=463
    // Single product "Matching Exterior Material" — using 221 as default
    { id: 56571611087179, price: 221.00, label: 'Stairs (default, cedar=463)' },

    // ── Step 12: Head Pillows ──
    // PDF: 2=121.296, 3=131.944, 4=142.592, ..., 8=185.184
    // Base for 2 = 121.296, each additional = 10.648
    // Per-unit for min qty 2: 121.296/2 = 60.648
    { id: 56571611185483, price: 60.65, label: 'Head Pillow (per unit)' },

    // ── Step 13: Cover ──
    // Fiberglass cover depends on liner type + size. Using Solid Color XL = 383
    { id: 56571611316555, price: 383.00, label: 'Fiberglass Cover (Solid XL)' },
    // Thermal cover: XL=576.60, L=455.60, M=286.20
    { id: 56571611447627, price: 576.60, label: 'Thermal Cover Black (XL)' },
    { id: 56571611480395, price: 576.60, label: 'Thermal Cover Grey (XL)' },
    { id: 56571611513163, price: 576.60, label: 'Thermal Cover Brown (XL)' },

    // ── Step 15: Heater Connection ──
    // PDF step 15 is "Drawing" (Brėžinys) = 48.40, not heater connection
    // Setting heater connection price to 48.40 (PDF step 15 value)
    { id: 56571611578699, price: 48.40, label: 'Step 15 (48.40 from PDF)' },
  ];

  // ─── Execute updates ───
  let success = 0;
  let failed = 0;

  for (const { id, price, label } of updates) {
    process.stdout.write(`  Updating ${label}: €${price.toFixed(2)} ... `);
    const ok = await updateVariant(id, price);
    if (ok) {
      console.log('✓');
      success++;
    } else {
      failed++;
    }
    await delay();
  }

  // ─── Summary ───
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  Done! ${success} updated, ${failed} failed          ║`);
  console.log(`╚══════════════════════════════════════╝`);

  console.log('\n⚠️  Notes for follow-up:');
  console.log('  • Size-dependent items use XL External prices as default');
  console.log('    Items affected: Insulation, Exterior Panels, Covers');
  console.log('    Proper fix: add size variants to these products');
  console.log('  • LED & Pillow qty pricing is non-linear in PDF');
  console.log('    65mm: 1=€45.73, 2=€61.46, 3=€77.19');
  console.log('    55mm: 1=€43.31, 2=€56.62, 3=€69.93');
  console.log('    Pillows: 2=€121.30, 3=€131.94, +€10.65/each after');
  console.log('  • Stairs: set to €221 but Cedar exterior should be €463');
  console.log('  • Missing product: "Hydro 2×1.1kW 16 nozzles" = €617.88');
  console.log('  • Fiberglass cover price depends on liner type (Solid/Pearl/Granite)');
  console.log('  • PDF step 15 is "Drawing" (€48.40), store step 15 is "Heater Connection"');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
