# Sift - Design Tokens (Stitch Extraction)

## 1. Typography
- **Headings (Brand/Editorial):** `Fraunces` (serif) - used for major section headers (e.g., "Your Cycle Patterns", "Is it your cycle, or your life?"). Font weight: Medium/Semi-bold (500-600).
- **Body UI & Text:** `DM Sans` (sans-serif) - used for descriptions, buttons, labels. Font weight: Regular (400) to Medium (500).
- **Microcopy (Eyebrow labels):** Uppercase, wide letter-spacing (e.g., "OBSERVED RHYTHM"), typically `DM Sans` bold/semi-bold at 11-12px.

## 2. Color Palette
- **Backgrounds:**
  - App Background: `#F7F9F9` (cool off-white/pale slate)
  - Card Background: `#FFFFFF`
- **Text:**
  - Primary Text: `#1A2421` (extremely dark slate/green)
  - Secondary Text: `#4A5E57` (muted slate/sage)
- **Accents (Theming):**
  - **Brand Primary (Sage):** `#4B6356` - used for primary buttons ("Prepare Doctor-Ready Evidence Packet").
  - **Luteal / Stress (Peach):** Background `#FDEEE6`, Number Highlight (`2.1`) `#B86C45`.
  - **Follicular / Steady (Green):** Background `#E5F0E6`, Number Highlight (`3.9`) `#4B8A5F`.
  - **Interactive Pills (`SAMPLE DATA`):** Background `#E7ECEF`, Text `#556877`.

## 3. Layout & Structure
- **Padding/Margins:** Generous (24px to 32px between sections).
- **Border Radii:**
  - Soft Cards: `16px` to `20px` rounding.
  - Pills: `99px` (fully rounded).
  - Buttons: `12px` to `16px`.
- **Shadows:** Very subtle, mostly leveraging background color contrast (off-white bg vs white card) rather than heavy drop shadows. Borders are faint, e.g., `1px solid #EAEAEA` where necessary.

## 4. Components
- **Top Nav:** Logo on the left, pill + action icons (profile/heart) on the right.
- **Bottom Nav:** 4 icons with labels (Check-in, Pattern, Evidence, Support).
- **Info Cards:** Light color-coded cards for specific phases (e.g., Luteal Phase box in peach, Follicular Phase box in soft green).
- **Charts:** Line charts with smooth bezier curves (Recharts `type="monotone"` or `basis`), utilizing the green/peach token colors.
- **Lists / Checklists:** Circular checkboxes, checkmark icons inside green badges for confidence levels (`87% Recurrence`).
