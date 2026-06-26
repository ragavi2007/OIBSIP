# Amber — A Retro-Instrument Calculator

A browser-based calculator built with **HTML5, CSS3, and Vanilla JavaScript** — no frameworks, no libraries, no `eval()`. Designed to look and feel like a real physical instrument: a brushed-metal control panel with a glowing amber LED display, rather than a generic glassy app UI.

---

## ✨ Features

- **Core arithmetic** — addition, subtraction, multiplication, and division
- **Operator chaining** — e.g. typing `5 + 3 × 2 =` correctly resolves step-by-step (`5+3=8`, then `8×2=16`)
- **Decimal support** — with input validation so a number can't contain two decimal points
- **Backspace** — deletes the last character of the current entry
- **Clear (C)** — resets the calculator completely
- **Percent (%)** — converts the current entry to a percentage
- **Divide-by-zero protection** — shows `Error: Cannot divide by zero` on the display instead of crashing or showing `Infinity`
- **Keyboard support** — number keys, `+ - * /`, `Enter`/`=`, `Backspace`, and `Esc` all work alongside on-screen clicks
- **Floating-point cleanup** — results like `0.1 + 0.2` display as `0.3`, not `0.30000000000000004`
- **Signature LED "flicker" animation** — the display briefly flickers on every update, like a real digital readout warming up
- **Tactile key-press animation** — every button visually depresses on click, with matching shadow collapse
- **Fully responsive** — scales down cleanly to small mobile screens
- **Accessible** — visible keyboard focus states, `aria-live` display region, and reduced-motion support

---

## 🛠️ Technologies Used

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic markup, no inline JS) |
| Styling | CSS3 (CSS Grid, custom properties, keyframe animations) |
| Logic | Vanilla JavaScript (ES6+, `addEventListener`, `switch` statements, `parseFloat`) |
| Fonts | Google Fonts — `Space Grotesk` (UI) + `DSEG7 Classic` (LED-style digits, with a monospace fallback) |

No build tools, no package manager, no external JS libraries. Just three files.

---

## 📁 Project Structure

```
calculator/
├── index.html      # Markup and layout
├── style.css       # All visual design, animations, and responsive rules
├── script.js       # Calculator logic and event wiring
└── README.md       # This file
```

---

## 🚀 How to Run

No installation or build step is required.

1. Download or clone the three files (`index.html`, `style.css`, `script.js`) into the same folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari) — by double-clicking it, or via **File → Open**.
3. Start calculating! Click the on-screen keys, or use your keyboard (`0–9`, `.`, `+ - * /`, `Enter`, `Backspace`, `Esc`).

**Optional — running via a local server** (recommended only if your browser blocks Google Fonts on `file://` URLs):

```bash
# From inside the project folder
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

---

## 🎨 Design Notes

The visual direction deliberately avoids the typical "dark mode neon" calculator look. Instead:

- The body reads as a **machined panel** — beveled edges, corner rivets, and a recessed display housing with an inset shadow.
- The display uses a **segmented-LED-style font** with an amber glow, paired with a soft scanline texture across the "glass."
- Every key has **real depth**: a colored drop-shadow "lifts" the key off the panel, and pressing it collapses that shadow so the key visually sinks — no flat material-design buttons.
- The single accent color (amber) is reserved for the display glow, the active/chained operator, and the equals key — keeping the rest of the panel quiet and disciplined.



## ✅ Project Checklist Coverage

- [x] Display screen for input and result
- [x] Number buttons 0–9 and decimal point
- [x] Addition, subtraction, multiplication, division
- [x] Equals and Clear buttons
- [x] Backspace/Delete button
- [x] No inline JS (`onclick` etc.) — external `script.js` only, wired via `addEventListener()`
- [x] No `eval()` — arithmetic handled via a `switch` statement and `parseFloat()`
- [x] Operator chaining without resetting
- [x] Divide-by-zero guarded with a clear error message
- [x] Responsive, animated, professional UI built with CSS Grid
