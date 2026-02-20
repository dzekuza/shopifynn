/**
 * Nordic Elite Hot Tub Configurator
 * Dynamic 15-step configurator reading from Shopify products/collections.
 *
 * Base products: 3 tier products (Classic / Premium / Signature),
 * each with variants encoding size (XL/L/M) and oven type (external/internal).
 * Step 1 selects tier + size. Step 4 selects oven type → resolves the base variant.
 */
(function () {
  'use strict';

  /* ══ 1. CONFIG & CONSTANTS ══════════════════════════════════════════ */

  function money(cents) {
    const val = (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '€' + val;
  }

  const STEPS = [
    { num: 1,  key: 'model_size',  title: 'Your Hot Tub',              subtitle: 'Choose model and size.' },
    { num: 2,  key: 'liner',       title: 'Fiberglass Liner',           subtitle: 'Select collection & color.' },
    { num: 3,  key: 'insulation',  title: 'Hot Tub Insulation',         subtitle: 'Extra insulation layer.' },
    { num: 4,  key: 'oven',        title: 'Heating System',             subtitle: 'External or internal oven.' },
    { num: 5,  key: 'exterior',    title: 'Exterior Panel',             subtitle: 'Pick your wood finish.' },
    { num: 6,  key: 'hydro',       title: 'Hydro Massage',              subtitle: 'Select system & nozzles.' },
    { num: 7,  key: 'air',         title: 'Air System',                 subtitle: 'Select system & nozzles.' },
    { num: 8,  key: 'filter',      title: 'Filter System',              subtitle: 'Filtration options.' },
    { num: 9,  key: 'led',         title: 'LED Lighting',               subtitle: 'Choose lamps & quantity.' },
    { num: 10, key: 'thermometer', title: 'Thermometer',                subtitle: 'Temperature monitoring.' },
    { num: 11, key: 'stairs',      title: 'Stairs',                     subtitle: 'Matching exterior material.' },
    { num: 12, key: 'pillows',     title: 'Hot Tub Head Pillows',       subtitle: 'Comfort pillows.' },
    { num: 13, key: 'cover',       title: 'Cover',                      subtitle: 'Protect your hot tub.' },
    { num: 14, key: 'controls',    title: 'Control Installation',       subtitle: 'Mark installation locations.' },
    { num: 15, key: 'heater_conn', title: 'Heater Connection Type',     subtitle: 'Connection angle.' },
  ];

  /* ══ Main configurator class ════════════════════════════════════════ */
  class HotTubConfigurator extends HTMLElement {

    /* ══ 2. LIFECYCLE & INITIALIZATION ══════════════════════════════════ */

    connectedCallback() {
      this.data = JSON.parse(this.querySelector('[data-configurator-products]').textContent);
      this.state = {
        model: null,               // 'classic', 'premium', 'signature'
        selectedTier: null,        // tier object { key, title, products[] }
        selectedBaseProduct: null,  // resolved product matching size + oven
        size: null,                // 'XL', 'L', 'M'
        ovenType: 'external',      // 'external' or 'internal'
        baseVariantId: null,       // resolved variant ID
        basePrice: 0,              // resolved variant price

        liner: null,
        linerVariant: null,
        insulation: false,
        glassDoor: false,
        chimney: false,
        exterior: null,
        exteriorVariant: null,
        hydro: null,
        hydroNozzles: 8,
        air: null,
        airNozzles: 12,
        filterEnabled: false,
        filterProduct: null,
        led: null,
        ledQty: 1,
        thermometer: null,
        stairs: false,
        pillows: false,
        pillowQty: 2,
        cover: null,
        coverVariant: null,
        controlLocation: 'default',
        heaterConnection: 'straight',
      };

      this.maxUnlocked = 1;
      this._cacheEls();
      this._renderSteps();

      // Set inert on locked step bodies after initial render
      for (let i = 2; i <= STEPS.length; i++) {
        const el = this._stepEls[i];
        if (!el) continue;
        const body = el.querySelector('.cfg-step__body');
        if (body) body.setAttribute('inert', '');
      }

      this._bindEvents();
    }

    _cacheEls() {
      this.stepsContainer = this.querySelector('[data-steps]');
      this.mainImage = this.querySelector('[data-main-image]');
      this.imgLoader = this.querySelector('[data-img-loading]');
      this.gallery = this.querySelector('[data-gallery]');
      this.placeholder = this.querySelector('[data-main-placeholder]');
      this.totalPriceEl = this.querySelector('[data-total-price]');
      this.ctaBtn = this.querySelector('[data-add-to-cart]');
      this.cartError = this.querySelector('[data-cart-error]');
      this.summaryList = this.querySelector('[data-summary-list]');
      this.summaryCard = this.querySelector('[data-summary-card]');
      this.stickyBar = this.querySelector('[data-sticky-bar]');
      this.stickyPrice = this.querySelector('[data-sticky-price]');
      this.stickyCta = this.querySelector('[data-action="sticky-add-to-cart"]');
      this._initStickyBar();

      // Step element map — keyed by step number for O(1) lookups
      this._stepEls = {};
      for (let i = 1; i <= 15; i++) {
        const el = this.querySelector(`[data-step="${i}"]`);
        if (el) this._stepEls[i] = el;
      }

      // Additional hot-path nodes
      this._ovenNote = this.querySelector('[data-oven-note]');
      this._sizeSection = this.querySelector('[data-size-section]');
      this._sizeCardsContainer = this.querySelector('[data-size-cards]');
    }

    /* ══ 3. STEP RENDERING ══════════════════════════════════════════════ */

    _renderSteps() {
      for (const step of STEPS) {
        const el = this.querySelector(`[data-step="${step.num}"]`);
        if (!el) continue;
        const content = el.querySelector('.cfg-step__body');
        if (!content) continue;

        switch (step.key) {
          case 'model_size':  this._renderModelSizeStep(content); break;
          case 'liner':       this._renderCollectionStep(content, 'liners', 'dropdown-color'); break;
          case 'insulation':  this._renderCheckboxStep(content, 'insulation'); break;
          case 'oven':        this._renderOvenStep(content); break;
          case 'exterior':    this._renderCollectionStep(content, 'exteriors', 'dropdown-color'); break;
          case 'hydro':       this._renderCollectionStep(content, 'hydro', 'dropdown-qty'); break;
          case 'air':         this._renderCollectionStep(content, 'air', 'dropdown-qty'); break;
          case 'filter':      this._renderCheckboxDropdownStep(content, 'filter', 'filters'); break;
          case 'led':         this._renderCollectionStep(content, 'leds', 'dropdown-qty'); break;
          case 'thermometer': this._renderCollectionStep(content, 'thermometers', 'dropdown'); break;
          case 'stairs':      this._renderCheckboxStep(content, 'stairs'); break;
          case 'pillows':     this._renderCheckboxQtyStep(content, 'pillows'); break;
          case 'cover':       this._renderCollectionStep(content, 'covers', 'dropdown-color'); break;
          case 'controls':    this._renderDiagramStep(content, 'controls'); break;
          case 'heater_conn': this._renderDiagramStep(content, 'heater_conn'); break;
        }
      }
    }

    _renderModelSizeStep(container) {
      const products = this.data.base || [];
      let html = '';

      // Model tier cards
      html += '<p class="cfg-label">Choose your model:</p>';
      html += '<div class="cfg-cards" data-model-cards>';
      for (const product of products) {
        html += `
          <div class="cfg-card cfg-card--model" data-action="select-model" data-model-key="${product.key}" tabindex="0" role="button" aria-pressed="false">
            ${product.image ? `<img src="${product.image}" alt="${product.title}" class="cfg-card__model-img" loading="lazy">` : ''}
            <div class="cfg-card__info">
              <h4 class="cfg-card__name">${product.title}</h4>
              ${product.body ? `<p class="cfg-card__desc">${product.body}</p>` : ''}
              <p class="cfg-card__meta">From ${money(product.price)}</p>
            </div>
          </div>`;
      }
      html += '</div>';

      // Size cards (shown after model selected)
      html += `
        <div class="cfg-conditional" data-size-section style="display:none;">
          <p class="cfg-label" style="margin-top:20px;">Choose your size:</p>
          <div class="cfg-cards" data-size-cards></div>
        </div>`;

      container.innerHTML = html;
    }

    _renderCollectionStep(container, dataKey, mode) {
      const products = this.data[dataKey] || [];
      if (products.length === 0) {
        container.innerHTML = '<p class="cfg-empty">No options configured yet.</p>';
        return;
      }

      let html = '';

      // Product selector (radio cards with images)
      html += `<div class="cfg-product-list" data-product-group="${dataKey}">`;
      for (const p of products) {
        const tooltip = p.meta?.info_tooltip;
        html += `
          <label class="cfg-radio-card" data-action="select-product" data-group="${dataKey}" data-product-id="${p.id}" data-price="${p.price}">
            <input type="radio" name="cfg-${dataKey}" value="${p.id}" class="cfg-radio-card__input">
            <span class="cfg-radio-card__body">
              ${p.image ? `<img src="${p.image}" alt="${p.title}" class="cfg-radio-card__img" loading="lazy">` : ''}
              <span class="cfg-radio-card__text">
                <span class="cfg-radio-card__title">${p.title}</span>
                ${p.body ? `<span class="cfg-radio-card__desc">${p.body}</span>` : ''}
              </span>
              ${p.price > 0 ? `<span class="cfg-radio-card__price">+${money(p.price)}</span>` : ''}
              ${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${this._escAttr(tooltip)}" aria-label="More info">?</button>` : ''}
            </span>
          </label>`;
      }
      html += '</div>';

      // Variant color swatches
      if (mode === 'dropdown-color') {
        html += `<div class="cfg-variant-area" data-variant-area="${dataKey}" style="display:none;">
          <p class="cfg-label" data-variant-label="${dataKey}">Select color:</p>
          <div class="cfg-swatches" data-variant-swatches="${dataKey}"></div>
        </div>`;
      }

      // Quantity selector (for hydro, air, LED)
      if (mode === 'dropdown-qty') {
        html += `<div class="cfg-qty-area" data-qty-area="${dataKey}" style="display:none;">
          <label class="cfg-label">Number of nozzles:</label>
          <div class="cfg-qty-selector" data-qty-selector="${dataKey}">
            <button type="button" class="cfg-qty-btn" data-action="qty-minus" data-group="${dataKey}" aria-label="Decrease quantity">−</button>
            <span class="cfg-qty-value" data-qty-value="${dataKey}">0</span>
            <button type="button" class="cfg-qty-btn" data-action="qty-plus" data-group="${dataKey}" aria-label="Increase quantity">+</button>
          </div>
        </div>`;
      }

      container.innerHTML = html;
    }

    _renderCheckboxStep(container, stateKey) {
      const products = this.data[stateKey + 's'] || this.data[stateKey] || [];
      const product = Array.isArray(products) ? products[0] : products;
      if (!product || !product.id) {
        container.innerHTML = '<p class="cfg-empty">Not configured.</p>';
        return;
      }

      const tooltip = product.meta?.info_tooltip;
      container.innerHTML = `
        <label class="cfg-checkbox-card" data-action="toggle-checkbox" data-key="${stateKey}" data-product-id="${product.id}" data-variant-id="${product.variants?.[0]?.id || ''}" data-price="${product.price}">
          <input type="checkbox" class="cfg-checkbox-card__input">
          <span class="cfg-checkbox-card__body">
            ${product.image ? `<img src="${product.image}" alt="${product.title}" class="cfg-checkbox-card__img" loading="lazy">` : '<span class="cfg-checkbox-card__check"></span>'}
            <span class="cfg-checkbox-card__text">
              <span class="cfg-checkbox-card__title">${product.title}</span>
              ${product.price > 0 ? `<span class="cfg-checkbox-card__price">+${money(product.price)}</span>` : '<span class="cfg-checkbox-card__price">Included</span>'}
            </span>
            ${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${this._escAttr(tooltip)}" aria-label="More info">?</button>` : ''}
          </span>
        </label>`;
    }

    _renderCheckboxDropdownStep(container, stateKey, dataKey) {
      const products = this.data[dataKey] || [];
      container.innerHTML = `
        <label class="cfg-checkbox-card" data-action="toggle-checkbox" data-key="${stateKey}" data-reveals="cfg-filter-options">
          <input type="checkbox" class="cfg-checkbox-card__input">
          <span class="cfg-checkbox-card__body">
            <span class="cfg-checkbox-card__check"></span>
            <span class="cfg-checkbox-card__text">
              <span class="cfg-checkbox-card__title">Add filter system</span>
            </span>
          </span>
        </label>
        <div class="cfg-conditional" id="cfg-filter-options" style="display:none;">
          <div class="cfg-product-list" data-product-group="${dataKey}">
            ${products.map(p => `
              <label class="cfg-radio-card" data-action="select-product" data-group="${dataKey}" data-product-id="${p.id}" data-price="${p.price}">
                <input type="radio" name="cfg-${dataKey}" value="${p.id}" class="cfg-radio-card__input">
                <span class="cfg-radio-card__body">
                  ${p.image ? `<img src="${p.image}" alt="${p.title}" class="cfg-radio-card__img" loading="lazy">` : ''}
                  <span class="cfg-radio-card__text">
                    <span class="cfg-radio-card__title">${p.title}</span>
                  </span>
                  ${p.price > 0 ? `<span class="cfg-radio-card__price">+${money(p.price)}</span>` : ''}
                </span>
              </label>
            `).join('')}
          </div>
        </div>`;
    }

    _renderCheckboxQtyStep(container, stateKey) {
      const products = this.data[stateKey] || [];
      const product = Array.isArray(products) ? products[0] : products;
      if (!product) { container.innerHTML = '<p class="cfg-empty">Not configured.</p>'; return; }

      const min = product.meta?.min_qty || 2;
      const max = product.meta?.max_qty || 8;
      const def = product.meta?.default_qty || min;

      container.innerHTML = `
        <label class="cfg-checkbox-card" data-action="toggle-checkbox" data-key="${stateKey}" data-product-id="${product.id}" data-variant-id="${product.variants?.[0]?.id || ''}" data-price="${product.price}" data-reveals="cfg-${stateKey}-qty">
          <input type="checkbox" class="cfg-checkbox-card__input">
          <span class="cfg-checkbox-card__body">
            ${product.image ? `<img src="${product.image}" alt="${product.title}" class="cfg-checkbox-card__img" loading="lazy">` : '<span class="cfg-checkbox-card__check"></span>'}
            <span class="cfg-checkbox-card__text">
              <span class="cfg-checkbox-card__title">${product.title}</span>
              ${product.price > 0 ? `<span class="cfg-checkbox-card__price">+${money(product.price)} each</span>` : ''}
            </span>
          </span>
        </label>
        <div class="cfg-conditional" id="cfg-${stateKey}-qty" style="display:none;">
          <label class="cfg-label">Quantity:</label>
          <div class="cfg-qty-selector" data-qty-selector="${stateKey}" data-min="${min}" data-max="${max}">
            <button type="button" class="cfg-qty-btn" data-action="qty-minus" data-group="${stateKey}" aria-label="Decrease quantity">−</button>
            <span class="cfg-qty-value" data-qty-value="${stateKey}">${def}</span>
            <button type="button" class="cfg-qty-btn" data-action="qty-plus" data-group="${stateKey}" aria-label="Increase quantity">+</button>
          </div>
        </div>`;
      this.state.pillowQty = def;
    }

    _renderOvenStep(container) {
      const ovenAddons = this.data.oven_addons || [];

      let html = '';

      // Oven type toggle — determines base product variant
      html += `
        <p class="cfg-label">Select your heating system:</p>
        <div class="cfg-toggle-group" data-oven-type-toggle>
          <button type="button" class="cfg-toggle-btn cfg-toggle-btn--active" data-action="oven-type" data-value="external">External oven</button>
          <button type="button" class="cfg-toggle-btn" data-action="oven-type" data-value="internal">Internal oven</button>
        </div>
        <p class="cfg-note" data-oven-note></p>`;

      // Oven add-ons (glass door, chimney — only relevant for external)
      if (ovenAddons.length > 0) {
        html += '<div class="cfg-addon-list" data-oven-addons>';
        for (const addon of ovenAddons) {
          const tooltip = addon.meta?.info_tooltip;
          html += `
            <label class="cfg-checkbox-card cfg-checkbox-card--compact" data-action="toggle-oven-addon" data-addon-id="${addon.id}" data-variant-id="${addon.variants?.[0]?.id || ''}" data-price="${addon.price}">
              <input type="checkbox" class="cfg-checkbox-card__input">
              <span class="cfg-checkbox-card__body">
                ${addon.image ? `<img src="${addon.image}" alt="${addon.title}" class="cfg-checkbox-card__img" loading="lazy">` : '<span class="cfg-checkbox-card__check"></span>'}
                <span class="cfg-checkbox-card__text">
                  <span class="cfg-checkbox-card__title">${addon.title}</span>
                  ${addon.price > 0 ? `<span class="cfg-checkbox-card__price">+${money(addon.price)}</span>` : ''}
                </span>
                ${tooltip ? `<button type="button" class="cfg-tooltip-btn" data-tooltip="${this._escAttr(tooltip)}" aria-label="More info">?</button>` : ''}
              </span>
            </label>`;
        }
        html += '</div>';
      }

      container.innerHTML = html;
    }

    _renderDiagramStep(container, key) {
      const imgData = this.data.diagrams?.[key] || {};
      if (key === 'controls') {
        container.innerHTML = `
          <p class="cfg-desc">Mark the installation locations for controls and systems on the diagram below.</p>
          ${imgData.image ? `<img src="${imgData.image}" alt="Control installation diagram" class="cfg-diagram-img" loading="lazy">` : '<div class="cfg-diagram-placeholder">Diagram images will be uploaded by admin</div>'}
          <p class="cfg-note">Default positions are pre-selected. Modify if needed during order review.</p>`;
      } else {
        container.innerHTML = `
          <div class="cfg-card-options" data-heater-options>
            <div class="cfg-card cfg-card--option cfg-card--selected" data-action="heater-conn" data-value="straight" tabindex="0" role="button">
              ${imgData.straight ? `<img src="${imgData.straight}" alt="Straight connection" class="cfg-card__img" loading="lazy">` : ''}
              <span class="cfg-card__label">Straight connection</span>
              <span class="cfg-card__sublabel">Standard (included)</span>
            </div>
            <div class="cfg-card cfg-card--option" data-action="heater-conn" data-value="90-degree" tabindex="0" role="button">
              ${imgData.angle ? `<img src="${imgData.angle}" alt="90° angle connection" class="cfg-card__img" loading="lazy">` : ''}
              <span class="cfg-card__label">90° Angle connection</span>
              <span class="cfg-card__sublabel">+${money(this.data.heater_90?.price || 0)}</span>
            </div>
          </div>`;
      }
    }

    _renderSizeCards(sizes) {
      const container = this.querySelector('[data-size-cards]');
      if (!container) return;

      const dims = {
        XL: 'Inside ∅ 200 cm / Outside ∅ 225 cm',
        L: 'Inside ∅ 180 cm / Outside ∅ 200 cm',
        M: '100×80 cm / 120×200 cm',
      };
      const persons = { XL: '6–8 persons', L: '6–8 persons', M: '2 persons' };

      container.innerHTML = sizes.map(s => `
        <div class="cfg-card cfg-card--size" data-action="select-size" data-size="${s.label}" tabindex="0" role="button" aria-pressed="false">
          <div class="cfg-card__info">
            <h4 class="cfg-card__name">${s.label}</h4>
            <p class="cfg-card__desc">${dims[s.label] || ''}</p>
            <p class="cfg-card__meta">${persons[s.label] || ''}</p>
          </div>
          <div class="cfg-card__price">From ${money(s.minPrice)}</div>
        </div>
      `).join('');
    }

    _showVariants(group, product) {
      const area = this.querySelector(`[data-variant-area="${group}"]`);
      if (!area) return;

      const swatchContainer = area.querySelector(`[data-variant-swatches="${group}"]`);
      const pillsContainer = area.querySelector(`[data-variant-pills="${group}"]`);
      const target = swatchContainer || pillsContainer;
      if (!target) return;

      const variants = product.variants || [];
      const isColor = variants.some(v => v.option1 && /pearl|granite|grey|black|brown|white|blue|green|azure|ivory|silver|midnight|crystal|glacier|arctic|anthracite|chocolate|fir|cedar|thermal|ral/i.test(v.option1));

      if (isColor && swatchContainer) {
        swatchContainer.innerHTML = variants.map((v, i) => `
          <div class="cfg-swatch ${i === 0 ? 'cfg-swatch--selected' : ''}" data-action="select-variant" data-group="${group}" data-variant-id="${v.id}" data-price="${v.price}" title="${v.option1}" tabindex="0" role="button" aria-pressed="${i === 0}" aria-label="${v.option1}">
            <span class="cfg-swatch__label">${v.option1}</span>
          </div>
        `).join('');
      } else if (pillsContainer) {
        pillsContainer.innerHTML = variants.map((v, i) => `
          <button type="button" class="cfg-pill ${i === 0 ? 'cfg-pill--selected' : ''}" data-action="select-variant" data-group="${group}" data-variant-id="${v.id}" data-price="${v.price}">
            ${v.option1}${v.option2 ? ' / ' + v.option2 : ''}
            ${v.price > product.variants[0].price ? ` <span class="cfg-pill__extra">+${money(v.price - product.variants[0].price)}</span>` : ''}
          </button>
        `).join('');
      }

      area.style.display = 'block';
      this._selectVariant(group, variants[0]?.id, variants[0]?.price);

      target.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action="select-variant"]');
        if (!el) return;
        target.querySelectorAll('.cfg-swatch--selected, .cfg-pill--selected').forEach(s => {
          s.classList.remove('cfg-swatch--selected', 'cfg-pill--selected');
          s.setAttribute('aria-pressed', 'false');
        });
        el.classList.add(el.classList.contains('cfg-swatch') ? 'cfg-swatch--selected' : 'cfg-pill--selected');
        el.setAttribute('aria-pressed', 'true');
        this._selectVariant(group, parseInt(el.dataset.variantId), parseInt(el.dataset.price));
      });
    }

    _showQtySelector(group, product) {
      const area = this.querySelector(`[data-qty-area="${group}"]`);
      if (!area) return;
      const valueEl = area.querySelector(`[data-qty-value="${group}"]`);
      const selectorEl = area.querySelector(`[data-qty-selector="${group}"]`);

      if (valueEl) valueEl.textContent = product.meta?.default_qty || 1;
      if (selectorEl) {
        selectorEl.dataset.min = product.meta?.min_qty || 1;
        selectorEl.dataset.max = product.meta?.max_qty || 12;
      }

      area.style.display = 'block';

      const qtyMap = { hydro: 'hydroNozzles', air: 'airNozzles', leds: 'ledQty' };
      if (qtyMap[group]) this.state[qtyMap[group]] = product.meta?.default_qty || 1;
    }

    _unlockThrough(stepNum) {
      if (stepNum <= this.maxUnlocked) return;
      this.maxUnlocked = stepNum;
      for (let i = 1; i <= STEPS.length; i++) {
        const el = this._stepEls[i];
        if (!el) continue;
        el.classList.toggle('cfg-step--locked', i > this.maxUnlocked);
        el.setAttribute('aria-disabled', String(i > this.maxUnlocked));
        const body = el.querySelector('.cfg-step__body');
        if (body) {
          if (i > this.maxUnlocked) {
            body.setAttribute('inert', '');
          } else {
            body.removeAttribute('inert');
          }
        }
      }
      if (this.state.size && this.ctaBtn) {
        this.ctaBtn.disabled = false;
        this.ctaBtn.textContent = 'Add to Cart';
        if (this.stickyCta) this.stickyCta.disabled = false;
      }
      // Move focus to the first focusable element in the newly unlocked step
      const newStep = this._stepEls[stepNum];
      if (newStep) {
        setTimeout(() => {
          const firstFocusable = newStep.querySelector('button, [tabindex="0"], input, [data-action]');
          if (firstFocusable) firstFocusable.focus();
        }, 200);
      }
    }

    /* ══ 4. EVENT HANDLING ══════════════════════════════════════════════ */

    _bindEvents() {
      this.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) {
          if (!e.target.closest('.cfg-tooltip-btn')) this._closeTooltips();
          return;
        }

        const action = target.dataset.action;
        switch (action) {
          case 'select-model':
            this._handleModelSelect(target.dataset.modelKey);
            break;
          case 'select-size':
            this._handleSizeSelect(target.dataset.size);
            break;
          case 'select-product': {
            const radio = target.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            this._handleProductSelect(target.dataset.group, parseInt(target.dataset.productId));
            break;
          }
          case 'toggle-checkbox':
            this._handleCheckboxToggle(target);
            break;
          case 'toggle-oven-addon':
            this._handleOvenAddonToggle(target);
            break;
          case 'oven-type':
            this._handleOvenTypeToggle(target.dataset.value);
            break;
          case 'qty-minus':
          case 'qty-plus':
            this._handleQtyChange(target.dataset.group, action === 'qty-plus' ? 1 : -1);
            break;
          case 'heater-conn':
            this._handleHeaterConnection(target.dataset.value);
            break;
          case 'retry-cart':
            this._hideError();
            this._handleAddToCart();
            break;
          case 'sticky-add-to-cart':
            this._handleAddToCart();
            break;
        }

        // Tooltip
        if (e.target.closest('.cfg-tooltip-btn')) {
          e.preventDefault();
          e.stopPropagation();
          this._showTooltip(e.target.closest('.cfg-tooltip-btn'));
        }
      });

      // Keyboard support
      this.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
          const target = e.target.closest('[data-action]');
          if (!target) return;
          const group = target.closest('.cfg-cards, .cfg-product-list, .cfg-swatches, .cfg-toggle-group, .cfg-card-options');
          if (!group) return;
          const items = [...group.querySelectorAll('[data-action]')];
          const idx = items.indexOf(target);
          if (idx === -1) return;
          e.preventDefault();
          const next = (e.key === 'ArrowRight' || e.key === 'ArrowDown')
            ? items[(idx + 1) % items.length]
            : items[(idx - 1 + items.length) % items.length];
          next.focus();
          return;
        }
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const target = e.target.closest('[data-action]');
        if (!target) return;
        e.preventDefault();
        target.click();
      });

      // CTA
      this.ctaBtn?.addEventListener('click', () => this._handleAddToCart());
    }

    _handleModelSelect(modelKey) {
      this.state.model = modelKey;
      const tier = (this.data.base || []).find(p => p.key === modelKey);
      if (!tier) return;

      this.state.selectedTier = tier;
      this.state.selectedBaseProduct = null;
      this.state.size = null;
      this.state.baseVariantId = null;
      this.state.basePrice = 0;

      // Update model cards UI
      this.querySelectorAll('[data-action="select-model"]').forEach(el => {
        const selected = el.dataset.modelKey === modelKey;
        el.classList.toggle('cfg-card--selected', selected);
        el.setAttribute('aria-pressed', String(selected));
      });

      // Extract sizes from products in collection
      const sizes = this._extractSizes(tier.products || []);
      this._renderSizeCards(sizes);

      // Show size section
      const sizeSection = this.querySelector('[data-size-section]');
      if (sizeSection) sizeSection.style.display = 'block';

      // Show tier image
      if (tier.image) {
        this._preloadImage(tier.image);
        this._setMainImage(tier.image);
      }

      this._updatePrice();
    }

    _handleSizeSelect(size) {
      this.state.size = size;

      // Update size cards UI
      this.querySelectorAll('[data-action="select-size"]').forEach(el => {
        const selected = el.dataset.size === size;
        el.classList.toggle('cfg-card--selected', selected);
        el.setAttribute('aria-pressed', String(selected));
      });

      // Resolve base product with current oven type
      this._resolveBaseProduct();

      // Update oven step availability
      this._updateOvenAvailability();

      // Unlock all remaining steps once size is chosen
      this._unlockThrough(STEPS.length);
      this._updatePrice();
      this._scrollToStep(2);
    }

    _handleProductSelect(group, productId) {
      const products = this.data[group] || [];
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Map group → state keys
      const stateMap = {
        'liners':       { product: 'liner', variant: 'linerVariant' },
        'exteriors':    { product: 'exterior', variant: 'exteriorVariant' },
        'hydro':        { product: 'hydro', variant: null },
        'air':          { product: 'air', variant: null },
        'filters':      { product: 'filterProduct', variant: null },
        'leds':         { product: 'led', variant: null },
        'thermometers': { product: 'thermometer', variant: null },
        'covers':       { product: 'cover', variant: 'coverVariant' },
      };

      const mapping = stateMap[group];
      if (mapping) {
        this.state[mapping.product] = productId;
        if (mapping.variant) this.state[mapping.variant] = product.variants?.[0]?.id || null;
      }

      // Highlight selected card
      const list = this.querySelector(`[data-product-group="${group}"]`);
      if (list) {
        list.querySelectorAll('.cfg-radio-card').forEach(card => {
          card.classList.toggle('cfg-radio-card--selected', card.dataset.productId == productId);
        });
      }

      // Show variant swatches if product has multiple variants
      if (product.variants?.length > 1) {
        this._showVariants(group, product);
      }

      // Show quantity selector if applicable
      if (product.meta?.max_qty > 0) {
        this._showQtySelector(group, product);
      }

      this._updatePrice();
    }

    _handleCheckboxToggle(target) {
      const key = target.dataset.key;
      const checkbox = target.querySelector('input[type="checkbox"]');
      if (!checkbox) return;

      const checked = checkbox.checked;
      this.state[key] = checked;

      target.classList.toggle('cfg-checkbox-card--checked', checked);

      // Reveal conditional content
      const revealsId = target.dataset.reveals;
      if (revealsId) {
        const panel = this.querySelector(`#${revealsId}`);
        if (panel) panel.style.display = checked ? 'block' : 'none';
      }

      this._updatePrice();
    }

    _handleOvenTypeToggle(type) {
      this.state.ovenType = type;

      // Toggle buttons
      this.querySelectorAll('[data-action="oven-type"]').forEach(btn => {
        btn.classList.toggle('cfg-toggle-btn--active', btn.dataset.value === type);
      });

      // Resolve base product with new oven type
      this._resolveBaseProduct();

      // Show/hide heater connection step (only for external)
      const step15 = this.querySelector('[data-step="15"]');
      if (step15) step15.style.display = type === 'external' ? '' : 'none';

      // Show/hide oven add-ons (only relevant for external)
      const addons = this.querySelector('[data-oven-addons]');
      if (addons) addons.style.display = type === 'external' ? '' : 'none';

      // Reset oven add-ons if switching to internal
      if (type === 'internal') {
        this.state.glassDoor = false;
        this.state.chimney = false;
        this.querySelectorAll('[data-oven-addons] input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
          cb.closest('.cfg-checkbox-card')?.classList.remove('cfg-checkbox-card--checked');
        });
      }

      this._updatePrice();
    }

    _handleOvenAddonToggle(target) {
      const checkbox = target.querySelector('input[type="checkbox"]');
      if (!checkbox) return;
      const checked = checkbox.checked;

      target.classList.toggle('cfg-checkbox-card--checked', checked);

      const addonKey = target.querySelector('.cfg-checkbox-card__title')?.textContent?.toLowerCase() || '';
      if (addonKey.includes('glass') || addonKey.includes('door')) {
        this.state.glassDoor = checked;
      } else if (addonKey.includes('chimney')) {
        this.state.chimney = checked;
      }

      this._updatePrice();
    }

    _handleQtyChange(group, delta) {
      const valueEl = this.querySelector(`[data-qty-value="${group}"]`);
      const selectorEl = this.querySelector(`[data-qty-selector="${group}"]`);
      if (!valueEl) return;

      let current = parseInt(valueEl.textContent) || 0;
      const min = parseInt(selectorEl?.dataset.min) || 1;
      const max = parseInt(selectorEl?.dataset.max) || 12;

      const products = this.data[group] || this.data[group + 's'] || [];
      const selectedProduct = Array.isArray(products) ? products.find(p => p.id === this.state[group]) || products[0] : products;
      const metaMin = selectedProduct?.meta?.min_qty || min;
      const metaMax = selectedProduct?.meta?.max_qty || max;

      current = Math.max(metaMin, Math.min(metaMax, current + delta));
      valueEl.textContent = current;

      const qtyMap = { hydro: 'hydroNozzles', air: 'airNozzles', leds: 'ledQty', pillows: 'pillowQty' };
      if (qtyMap[group]) this.state[qtyMap[group]] = current;

      this._updatePrice();
    }

    _handleHeaterConnection(value) {
      this.state.heaterConnection = value;
      this.querySelectorAll('[data-action="heater-conn"]').forEach(card => {
        card.classList.toggle('cfg-card--selected', card.dataset.value === value);
      });
      this._updatePrice();
    }

    _selectVariant(group, variantId, price) {
      const variantMap = {
        'liners': 'linerVariant',
        'exteriors': 'exteriorVariant',
        'covers': 'coverVariant',
      };
      if (variantMap[group]) {
        this.state[variantMap[group]] = variantId;
      }
      this._updatePrice();
    }

    /* ══ 5. PRODUCT RESOLUTION ══════════════════════════════════════════ */

    _getSizeFromProduct(product) {
      const text = product.title || '';
      if (/\bXL\b/i.test(text)) return 'XL';
      if (/\bM\b/i.test(text) && !/\bXL\b/i.test(text)) return 'M';
      if (/\bL\b/i.test(text) && !/\bXL\b/i.test(text)) return 'L';
      return null;
    }

    _isInternalOvenProduct(product) {
      const title = (product.title || '').trim();
      return /\bI\s*$/.test(title) || /internal|integr/i.test(title);
    }

    _extractSizes(products) {
      const sizeMap = new Map();
      const sizeOrder = ['XL', 'L', 'M'];

      for (const p of products) {
        const size = this._getSizeFromProduct(p);
        if (!size) continue;

        if (!sizeMap.has(size)) {
          sizeMap.set(size, { key: size.toLowerCase(), label: size, minPrice: p.price, products: [] });
        }
        const entry = sizeMap.get(size);
        entry.products.push(p);
        if (p.price < entry.minPrice) entry.minPrice = p.price;
      }

      return sizeOrder.filter(s => sizeMap.has(s)).map(s => sizeMap.get(s));
    }

    _resolveBaseProduct() {
      const tier = this.state.selectedTier;
      if (!tier || !this.state.size) return;

      const products = tier.products || [];
      const size = this.state.size;
      const wantInternal = this.state.ovenType === 'internal';

      // Find product matching size + oven type
      let product = products.find(p =>
        this._getSizeFromProduct(p) === size && this._isInternalOvenProduct(p) === wantInternal
      );

      // Fallback: if internal not found, try external
      if (!product && wantInternal) {
        product = products.find(p =>
          this._getSizeFromProduct(p) === size && !this._isInternalOvenProduct(p)
        );
        if (product) {
          this.state.ovenType = 'external';
          this.querySelectorAll('[data-action="oven-type"]').forEach(btn => {
            btn.classList.toggle('cfg-toggle-btn--active', btn.dataset.value === 'external');
          });
        }
      }

      if (product) {
        this.state.selectedBaseProduct = product;
        this.state.baseVariantId = product.variants?.[0]?.id || null;
        this.state.basePrice = product.variants?.[0]?.price || product.price || 0;
        if (product.image) this._preloadImage(product.image);
        if (product.image) this._setMainImage(product.image);
      } else {
        this.state.selectedBaseProduct = null;
        this.state.baseVariantId = null;
        this.state.basePrice = 0;
      }
    }

    _updateOvenAvailability() {
      const tier = this.state.selectedTier;
      if (!tier || !this.state.size) return;

      const products = tier.products || [];
      const size = this.state.size;

      // Check if an internal oven product exists for this size
      const hasInternal = products.some(p =>
        this._getSizeFromProduct(p) === size && this._isInternalOvenProduct(p)
      );

      const internalBtn = this.querySelector('[data-action="oven-type"][data-value="internal"]');
      if (internalBtn) {
        internalBtn.disabled = !hasInternal;
        internalBtn.style.opacity = hasInternal ? '' : '0.4';

        if (!hasInternal && this.state.ovenType === 'internal') {
          this.state.ovenType = 'external';
          internalBtn.classList.remove('cfg-toggle-btn--active');
          this.querySelector('[data-action="oven-type"][data-value="external"]')?.classList.add('cfg-toggle-btn--active');
          this._resolveBaseProduct();
        }
      }

      const note = this.querySelector('[data-oven-note]');
      if (note) {
        note.textContent = !hasInternal && size
          ? 'Internal oven is not available for size ' + size + '.'
          : '';
      }
    }

    /* ══ 6. PRICE CALCULATION ════════════════════════════════════════════ */

    _updatePrice() {
      let total = 0;

      // Base product (resolved variant price includes size + oven)
      total += this.state.basePrice || 0;

      // Liner
      total += this._getSelectedVariantPrice('liners', 'liner', 'linerVariant');

      // Insulation
      if (this.state.insulation) total += this._getProductPrice('insulations');

      // Oven add-ons (glass door, chimney)
      if (this.state.glassDoor) total += this._getAddonPrice('glass');
      if (this.state.chimney) total += this._getAddonPrice('chimney');

      // Exterior
      total += this._getSelectedVariantPrice('exteriors', 'exterior', 'exteriorVariant');

      // Hydro massage
      total += this._getSelectedProductPrice('hydro', 'hydro');

      // Air system
      total += this._getSelectedProductPrice('air', 'air');

      // Filter
      if (this.state.filterEnabled) total += this._getSelectedProductPrice('filters', 'filterProduct');

      // LED
      total += this._getSelectedProductPrice('leds', 'led') * (this.state.ledQty || 1);

      // Thermometer
      total += this._getSelectedProductPrice('thermometers', 'thermometer');

      // Stairs
      if (this.state.stairs) total += this._getProductPrice('stairs');

      // Pillows
      if (this.state.pillows) total += this._getProductPrice('pillows') * (this.state.pillowQty || 2);

      // Cover
      total += this._getSelectedVariantPrice('covers', 'cover', 'coverVariant');

      // Heater connection 90°
      if (this.state.heaterConnection === '90-degree') {
        total += this.data.heater_90?.price || 0;
      }

      // Update display
      const formatted = money(total);
      const hasSize = !!this.state.size;
      if (this.totalPriceEl) {
        this.totalPriceEl.textContent = formatted;
        this.totalPriceEl.style.visibility = hasSize ? 'visible' : 'hidden';
      }
      if (this.stickyPrice) {
        this.stickyPrice.textContent = formatted;
      }
      if (this.stickyBar) {
        this.stickyBar.style.display = hasSize ? '' : 'none';
      }

      this._currentTotal = total;
      this._updateSummary();
    }

    _getSelectedVariantPrice(dataKey, stateProductKey, stateVariantKey) {
      const productId = this.state[stateProductKey];
      if (!productId) return 0;
      const products = this.data[dataKey] || [];
      const product = products.find(p => p.id === productId);
      if (!product) return 0;
      const variantId = this.state[stateVariantKey];
      if (variantId) {
        const variant = product.variants?.find(v => v.id === variantId);
        if (variant) return variant.price;
      }
      return product.price;
    }

    _getSelectedProductPrice(dataKey, stateKey) {
      const productId = this.state[stateKey];
      if (!productId) return 0;
      const products = this.data[dataKey] || [];
      const product = products.find(p => p.id === productId);
      return product?.price || 0;
    }

    _getProductPrice(dataKey) {
      const products = this.data[dataKey] || [];
      const product = Array.isArray(products) ? products[0] : products;
      return product?.price || 0;
    }

    _getAddonPrice(keyword) {
      const addons = this.data.oven_addons || [];
      const addon = addons.find(a => a.title.toLowerCase().includes(keyword));
      return addon?.price || 0;
    }

    _updateSummary() {
      if (!this.summaryCard && !this.summaryList) return;

      // Build grouped data structure — each item is { label, image, price, qty, stepNum }
      const groups = [];

      // Base Model group (stepNum 1)
      if (this.state.model && this.state.size) {
        const tierTitle = this.state.selectedTier?.title || this.state.model;
        const ovenLabel = this.state.ovenType === 'internal' ? 'Internal Oven' : 'External Oven';
        groups.push({
          heading: 'Base Model',
          stepNum: 1,
          items: [{
            label: `${tierTitle}, Size ${this.state.size}, ${ovenLabel}`,
            image: this.state.selectedBaseProduct?.image || null,
            price: this.state.basePrice || 0,
            qty: null,
          }],
        });
      }

      // Heating group — oven add-ons and alternate connection only (stepNum 4)
      const heatingItems = [];
      if (this.state.glassDoor) {
        const addon = (this.data.oven_addons || []).find(a => a.title.toLowerCase().includes('glass'));
        heatingItems.push({
          label: 'Door with glass',
          image: addon?.image || null,
          price: this._getAddonPrice('glass'),
          qty: null,
        });
      }
      if (this.state.chimney) {
        const addon = (this.data.oven_addons || []).find(a => a.title.toLowerCase().includes('chimney'));
        heatingItems.push({
          label: 'Chimney heat protection',
          image: addon?.image || null,
          price: this._getAddonPrice('chimney'),
          qty: null,
        });
      }
      if (this.state.heaterConnection !== 'straight') {
        heatingItems.push({
          label: '90° angle connection',
          image: null,
          price: this.data.heater_90?.price || 0,
          qty: null,
        });
      }
      if (heatingItems.length > 0) groups.push({ heading: 'Heating', stepNum: 4, items: heatingItems });

      // Wellness group — hydro (stepNum 6), air (stepNum 7)
      const wellnessItems = [];
      if (this.state.hydro) {
        wellnessItems.push({
          label: `${this._getProductTitle('hydro', this.state.hydro)} (${this.state.hydroNozzles} nozzles)`,
          image: this._getProductImage('hydro', this.state.hydro),
          price: this._getSelectedProductPrice('hydro', 'hydro'),
          qty: null,
        });
      }
      if (this.state.air) {
        wellnessItems.push({
          label: `${this._getProductTitle('air', this.state.air)} (${this.state.airNozzles} nozzles)`,
          image: this._getProductImage('air', this.state.air),
          price: this._getSelectedProductPrice('air', 'air'),
          qty: null,
        });
      }
      if (wellnessItems.length > 0) groups.push({ heading: 'Wellness Features', stepNum: 6, items: wellnessItems });

      // Accessories group — multiple steps; stepNum points to liner step (2) as entry point
      const accItems = [];
      if (this.state.liner) {
        accItems.push({
          label: `Liner: ${this._getProductTitle('liners', this.state.liner)}`,
          image: this._getProductImage('liners', this.state.liner),
          price: this._getSelectedVariantPrice('liners', 'liner', 'linerVariant'),
          qty: null,
          stepNum: 2,
        });
      }
      if (this.state.insulation) {
        accItems.push({
          label: 'Insulation',
          image: this._getProductImage('insulations', null),
          price: this._getProductPrice('insulations'),
          qty: null,
          stepNum: 3,
        });
      }
      if (this.state.exterior) {
        accItems.push({
          label: `Exterior: ${this._getProductTitle('exteriors', this.state.exterior)}`,
          image: this._getProductImage('exteriors', this.state.exterior),
          price: this._getSelectedVariantPrice('exteriors', 'exterior', 'exteriorVariant'),
          qty: null,
          stepNum: 5,
        });
      }
      if (this.state.filterEnabled && this.state.filterProduct) {
        accItems.push({
          label: `Filter: ${this._getProductTitle('filters', this.state.filterProduct)}`,
          image: this._getProductImage('filters', this.state.filterProduct),
          price: this._getSelectedProductPrice('filters', 'filterProduct'),
          qty: null,
          stepNum: 8,
        });
      }
      if (this.state.led) {
        accItems.push({
          label: `LED: ${this._getProductTitle('leds', this.state.led)} ×${this.state.ledQty}`,
          image: this._getProductImage('leds', this.state.led),
          price: this._getSelectedProductPrice('leds', 'led'),
          qty: this.state.ledQty || 1,
          stepNum: 9,
        });
      }
      if (this.state.thermometer) {
        accItems.push({
          label: `Thermometer: ${this._getProductTitle('thermometers', this.state.thermometer)}`,
          image: this._getProductImage('thermometers', this.state.thermometer),
          price: this._getSelectedProductPrice('thermometers', 'thermometer'),
          qty: null,
          stepNum: 10,
        });
      }
      if (this.state.stairs) {
        accItems.push({
          label: 'Stairs',
          image: this._getProductImage('stairs', null),
          price: this._getProductPrice('stairs'),
          qty: null,
          stepNum: 11,
        });
      }
      if (this.state.pillows) {
        accItems.push({
          label: `Pillows ×${this.state.pillowQty || 2}`,
          image: this._getProductImage('pillows', null),
          price: this._getProductPrice('pillows'),
          qty: this.state.pillowQty || 2,
          stepNum: 12,
        });
      }
      if (this.state.cover) {
        accItems.push({
          label: `Cover: ${this._getProductTitle('covers', this.state.cover)}`,
          image: this._getProductImage('covers', this.state.cover),
          price: this._getSelectedVariantPrice('covers', 'cover', 'coverVariant'),
          qty: null,
          stepNum: 13,
        });
      }
      if (accItems.length > 0) {
        // For the Accessories group, stepNum points to liner (step 2) as the entry anchor
        const firstStepNum = accItems[0].stepNum || 2;
        groups.push({ heading: 'Accessories', stepNum: firstStepNum, items: accItems });
      }

      // Use cached total from _updatePrice() to avoid recalculation
      const total = this._currentTotal || 0;

      // Build summary card DOM using DOM builder (no innerHTML per XSS safety decision [02-04])
      const buildCard = () => {
        const card = document.createElement('div');
        card.className = 'cfg-summary';

        for (const group of groups) {
          const groupEl = document.createElement('div');
          groupEl.className = 'cfg-summary__group';

          // Group header row: heading left, Edit button right
          const headerEl = document.createElement('div');
          headerEl.className = 'cfg-summary__group-header';

          const headingEl = document.createElement('div');
          headingEl.className = 'cfg-summary__heading';
          headingEl.textContent = group.heading;
          headerEl.appendChild(headingEl);

          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'cfg-summary__edit';
          editBtn.textContent = 'Edit';
          editBtn.dataset.editStep = String(group.stepNum);
          headerEl.appendChild(editBtn);

          groupEl.appendChild(headerEl);

          // Items
          for (const item of group.items) {
            const itemEl = document.createElement('div');
            itemEl.className = 'cfg-summary__item';

            // Thumbnail or placeholder
            if (item.image) {
              const img = document.createElement('img');
              img.className = 'cfg-summary__img';
              img.src = item.image;
              img.alt = item.label;
              img.loading = 'lazy';
              img.width = 48;
              img.height = 48;
              itemEl.appendChild(img);
            } else {
              const placeholder = document.createElement('div');
              placeholder.className = 'cfg-summary__img-placeholder';
              itemEl.appendChild(placeholder);
            }

            // Info: label + price
            const infoEl = document.createElement('div');
            infoEl.className = 'cfg-summary__item-info';

            const labelEl = document.createElement('span');
            labelEl.className = 'cfg-summary__item-label';
            labelEl.textContent = item.label;
            infoEl.appendChild(labelEl);

            const priceEl = document.createElement('span');
            priceEl.className = 'cfg-summary__item-price';
            const itemTotal = item.price * (item.qty || 1);
            priceEl.textContent = itemTotal > 0 ? money(itemTotal) : 'Included';
            infoEl.appendChild(priceEl);

            itemEl.appendChild(infoEl);
            groupEl.appendChild(itemEl);
          }

          card.appendChild(groupEl);
        }

        if (total > 0) {
          const totalEl = document.createElement('div');
          totalEl.className = 'cfg-summary__total';
          totalEl.textContent = `Total: ${money(total)}`;
          card.appendChild(totalEl);
        }

        // Event delegation for Edit buttons
        card.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-edit-step]');
          if (!btn) return;
          const stepNum = parseInt(btn.dataset.editStep, 10);
          this._scrollToStep(stepNum);
        });

        return card;
      };

      if (groups.length === 0) {
        if (this.summaryCard) { this.summaryCard.innerHTML = ''; this.summaryCard.style.display = 'none'; }
        if (this.summaryList) this.summaryList.innerHTML = '';
        return;
      }

      // Render to summary list section ("Your Configuration" step)
      if (this.summaryList) {
        this.summaryList.replaceChildren(buildCard());
      }
    }

    _buildConfigSummary() {
      // Helper: truncate title to max chars
      const trunc = (str, max = 20) => str && str.length > max ? str.slice(0, max - 1) + '…' : (str || '');

      const lines = [];

      // Base Model group (always present if model + size selected)
      if (this.state.model && this.state.size) {
        const tierTitle = trunc(this.state.selectedTier?.title || this.state.model);
        const ovenLabel = this.state.ovenType === 'internal' ? 'Int.' : 'Ext.';
        lines.push('Base');
        lines.push(`  ${tierTitle}, Sz ${this.state.size}, ${ovenLabel}`);
      }

      // Heating group — only oven addons (glass door, chimney) since oven is part of base
      const heatingItems = [];
      if (this.state.glassDoor) heatingItems.push('Glass door');
      if (this.state.chimney) heatingItems.push('Chimney');
      if (this.state.heaterConnection !== 'straight') heatingItems.push('90° conn.');
      if (heatingItems.length > 0) {
        lines.push('Heat');
        heatingItems.forEach(i => lines.push(`  ${trunc(i, 22)}`));
      }

      // Wellness group
      const wellnessItems = [];
      if (this.state.hydro) wellnessItems.push(trunc(this._getProductTitle('hydro', this.state.hydro)));
      if (this.state.air) wellnessItems.push(trunc(this._getProductTitle('air', this.state.air)));
      if (wellnessItems.length > 0) {
        lines.push('Wellness');
        wellnessItems.forEach(i => lines.push(`  ${i}`));
      }

      // Accessories group
      const accItems = [];
      if (this.state.liner) accItems.push(trunc(this._getProductTitle('liners', this.state.liner)));
      if (this.state.exterior) accItems.push(trunc(this._getProductTitle('exteriors', this.state.exterior)));
      if (this.state.cover) accItems.push(trunc(this._getProductTitle('covers', this.state.cover)));
      if (this.state.stairs) accItems.push('Stairs');
      if (this.state.led) accItems.push(trunc(this._getProductTitle('leds', this.state.led)));
      if (this.state.pillows) accItems.push(`Pillows x${this.state.pillowQty || 2}`);
      if (this.state.thermometer) accItems.push(trunc(this._getProductTitle('thermometers', this.state.thermometer)));
      if (this.state.filterEnabled && this.state.filterProduct) accItems.push(trunc(this._getProductTitle('filters', this.state.filterProduct)));
      if (accItems.length > 0) {
        lines.push('Acc');
        accItems.forEach(i => lines.push(`  ${i}`));
      }

      const summary = lines.join('\n');

      // Verify byte length — Shopify cart line item property limit is 255 chars, we target <200 bytes
      const byteLength = new TextEncoder().encode(summary).length;
      if (byteLength > 200) {
        // Fallback: compact single-line summary
        const fallbackParts = [];
        if (this.state.model && this.state.size) fallbackParts.push(`${trunc(this.state.selectedTier?.title || '', 12)} ${this.state.size}`);
        if (this.state.ovenType) fallbackParts.push(this.state.ovenType === 'internal' ? 'Int' : 'Ext');
        if (this.state.liner) fallbackParts.push(trunc(this._getProductTitle('liners', this.state.liner), 12));
        if (this.state.exterior) fallbackParts.push(trunc(this._getProductTitle('exteriors', this.state.exterior), 12));
        return fallbackParts.join(' | ');
      }

      return summary;
    }

    _getProductTitle(dataKey, productId) {
      const products = this.data[dataKey] || [];
      return products.find(p => p.id === productId)?.title || '—';
    }

    _getProductImage(dataKey, productId) {
      const products = this.data[dataKey] || [];
      if (productId === null || productId === undefined) {
        // For single-product categories stored as arrays (insulations, stairs, pillows)
        const product = Array.isArray(products) ? products[0] : products;
        return product?.image || null;
      }
      return products.find(p => p.id === productId)?.image || null;
    }

    /* ══ 7. CART & VALIDATION ════════════════════════════════════════════ */

    /**
     * Validates that all required steps have a selection.
     * REQUIRED: model_size (step 1), liner (step 2), oven/heating (step 4), exterior (step 5)
     * OPTIONAL: insulation, hydro, air, filter, led, thermometer, stairs, pillows, cover, controls, heater_conn
     * Returns { valid: boolean, missingStep: string | null }
     */
    _validateRequiredSteps() {
      if (!this.state.model || !this.state.size) {
        return { valid: false, missingStep: 'model_size' };
      }
      if (!this.state.liner) {
        return { valid: false, missingStep: 'liner' };
      }
      // oven step: baseVariantId resolves after model + size + ovenType are set
      if (!this.state.baseVariantId) {
        return { valid: false, missingStep: 'oven' };
      }
      if (!this.state.exterior) {
        return { valid: false, missingStep: 'exterior' };
      }
      return { valid: true, missingStep: null };
    }

    async _handleAddToCart() {
      this._hideError();

      // Validate all required steps before proceeding to cart API
      const validation = this._validateRequiredSteps();
      if (!validation.valid) {
        this._showToast('Please complete all required selections before adding to cart.');
        return;
      }

      this.ctaBtn.disabled = true;
      if (this.stickyCta) this.stickyCta.disabled = true;
      const originalText = this.ctaBtn.textContent;
      this.ctaBtn.textContent = 'Adding…';
      if (this.stickyCta) this.stickyCta.textContent = 'Adding…';

      try {
        const items = this._buildCartItems();
        if (items.length === 0) throw new Error('No items to add.');

        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.description || 'Could not add to cart. Please check your connection and try again.');
        }

        this.ctaBtn.textContent = '✓ Added to Cart!';
        if (this.stickyCta) this.stickyCta.textContent = '✓ Added!';
        window.dispatchEvent(new CustomEvent('cart:refresh'));
        setTimeout(() => {
          this.ctaBtn.textContent = originalText;
          this.ctaBtn.disabled = false;
          if (this.stickyCta) { this.stickyCta.textContent = 'Add to Cart'; this.stickyCta.disabled = false; }
        }, 2500);
      } catch (error) {
        console.error('[Configurator]', error);
        this._showError(error.message);
        this.ctaBtn.textContent = originalText;
        this.ctaBtn.disabled = false;
        if (this.stickyCta) { this.stickyCta.textContent = 'Add to Cart'; this.stickyCta.disabled = false; }
      }
    }

    _buildCartItems() {
      const items = [];
      const configSummary = this._buildConfigSummary();

      // 1. Base product (resolved variant — includes model + size + oven)
      if (this.state.baseVariantId) {
        items.push({
          id: this.state.baseVariantId,
          quantity: 1,
          properties: { '_config': 'base', 'Configuration': configSummary },
        });
      }

      // 2. Liner
      if (this.state.linerVariant) {
        items.push({ id: this.state.linerVariant, quantity: 1, properties: { '_config': 'liner' } });
      }

      // 3. Insulation
      if (this.state.insulation) {
        const p = (this.data.insulations || [])[0];
        if (p?.variants?.[0]?.id) items.push({ id: p.variants[0].id, quantity: 1, properties: { '_config': 'insulation' } });
      }

      // 4. Oven add-ons (glass door, chimney — no separate oven product)
      if (this.state.glassDoor) {
        const addon = (this.data.oven_addons || []).find(a => a.title.toLowerCase().includes('glass'));
        if (addon?.variants?.[0]?.id) items.push({ id: addon.variants[0].id, quantity: 1, properties: { '_config': 'oven-addon' } });
      }
      if (this.state.chimney) {
        const addon = (this.data.oven_addons || []).find(a => a.title.toLowerCase().includes('chimney'));
        if (addon?.variants?.[0]?.id) items.push({ id: addon.variants[0].id, quantity: 1, properties: { '_config': 'oven-addon' } });
      }

      // 5. Exterior
      if (this.state.exteriorVariant) {
        items.push({ id: this.state.exteriorVariant, quantity: 1, properties: { '_config': 'exterior' } });
      }

      // 6-7. Hydro & Air
      for (const [key, qtyKey] of [['hydro', 'hydroNozzles'], ['air', 'airNozzles']]) {
        if (this.state[key]) {
          const p = (this.data[key] || []).find(pr => pr.id === this.state[key]);
          if (p?.variants?.[0]?.id) {
            items.push({ id: p.variants[0].id, quantity: 1, properties: { '_config': key, 'Nozzles': String(this.state[qtyKey]) } });
          }
        }
      }

      // 8. Filter
      if (this.state.filterEnabled && this.state.filterProduct) {
        const p = (this.data.filters || []).find(pr => pr.id === this.state.filterProduct);
        if (p?.variants?.[0]?.id) items.push({ id: p.variants[0].id, quantity: 1, properties: { '_config': 'filter' } });
      }

      // 9. LED
      if (this.state.led) {
        const p = (this.data.leds || []).find(pr => pr.id === this.state.led);
        if (p?.variants?.[0]?.id) items.push({ id: p.variants[0].id, quantity: this.state.ledQty || 1, properties: { '_config': 'led' } });
      }

      // 10. Thermometer
      if (this.state.thermometer) {
        const p = (this.data.thermometers || []).find(pr => pr.id === this.state.thermometer);
        if (p?.variants?.[0]?.id) items.push({ id: p.variants[0].id, quantity: 1, properties: { '_config': 'thermometer' } });
      }

      // 11. Stairs
      if (this.state.stairs) {
        const p = (this.data.stairs || [])[0];
        if (p?.variants?.[0]?.id) items.push({ id: p.variants[0].id, quantity: 1, properties: { '_config': 'stairs' } });
      }

      // 12. Pillows
      if (this.state.pillows) {
        const p = (this.data.pillows || [])[0];
        if (p?.variants?.[0]?.id) items.push({ id: p.variants[0].id, quantity: this.state.pillowQty || 2, properties: { '_config': 'pillows' } });
      }

      // 13. Cover
      if (this.state.coverVariant) {
        items.push({ id: this.state.coverVariant, quantity: 1, properties: { '_config': 'cover' } });
      }

      // 15. Heater 90°
      if (this.state.heaterConnection === '90-degree' && this.data.heater_90?.variants?.[0]?.id) {
        items.push({ id: this.data.heater_90.variants[0].id, quantity: 1, properties: { '_config': 'heater-connection' } });
      }

      return items;
    }

    _showError(msg) {
      if (!this.cartError) return;
      this.cartError.innerHTML = '';

      const msgEl = document.createElement('span');
      msgEl.textContent = msg;

      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'cfg__retry-btn';
      retryBtn.textContent = 'Try again';
      retryBtn.dataset.action = 'retry-cart';

      this.cartError.appendChild(msgEl);
      this.cartError.appendChild(retryBtn);
      this.cartError.style.display = 'flex';
    }

    _hideError() {
      if (this.cartError) { this.cartError.innerHTML = ''; this.cartError.style.display = 'none'; }
    }

    /* ══ 8. UI UTILITIES ════════════════════════════════════════════════ */

    _initStickyBar() {
      if (!this.stickyBar) return;

      // Show/hide sticky bar based on whether the main CTA is visible
      const bottom = this.querySelector('.cfg__bottom');
      if (bottom && 'IntersectionObserver' in window) {
        this._stickyObserver = new IntersectionObserver((entries) => {
          const isVisible = entries[0].isIntersecting;
          this.stickyBar.classList.toggle('cfg-sticky-bar--visible', !isVisible);
        }, { threshold: 0 });
        this._stickyObserver.observe(bottom);
      }
    }

    _showToast(message, duration = 3000) {
      const existing = this.querySelector('.cfg-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'cfg-toast';
      toast.textContent = message;
      this.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add('cfg-toast--visible'));
      setTimeout(() => {
        toast.classList.remove('cfg-toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      }, duration);
    }

    _preloadImage(url) {
      return new Promise((resolve) => {
        if (!url) { resolve(); return; }
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // resolve on error too — don't block UI
        img.src = url;
      });
    }

    _setMainImage(url) {
      if (!this.mainImage || !url) return;
      if (this.placeholder) this.placeholder.style.display = 'none';
      this.mainImage.style.display = 'block';
      this.mainImage.classList.add('cfg-main-image--fade');
      if (this.imgLoader) this.imgLoader.style.display = 'flex';
      setTimeout(() => {
        this.mainImage.src = url;
        this.mainImage.onload = () => { this.mainImage.classList.remove('cfg-main-image--fade'); if (this.imgLoader) this.imgLoader.style.display = 'none'; };
        this.mainImage.onerror = () => { this.mainImage.classList.remove('cfg-main-image--fade'); if (this.imgLoader) this.imgLoader.style.display = 'none'; };
      }, 120);
    }

    _updateGallery(images) {
      if (!this.gallery || !images?.length) return;
      this.gallery.innerHTML = images.map((img, i) => `
        <div class="cfg-thumb ${i === 0 ? 'cfg-thumb--active' : ''}" data-thumb-idx="${i}" tabindex="0" role="button" aria-label="View image ${i + 1}">
          <img src="${img.thumb || img.src}" alt="${img.alt || 'Hot tub view'}" loading="lazy">
        </div>
      `).join('');
      if (images[0]) this._preloadImage(images[0].src);
      if (images[0]) this._setMainImage(images[0].src);

      this.gallery.addEventListener('click', (e) => {
        const thumb = e.target.closest('[data-thumb-idx]');
        if (!thumb) return;
        const idx = parseInt(thumb.dataset.thumbIdx);
        this.gallery.querySelectorAll('.cfg-thumb').forEach((t, i) => t.classList.toggle('cfg-thumb--active', i === idx));
        if (images[idx]) this._preloadImage(images[idx].src);
        if (images[idx]) this._setMainImage(images[idx].src);
      });
    }

    _scrollToStep(num) {
      const el = this._stepEls[num];
      if (!el) return;
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }

    _showTooltip(btn) {
      this._closeTooltips();
      const text = btn.dataset.tooltip;
      if (!text) return;
      const tip = document.createElement('div');
      tip.className = 'cfg-tooltip';
      tip.textContent = text;
      btn.style.position = 'relative';
      btn.appendChild(tip);
    }

    _closeTooltips() {
      this.querySelectorAll('.cfg-tooltip').forEach(t => t.remove());
    }

    _escAttr(str) {
      return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
    }
  }

  // Register custom elements — discover tag names from DOM
  function init() {
    document.querySelectorAll('[data-cfg-tag]').forEach(el => {
      const tag = el.dataset.cfgTag;
      if (tag && !customElements.get(tag)) {
        customElements.define(tag, HotTubConfigurator);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
