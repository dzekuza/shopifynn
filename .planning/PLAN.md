# Shopify Theme: Aurowe — Hot & Cold Tubs

## Overview

Build a complete Shopify theme for Aurowe, a premium Nordic hot and cold tub brand. Start with the landing page (homepage), then expand to product, collection, cart, and other pages.

**Brand DNA:** Nordic/Scandinavian minimalism, premium positioning, clean lines, natural materials
**Typography:** DM Sans (400-700)
**Price Range:** €5,000 - €9,000+
**Product Tiers:** Classic, Premium, Signature (sizes M/L/XL)

---

## Phase 1: Theme Foundation + Landing Page

### Step 1 — Scaffold theme directory structure

Create all required directories and config files:

```
shopifynn/
├── assets/
│   ├── theme.css          # Main stylesheet
│   └── theme.js           # Main JavaScript
├── config/
│   ├── settings_schema.json  # Theme editor settings
│   └── settings_data.json    # Default values
├── layout/
│   └── theme.liquid       # Base HTML wrapper
├── locales/
│   └── en.default.json    # English translations
├── sections/
│   ├── header.liquid      # Sticky nav with logo
│   ├── footer.liquid      # Footer with links/social
│   ├── hero.liquid        # Full-width hero banner
│   ├── featured-collections.liquid  # Hot Tubs vs Cold Tubs
│   ├── product-tiers.liquid         # Classic/Premium/Signature
│   ├── features.liquid              # Why Aurowe benefits grid
│   ├── lifestyle-gallery.liquid     # Image gallery
│   ├── testimonials.liquid          # Customer reviews
│   └── newsletter.liquid            # Email signup
├── snippets/
│   ├── product-card.liquid
│   └── icon.liquid
└── templates/
    └── index.json         # Landing page section order
```

### Step 2 — Config: `settings_schema.json`

Theme settings for the Shopify editor:
- **Colors**: Primary (dark charcoal), secondary (warm wood tone), accent, background, text
- **Typography**: Headings + body font selectors (default DM Sans)
- **Logo**: Image upload
- **Social**: Social media links
- **Newsletter**: Klaviyo/Mailchimp integration ID

### Step 3 — Layout: `theme.liquid`

Base HTML with:
- Meta tags, viewport, charset
- `{{ content_for_header }}` (Shopify scripts)
- DM Sans from Google Fonts
- CSS + JS asset includes
- Header section, `{{ content_for_layout }}`, footer section

### Step 4 — Sections for Landing Page

**Hero (`hero.liquid`):**
- Full-viewport height background image
- Overlay with headline: "Nordic Warmth, Crafted for You"
- Subtext + CTA button → collection or configurator
- Schema: image, heading, subtext, button text/link, overlay opacity

**Featured Collections (`featured-collections.liquid`):**
- Two large cards side by side: "Hot Tubs" / "Cold Tubs"
- Each with image, title, description, "Explore" link
- Schema: 2 blocks (collection picker, image, heading, description)

**Product Tiers (`product-tiers.liquid`):**
- Three columns: Classic (from €5,000), Premium (from €7,000), Signature (from €9,000)
- Each with image, name, starting price, key features list, CTA
- Schema: section heading + 3 blocks with all fields

**Features (`features.liquid`):**
- Grid of 4-6 benefit cards with icons
- Examples: "Handcrafted in Scandinavia", "Premium Materials", "10-Year Warranty", "Custom Finishes"
- Schema: heading + repeatable blocks (icon, title, description)

**Lifestyle Gallery (`lifestyle-gallery.liquid`):**
- Masonry/grid of lifestyle images
- Schema: repeatable image blocks

**Testimonials (`testimonials.liquid`):**
- Carousel or grid of customer quotes
- Schema: repeatable blocks (quote, name, location, rating)

**Newsletter (`newsletter.liquid`):**
- Heading + email input + subscribe button
- Connects to Shopify customer system
- Schema: heading, subtext, button label

**Header (`header.liquid`):**
- Sticky transparent header that goes solid on scroll
- Logo left, nav center (Collections, Products, About, Contact), cart icon right
- Mobile hamburger menu
- Schema: logo, nav links, announcement bar text

**Footer (`footer.liquid`):**
- 4-column layout: About, Quick Links, Customer Service, Newsletter
- Social icons row
- Copyright + payment icons
- Schema: column content, social links

### Step 5 — Stylesheet: `assets/theme.css`

- CSS custom properties for all brand colors/spacing
- Mobile-first responsive design
- Sections styled individually with BEM-like naming
- Smooth scroll, transitions, hover states
- Grid/flexbox layout system

### Step 6 — JavaScript: `assets/theme.js`

- Sticky header scroll behavior
- Mobile menu toggle
- Testimonials carousel (vanilla JS, no dependencies)
- Smooth scroll for anchor links
- Newsletter form AJAX submission

### Step 7 — Template: `templates/index.json`

Wire all sections together in order:
1. hero
2. featured-collections
3. product-tiers
4. features
5. lifestyle-gallery
6. testimonials
7. newsletter

---

## Files to Create (19 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `config/settings_schema.json` | Theme editor settings |
| 2 | `config/settings_data.json` | Default settings values |
| 3 | `layout/theme.liquid` | Base HTML layout |
| 4 | `locales/en.default.json` | English translations |
| 5 | `assets/theme.css` | All styles |
| 6 | `assets/theme.js` | All JavaScript |
| 7 | `sections/header.liquid` | Header/navigation |
| 8 | `sections/footer.liquid` | Footer |
| 9 | `sections/hero.liquid` | Hero banner |
| 10 | `sections/featured-collections.liquid` | Hot/Cold tubs |
| 11 | `sections/product-tiers.liquid` | Classic/Premium/Signature |
| 12 | `sections/features.liquid` | Benefits grid |
| 13 | `sections/lifestyle-gallery.liquid` | Image gallery |
| 14 | `sections/testimonials.liquid` | Customer reviews |
| 15 | `sections/newsletter.liquid` | Email signup |
| 16 | `snippets/product-card.liquid` | Reusable product card |
| 17 | `snippets/icon.liquid` | SVG icon helper |
| 18 | `templates/index.json` | Landing page template |
| 19 | `templates/404.json` | 404 page |

---

## Color Palette (derived from aurowe.com)

- **Primary:** `#1a1a1a` (near black — text, headers)
- **Secondary:** `#8B7355` (warm wood tone — accents)
- **Accent:** `#C4A882` (light gold — CTAs, highlights)
- **Background:** `#FAFAF8` (warm off-white)
- **Surface:** `#F0EDE8` (cards, sections)
- **White:** `#FFFFFF`
- **Muted text:** `#6B6B6B`
