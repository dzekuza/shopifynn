---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - sections/cart.liquid
  - assets/theme.css
  - assets/theme.js
autonomous: true
requirements: [QUICK-3]
must_haves:
  truths:
    - "User can toggle a company details section on the cart page"
    - "User can enter company name, registration number, and VAT number"
    - "Entered values are saved as cart attributes and flow through to Shopify checkout/order"
    - "Fields persist across page refresh (pre-filled from existing cart attributes)"
  artifacts:
    - path: "sections/cart.liquid"
      provides: "Company details collapsible section with 3 input fields in cart sidebar"
      contains: "data-company-toggle"
    - path: "assets/theme.css"
      provides: "Styling for company details section"
      contains: "cart-page__company"
    - path: "assets/theme.js"
      provides: "JS to save company fields as cart attributes via /cart/update.js"
      contains: "data-company-field"
  key_links:
    - from: "assets/theme.js"
      to: "/cart/update.js"
      via: "fetch POST with attributes object"
      pattern: "cart/update\\.js.*attributes"
    - from: "sections/cart.liquid"
      to: "cart.attributes"
      via: "Liquid pre-fills input values from existing cart attributes"
      pattern: "cart\\.attributes"
---

<objective>
Add a collapsible "Company Details" section in the cart page sidebar where B2B customers can enter company name, registration number, and VAT number. These values are saved as Shopify cart attributes so they automatically appear on the checkout page and resulting order.

Purpose: Enable B2B invoicing by capturing company details before checkout without requiring a Shopify Plus checkout extension.
Output: Working company details form in cart sidebar, persisted as cart attributes.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@sections/cart.liquid
@assets/theme.css
@assets/theme.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add company details collapsible section to cart sidebar and wire JS</name>
  <files>sections/cart.liquid, assets/theme.js, assets/theme.css</files>
  <action>
**In sections/cart.liquid:**

1. Inside `.cart-page__sidebar`, ABOVE the `.cart-page__summary` div (around line 96), add a collapsible company details section:

```liquid
<div class="cart-page__company">
  <button type="button" class="cart-page__company-toggle" data-company-toggle aria-expanded="false" aria-controls="company-details-fields">
    <span>{{ section.settings.company_heading }}</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  <div id="company-details-fields" class="cart-page__company-fields" data-company-fields hidden>
    <div class="cart-page__company-field">
      <label for="company-name">{{ section.settings.company_name_label }}</label>
      <input type="text" id="company-name" data-company-field="Company Name" value="{{ cart.attributes['Company Name'] | escape }}" placeholder="{{ section.settings.company_name_placeholder }}">
    </div>
    <div class="cart-page__company-field">
      <label for="company-reg">{{ section.settings.company_reg_label }}</label>
      <input type="text" id="company-reg" data-company-field="Registration Number" value="{{ cart.attributes['Registration Number'] | escape }}" placeholder="{{ section.settings.company_reg_placeholder }}">
    </div>
    <div class="cart-page__company-field">
      <label for="company-vat">{{ section.settings.company_vat_label }}</label>
      <input type="text" id="company-vat" data-company-field="VAT Number" value="{{ cart.attributes['VAT Number'] | escape }}" placeholder="{{ section.settings.company_vat_placeholder }}">
    </div>
  </div>
</div>
```

2. If any cart attribute for company fields already has a value, set `aria-expanded="true"` and remove `hidden` from the fields container — use Liquid logic:
```liquid
{%- assign has_company = false -%}
{%- if cart.attributes['Company Name'] != blank or cart.attributes['Registration Number'] != blank or cart.attributes['VAT Number'] != blank -%}
  {%- assign has_company = true -%}
{%- endif -%}
```
Then on the toggle button: `aria-expanded="{{ has_company }}"` and on the fields div: `{% unless has_company %}hidden{% endunless %}`.

3. Add these settings to the schema JSON under a new "Company details" header, BEFORE the "Empty cart" header:

