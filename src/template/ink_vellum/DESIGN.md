# Design System Document

## 1. Overview & Creative North Star: "The Analog Digitalist"

This design system is built to bridge the tactile soul of a physical Moleskine with the efficiency of a high-end digital interface. Our Creative North Star is **"The Analog Digitalist."** We are not building a typical "app"; we are crafting a sanctuary for thought. 

To move beyond the generic "template" look, this system rejects the rigid constraints of standard material grids in favor of **intentional editorial asymmetry**. We treat the screen as a high-quality sheet of 120gsm paper. Layouts should feel "typeset" rather than "programmed." By using extreme typographic scales and high-contrast ink-on-paper values, we create a signature experience that feels premium, quiet, and profoundly intentional.

---

## 2. Colors: Ink, Paper, and Atmosphere

The palette is strictly monochromatic, relying on tonal depth rather than hue to convey meaning. We use the warmth of `#f9f9f7` (Surface) to mimic unbleached paper and `#000000` (Primary) to represent fresh ink.

- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. For example, a sidebar should use `surface-container-low` against a `surface` main body. This maintains the "continuous sheet" feel of a journal.
- **Surface Hierarchy & Nesting:** Use surface tiers to create physical depth. 
    - **Base:** `surface` (#f9f9f7)
    - **In-set Content:** `surface-container-low` (#f4f4f2)
    - **Elevated Modals:** `surface-container-highest` (#e2e3e1)
- **The "Glass & Gradient" Rule:** To prevent the UI from feeling "flat" or "dead," use Glassmorphism for floating navigation bars or action menus. Use `surface` at 80% opacity with a `20px` backdrop blur. This allows the subtle dot grid patterns underneath to bleed through, softening the interface.
- **Signature Textures:** Implement a subtle 8px dot grid pattern using `outline-variant` at 15% opacity across `surface` areas to reinforce the bullet journal metaphor.

---

## 3. Typography: The Editorial Edge

The typography system is a dialogue between the classic authority of the serif **Newsreader** and the modern clarity of the sans-serif **Work Sans**.

- **Display & Headlines (Newsreader):** These are our "Ink" moments. Use `display-lg` (3.5rem) with generous bottom margins (`spacing-12`) to create an editorial, magazine-like feel. The serif's slight irregularities mimic the bleed of ink on paper.
- **Body & Labels (Work Sans):** Used for functional data and user input. The high x-height of Work Sans ensures legibility even at `body-sm` (0.75rem).
- **The Hierarchy Strategy:** Use extreme contrast. A `display-md` header should often be paired with a `label-md` date in all-caps with `0.1rem` letter spacing. This "High-Low" pairing is what makes the design feel custom and premium.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "digital" for this aesthetic. We achieve hierarchy through **Tonal Layering**.

- **The Layering Principle:** Stack containers to show importance. A task list card (`surface-container-lowest`) placed on a page background (`surface`) creates a soft, natural lift.
- **Ambient Shadows:** If a floating element (like a FAB) requires a shadow, use a "Paper Shadow": `box-shadow: 0 10px 30px rgba(26, 28, 27, 0.04)`. The shadow color is derived from `on-surface` at a very low opacity to mimic natural ambient light.
- **The "Ghost Border" Fallback:** For input fields where a boundary is required for accessibility, use a "Ghost Border": `outline-variant` at 20% opacity. Never use 100% opaque black borders unless it is a deliberate "Brutalist" design choice for a primary CTA.

---

## 5. Components: Tactile Primitives

### Buttons
- **Primary:** Solid `primary` (#000000) with `on-primary` text. No rounded corners (`rounded-none`) or a very slight `rounded-sm` (0.125rem) to mimic a stamped ink block.
- **Tertiary:** Text-only with an underline that appears on hover, mimicking a handwritten link.

### Input Fields
- **Design:** Forgo the box. Use a single bottom-weighted line (`outline-variant` at 30%) or a simple `surface-container-low` background block.
- **State:** On focus, the bottom line transitions to `primary` (black). Error states use `error` (#ba1a1a) text but keep the container neutral to avoid "visual noise."

### Cards & Lists
- **The Divider Rule:** Forbid 1px horizontal dividers. Separate journal entries using `spacing-8` or `spacing-10` vertical white space. If separation is visually necessary, use a subtle background shift to `surface-container-low`.

### Chips
- **Selection:** Use `secondary-container` with `on-secondary-container` text. Shapes should be `rounded-full` to provide a soft visual counterpoint to the sharp-edged layout.

### Custom Component: The "Ink-Drop" Progress
- Use a variable-width stroke that looks hand-drawn for progress circles or mood trackers, utilizing the `primary` color to emphasize the "ink" theme.

---

## 6. Do's and Don'ts

### Do:
- **Do** use excessive white space. If a layout feels "full," increase the spacing by two increments on the scale.
- **Do** lean into asymmetry. Align a header to the left while keeping the body text centered to create visual tension.
- **Do** use `surface-dim` for empty states to create a "recessed" feeling.

### Don't:
- **Don't** use pure blue or vibrant "app" colors. Stick to the monochromatic scale provided.
- **Don't** use standard "Material Design" shadows. They break the paper metaphor.
- **Don't** overcrowd the screen with icons. Use text labels (Newsreader italic) wherever possible to maintain the editorial aesthetic.
- **Don't** use 100% black text on 100% white backgrounds. Use `on-surface` (#1a1c1b) on `surface` (#f9f9f7) to reduce eye strain and feel more like premium paper.