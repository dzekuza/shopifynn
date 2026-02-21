---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - templates/index.json
  - templates/product.json
  - templates/page.partner.json
autonomous: true
requirements: [QUICK-5]
must_haves:
  truths:
    - "Pulled theme changes (index.json, product.json) are committed to git"
    - "Visiting /pages/partner renders a Become a Partner page with hero, benefits, perks, next steps, and contact form"
    - "All sections on the partner page are editable via Shopify theme editor"
  artifacts:
    - path: "templates/page.partner.json"
      provides: "Partner page template composing existing sections"
      contains: "become-a-partner"
  key_links:
    - from: "templates/page.partner.json"
      to: "sections/hero.liquid, sections/image-with-text.liquid, sections/features.liquid, sections/rich-text.liquid, sections/contact-form.liquid"
      via: "JSON template section type references"
      pattern: "\"type\": \"hero\"|\"type\": \"image-with-text\"|\"type\": \"features\"|\"type\": \"rich-text\"|\"type\": \"contact-form\""
---

<objective>
Commit pulled Aurora theme changes and create a "Become a Partner" page template for Aurowe's dealer/partner program.

Purpose: Preserve remote theme updates and add a new partnership landing page using only existing section types.
Output: Git commit of pulled changes + new `templates/page.partner.json` template file.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@./templates/page.about.json (reference for JSON template structure)
@./templates/page.contact.json (reference for contact-form section usage)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Commit pulled theme changes</name>
  <files>templates/index.json, templates/product.json</files>
  <action>
    Stage and commit the two files changed by the theme pull (`templates/index.json` and `templates/product.json`).
    Commit message: "chore: pull Aurora theme changes (index, product templates)"
    These files were already modified by a prior `shopify theme pull --theme 196755292491` command.
  </action>
  <verify>Run `git log --oneline -1` to confirm the commit exists with the expected message.</verify>
  <done>Pulled theme changes are committed to git history.</done>
</task>

<task type="auto">
  <name>Task 2: Create Become a Partner page template</name>
  <files>templates/page.partner.json</files>
  <action>
    Create `templates/page.partner.json` composing these existing sections in order:

    1. **Hero section** (type: "hero", id: "partner-hero"):
       - subtitle: "Partnership Program"
       - heading: "Become a Partner"
       - text: "Join the Aurowe dealer network and bring Nordic wellness to your customers. We provide premium hot and cold tubs backed by exceptional craftsmanship, competitive margins, and dedicated partner support."
       - button_text: "Apply Now", button_url: "#partner-contact", button_style: "primary"
       - heading_size: "large", text_alignment: "center", content_width: 800
       - padding_top: 0, padding_bottom: 0

    2. **Image-with-text section** (type: "image-with-text", id: "partner-benefits"):
       - subtitle: "Why Partner With Us"
       - heading: "A Partnership Built on Quality"
       - text: "<p>Aurowe tubs are handcrafted from sustainably sourced Nordic thermowood, designed to last decades. As a partner, you represent a brand customers trust — backed by 25+ years of Scandinavian craftsmanship. We equip you with everything you need to succeed: product training, marketing assets, and a dedicated account manager who understands your market.</p>"
       - layout: "image_left", heading_size: "medium", text_size: "medium"
       - color_scheme: "default", padding_top: 80, padding_bottom: 80

    3. **Features section** (type: "features", id: "partner-perks"):
       - heading: "Partnership Perks"
       - subheading: "Everything you need to grow your wellness business."
       - columns: "3", text_alignment: "center", color_scheme: "surface"
       - padding_top: 80, padding_bottom: 80
       - 6 feature blocks:
         a. icon: "star", heading: "Competitive Margins", text: "Attractive wholesale pricing with volume-based tier discounts that grow as your business grows."
         b. icon: "shield", heading: "Exclusive Territory", text: "Protected sales territories ensure you are the sole Aurowe representative in your region."
         c. icon: "truck", heading: "Drop Shipping Available", text: "We handle logistics and ship directly to your customers, so you can focus on selling."
         d. icon: "palette", heading: "Marketing Support", text: "Access to professional product photography, brochures, digital assets, and co-branded marketing materials."
         e. icon: "award", heading: "Product Training", text: "Comprehensive onboarding and ongoing training on our full product range, installation, and maintenance."
         f. icon: "globe", heading: "International Reach", text: "Join a growing network of partners across Europe and beyond with dedicated regional support."

    4. **Rich-text section** (type: "rich-text", id: "partner-how-to-apply"):
       - text_alignment: "center", content_width: 700
       - color_scheme: "default", padding_top: 80, padding_bottom: 60
       - Blocks (in order):
         a. type: "heading" — heading: "How to Get Started", heading_size: "medium"
         b. type: "text" — text: "<p>Becoming an Aurowe partner is straightforward. Fill out the inquiry form below with details about your business, and our partnership team will review your application within 5 business days. Once approved, you will receive access to our partner portal, wholesale pricing, and a dedicated account manager to help you launch.</p>", text_size: "medium"

    5. **Contact-form section** (type: "contact-form", id: "partner-contact"):
       - heading: "Partner Inquiry"
       - text: "<p>Tell us about your business and how you would like to partner with Aurowe. We will be in touch shortly.</p>"
       - show_phone: true
       - button_text: "Submit Inquiry"
       - success_message: "Thank you for your interest in partnering with Aurowe. Our team will review your application and contact you within 5 business days."
       - heading_size: "large", text_size: "medium", text_alignment: "left"
       - color_scheme: "default", padding_top: 60, padding_bottom: 100

    Follow the exact JSON structure used in `page.about.json` — top-level `sections` object with named keys, then `order` array listing section IDs.

    Commit the new file with message: "feat: add Become a Partner page template"
  </action>
  <verify>
    Validate JSON is well-formed: `python3 -c "import json; json.load(open('templates/page.partner.json'))"`.
    Verify all section types exist: each "type" value in the JSON corresponds to an existing file in `sections/`.
    Run `git log --oneline -2` to confirm both commits exist.
  </verify>
  <done>
    `templates/page.partner.json` exists with valid JSON, references only existing section types (hero, image-with-text, features, rich-text, contact-form), and is committed to git.
  </done>
</task>

</tasks>

<verification>
- `git log --oneline -3` shows both new commits
- `python3 -c "import json; json.load(open('templates/page.partner.json'))"` succeeds
- All section types in the template match files in `sections/` directory
</verification>

<success_criteria>
- Pulled theme changes (index.json, product.json) committed
- Partner page template created with 5 sections: hero, image-with-text, features, rich-text, contact-form
- All JSON valid, all section types reference existing sections
- Both changes committed to git
</success_criteria>

<output>
After completion, create `.planning/quick/5-pull-aurora-theme-changes-and-create-bec/5-SUMMARY.md`
</output>