```json
{
  "type": "header",
  "content": "Company details"
},
{
  "type": "checkbox",
  "id": "show_company_details",
  "label": "Show company details",
  "default": true
},
{
  "type": "text",
  "id": "company_heading",
  "label": "Company heading",
  "default": "Company Details (optional)"
},
{
  "type": "text",
  "id": "company_name_label",
  "label": "Company name label",
  "default": "Company Name"
},
{
  "type": "text",
  "id": "company_name_placeholder",
  "label": "Company name placeholder",
  "default": "Enter company name"
},
{
  "type": "text",
  "id": "company_reg_label",
  "label": "Registration number label",
  "default": "Registration Number"
},
{
  "type": "text",
  "id": "company_reg_placeholder",
  "label": "Registration number placeholder",
  "default": "Enter registration number"
},
{
  "type": "text",
  "id": "company_vat_label",
  "label": "VAT number label",
  "default": "VAT Number"
},
{
  "type": "text",
  "id": "company_vat_placeholder",
  "label": "VAT number placeholder",
  "default": "Enter VAT number (e.g. DE123456789)"
}
```

4. Wrap the entire company section in `{% if section.settings.show_company_details %}...{% endif %}`.

**In assets/theme.js:**

Add a new section after the cart note handler (after the `noteTimer` setTimeout block around line 922). Follow the same debounced-save pattern used for cart notes:

```javascript
/* ---- Company Details (cart attributes) ---- */

var companyToggle = document.querySelector('[data-company-toggle]');
var companyFields = document.querySelector('[data-company-fields]');

if (companyToggle && companyFields) {
  companyToggle.addEventListener('click', function () {
    var expanded = companyFields.hasAttribute('hidden');
    companyFields.hidden = !expanded;
    companyToggle.setAttribute('aria-expanded', String(expanded));
  });

  var companyTimer;
  var companyInputs = companyFields.querySelectorAll('[data-company-field]');
  companyInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      clearTimeout(companyTimer);
      companyTimer = setTimeout(function () {
        var attributes = {};
        companyInputs.forEach(function (el) {
          attributes[el.getAttribute('data-company-field')] = el.value;
        });
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attributes: attributes })
        });
      }, 500);
    });
  });
}
```

Use `data-company-toggle` and `data-company-field` as DOM hooks per project convention (never class selectors).

**In assets/theme.css:**

Add styles after the `.cart-page__note` block (around line 5096). Match the existing note section visual pattern:

```css
/* ---- Company details ---- */

.cart-page__company {
  margin-bottom: 1.5rem;
}

.cart-page__company-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 0;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: left;
}

.cart-page__company-toggle:hover {
  color: var(--color-secondary);
}

.cart-page__company-toggle svg {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.cart-page__company-toggle[aria-expanded="true"] svg {
  transform: rotate(180deg);
}

.cart-page__company-fields {
  padding: 1rem 0;
}

.cart-page__company-field {
  margin-bottom: 0.75rem;
}

.cart-page__company-field:last-child {
  margin-bottom: 0;
}

.cart-page__company-field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.375rem;
}

.cart-page__company-field input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-background);
  transition: border-color 0.15s ease;
}

.cart-page__company-field input:focus {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 2px rgba(91, 138, 114, 0.15);
}

.cart-page__company-field input::placeholder {
  color: var(--color-text-muted);
}
```
  </action>
  <verify>
1. Open the cart page with items in cart — company details toggle is visible in the sidebar above the subtotal.
2. Click the toggle — fields expand with animation (chevron rotates).
3. Enter a company name — wait 500ms — check via browser console: `fetch('/cart.js').then(r=>r.json()).then(c=>console.log(c.attributes))` — should show `{"Company Name": "entered value"}`.
4. Reload the page — entered value persists in the input field (pre-filled from cart attributes).
5. Proceed to checkout — company details appear as order attributes.
  </verify>
  <done>
Cart sidebar shows a collapsible "Company Details" section with 3 labeled inputs (Company Name, Registration Number, VAT Number). Values debounce-save to cart attributes via /cart/update.js. Fields pre-populate from existing cart attributes on page load. Section is toggleable via theme editor setting.
  </done>
</task>

</tasks>

<verification>
- Company details toggle visible on cart page when items present
- All 3 fields save to cart attributes independently
- Values persist across page refresh
- Toggle remembers expanded state when fields have values
- Section hidden when `show_company_details` is unchecked in theme editor
- No console errors on cart page
</verification>

<success_criteria>
- Company Name, Registration Number, VAT Number saved as cart attributes
- Fields pre-filled from existing cart.attributes on page load
- Collapsible UI matches cart page visual style (note section pattern)
- Theme editor toggle to show/hide the section
- Data flows through to Shopify checkout and resulting orders
</success_criteria>

<output>
After completion, create `.planning/quick/3-add-company-details-dialog-on-checkout-w/3-SUMMARY.md`
</output>
