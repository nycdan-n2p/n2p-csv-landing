# net2phone Brand Guidelines

Reference document for net2phone visual identity. When you see "net2phone branding" or "match net2phone branding," use this spec.

---

## 1. Logo & Wordmark

### Logo Mark (Icon)
- **Form:** A stylized, bold number **"2"**
- **Treatment:** Vibrant gradient (light blue at top → pink/magenta at bottom)
- **Usage:** Primary brand mark; used in app icons, favicons, social avatars

### Wordmark
- **Spelling:** "net2phone" (lowercase, no spaces)
- **Style:** Bold, italicized, sans-serif
- **Treatment on dark backgrounds:** White
- **Treatment on light backgrounds:** Dark navy or black (#001f3f or #0e0e0d)

---

## 2. Color Palette

### Primary Colors
| Role | Hex | Usage |
|------|-----|-------|
| **Navy Blue** | `#001f3f` | Primary backgrounds, nav, sidebar, headlines on light backgrounds |
| **Deep Navy** | `#0e0e0d` | Dark sections, footer, high-contrast text |
| **White** | `#ffffff` | Light backgrounds, body text on dark sections |

### Accent Gradient (Signature)
- **Direction:** Horizontal, left to right
- **Stops:** Cyan → Light Blue → Magenta → Pink → Purple
- **Approximate values:** 
  - Start: `#00d4ff` / `#00b4d8` (cyan, sky blue)
  - Mid: `#e040fb` / `#d946ef` (magenta)
  - End: `#7c3aed` / `#6d28d9` (purple)
- **Usage:** Hero headlines, CTAs, logo icon, accent lines, underlines, highlights, glow effects

### Secondary / UI Colors
| Role | Hex | Usage |
|------|-----|-------|
| **Bright Cyan/Sky Blue** | `#00b4d8` / `#0ea5e9` | Emphasis in headlines, active states, primary buttons |
| **Muted Gray** | `#6b7280` / `#9ca3af` | Secondary text, borders, icons |

---

## 3. Typography

### Font Family
- **Style:** Modern, geometric sans-serif
- **Similar to:** Montserrat, Roboto, Geomanist
- **Avoid:** Serif fonts for body copy; overly decorative or script fonts

### Hierarchy
- **Headlines:** Bold, large. Use gradient or bright blue for emphasis words.
- **Subheadlines:** Bold, slightly smaller. White on dark; navy on light.
- **Body:** Regular weight, white or dark gray depending on background.
- **Labels / Meta:** Smaller, uppercase optional, muted gray.

---

## 4. Visual Style & Graphic Elements

### Layout
- **Backgrounds:** Clean white or deep navy. Avoid busy patterns.
- **Spacing:** Generous white space. Uncluttered, focused layouts.
- **Rounded corners:** Buttons, cards, modals, icons (border-radius 8–12px).

### Accent Elements
- **Gradient line:** Thin horizontal or circular line using cyan→magenta gradient as visual anchor.
- **Glow / soft gradient:** Subtle cyan–magenta gradient in corners or behind key elements.
- **Icons:** Thin, dark-gray line icons in white circular containers; can sit on gradient ring.

### UI Aesthetic
- **Sidebar/Nav:** Dark navy background.
- **Content area:** White or very light gray.
- **Buttons:** Primary = gradient or bright blue; secondary = outline on white/navy.
- **Message bubbles / cards:** Rounded corners, clean borders.

---

## 5. Brand Voice & Tone

### Visual
- **Professional yet modern:** Navy conveys trust and stability; gradient conveys innovation and energy.
- **Tech-focused:** Clean, minimal, B2B telecommunications.
- **Frictionless:** White space and simplicity suggest ease of use.

### Copy
- **Confident, clear:** Avoid jargon. Be direct.
- **Aspirational:** Forward-thinking, AI-ready, future of communications.

---

## 6. Implementation Notes (CSS)

```css
/* Primary palette */
--n2p-navy: #001f3f;
--n2p-navy-dark: #0e0e0d;
--n2p-white: #ffffff;

/* Gradient (use for headlines, CTAs, accents) */
--n2p-gradient: linear-gradient(90deg, #00b4d8, #e040fb, #7c3aed);

/* Secondary */
--n2p-cyan: #00b4d8;
--n2p-magenta: #e040fb;
--n2p-purple: #7c3aed;
```

### Dark Section Example
- Background: `#001f3f` or `#0e0e0d`
- Headlines: white or gradient
- Body: `rgba(255,255,255,0.9)` or white
- Accent line: gradient

### Light Section Example
- Background: white or `#f8fafc`
- Headlines: navy, with key words in cyan or gradient
- Body: dark gray `#374151`
- Borders: `#e5e7eb`

---

## 7. References

- Social / product graphics: Navy + white + cyan→magenta gradient
- Event/promo graphics: Dark navy background, gradient headlines, white body text, bold italic lowercase "net2phone" wordmark
- AI Coach Branding Concepts V1.pdf: Additional design options (Options 1–5) for AI-specific sub-brands

---

*Last updated: March 2025. When in doubt, prioritize navy stability + gradient innovation.*
