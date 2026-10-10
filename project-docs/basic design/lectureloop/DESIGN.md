---
name: LectureLoop
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#005522'
  on-tertiary: '#ffffff'
  tertiary-container: '#00702f'
  on-tertiary-container: '#78f591'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 4rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  title-md:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.0625rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.025em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system drives an AI-native adaptive education interface, fusing the analytical precision of developer tools with the narrative clarity of workspace docs and the micro-delight of modern learning software. It addresses university students, self-directed professionals, and lifelong learners who demand high-velocity mastery without visual distraction.

The aesthetic combines **Modern Minimalist SaaS** with **Tactile Educational Polish**:
- **Clarity over ornament:** Generous whitespace, precise 1px borders, and disciplined information hierarchy allow long study sessions without cognitive fatigue.
- **Dynamic AI feedback:** Synthesized transcripts, vector queries, and auto-generated knowledge graphs use crisp accent cues to indicate generative states and active retrieval.
- **Rhythmic loops:** Spaced-repetition workflows, interactive checkpoints, and mastery milestones evoke subtle kinetic feedback without gamified clutter.

## Colors

The palette establishes an authoritative, academic substrate energized by intelligent accents:

- **Primary Deep Indigo (`#4F46E5`)**: Anchors primary calls-to-action, active lecture milestones, and interactive loop indicators. Paired with **Indigo Dark (`#3730A3`)** for high-contrast pressed states and **Indigo Light (`#EEF2FF`)** for contextual chips, selected cards, and active focus areas.
- **Accent Cyan (`#06B6D4`)**: Reserved for generative AI telemetry, semantic search hits, real-time audio transcript highlights, and synthesis tags.
- **Semantic Feedback**:
  - **Success Emerald (`#16A34A`)**: Mastery affirmations, completed comprehension checks, and recall streaks.
  - **Warning Amber (`#F59E0B`)**: Memory decay indicators, review warnings, and pending sync buffers.
  - **Error Rose (`#DC2626`)**: Critical recall lapses, transcription failures, and network breaks.
- **Neutrals & Surfaces**:
  - **Background Slate (`#F8FAFC`)**: Canvas base layer reducing glare across extended reading sessions.
  - **Surface Pure White (`#FFFFFF`)**: Elevated cards, editor canvases, and floating drawers.
  - **Dark Canvas (`#0F172A`)**: Code snippets, video player chrome, and inverted focus modals.
  - **Text Hierarchy**: Slate 900 (`#0F172A`) for commanding headers and body text; Slate 500 (`#64748B`) for timestamps, secondary labels, and metadata.
  - **Borders**: Slate 200 (`#E2E8F0`) strictly applied to structural grid outlines and card perimeters.

## Typography

Inter serves as the foundational typeface across all display, narrative, and operational tiers, calibrated with negative tracking in larger scales to achieve an authoritative, modern tech feel. JetBrains Mono is used for inline code, keyboard shortcuts, equation syntax, and video timecode stamps.

- **Scale application**:
  - `display`: Landing titles and major lecture chapter milestones.
  - `headline-lg` / `headline-md`: Document headers, module titles, and mastery dashboards.
  - `title-md`: Card headers, section dividers, and modal titles.
  - `body-lg` / `body-md`: Real-time synchronized transcript segments, AI summaries, and flashcard prompts. Line heights provide reading comfort during intensive study.
  - `label-sm`: Micro-badges, mastery meters, status tokens, and shortcut markers. Always rendered with medium-to-semibold weights to ensure legibility against subtle backgrounds.

## Layout & Spacing

The interface follows a structured multi-pane layout model inspired by linear workflows and workspace editors:

- **Desktop (1200px+)**: 3-pane split view (Navigation & Loop Index: 280px fixed; Primary Canvas/Lecture Video & Synthesizer: fluid 8-column center; AI Scratchpad/Interactive Inspector: 380px fixed right dock). Gutters are locked to `1.5rem` (`24px`).
- **Tablet (768px - 1199px)**: Dual pane. Left navigation collapses into a minimal icon rail (64px); the AI inspector transitions to an overlay drawer triggered on demand.
- **Mobile (<768px)**: Single-column stacked fluid view. Outer canvas margins drop to `1rem` (`16px`). Video snaps to a sticky top position with interactive transcript tabs underneath.

Spacing follows strict 4px/8px cadence:
- `space-xs` (4px): Internal component micro-spacing (icon to text, indicator dots).
- `space-sm` (8px): Form input inner paddings, list-item vertical offsets.
- `space-md` (12px): Standard control element padding, dropdown gaps.
- `space-lg` (20px): Card internal padding, blockquote insets, stacked module gaps.
- `space-xl` (32px): Section breaks between lecture chapters and mastery drills.

## Elevation & Depth

Visual hierarchy relies on low-contrast structural outlines paired with light, ambient diffusion rather than deep drop shadows:

- **Base Layer (Flat)**: Background Slate (`#F8FAFC`) forms the root canvas. Non-interactive groups and static modules live here without shadow.
- **Surface Elevation (Cards & Panels)**: Pure White (`#FFFFFF`) containers carry a crisp 1px border (`#E2E8F0`) and an ambient, slate-tinted shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Active Interactive Elevation (Hover & Drag)**: Raised interactive cards shift slightly upward with an expanded ambient lift: `0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`. Border shifts dynamically to `#CBD5E1`.
- **Floating Overlays (Command Bars, Modals, Menus)**: Command palette (Cmd+K) and floating AI tooltips use: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` combined with 1px border `#E2E8F0` and `backdrop-filter: blur(8px)`.

## Shapes

The geometric framework balances approachable learning UI with rigorous software tools:

- **Large Surfaces (16px / 1rem)**: All primary content cards, video player wrappers, split-pane study modules, and quiz cards use `rounded-lg` (16px).
- **Controls & Form Elements (10px - 12px)**: Primary buttons, text inputs, dropdown triggers, and interactive cards conform to `rounded-md` (10px–12px) for a focused, tactile feel.
- **Pills (Full Radius / 9999px)**: Spaced repetition status badges, playback speed controls, audio waveform scrubber knobs, and mastery percentage chips use full pill rounding.

## Components

### Buttons
- **Primary**: Solid Deep Indigo (`#4F46E5`) fill, white text, 11px border radius, medium weight. Height: 40px (desktop) / 44px (mobile touch target). Inset subtle top highlight: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.2)`. Hover: `#3730A3`. Active: translateY(1px).
- **Secondary**: Surface Pure White, 1px Slate 200 border, Slate 900 text. Hover: `#F8FAFC` background with `#CBD5E1` border.
- **AI Assist Action**: Indigo Light (`#EEF2FF`) background, Deep Indigo text with a Cyan spark icon. Hover: `#E0E7FF`.

### Inputs & Search Bars
- **Text Inputs**: Height 42px, radius 10px, background `#FFFFFF`, border 1px solid `#E2E8F0`. Typography: `body-md`. Focus state: border color `#4F46E5`, outline: `2px solid rgba(79, 70, 229, 0.15)`.
- **Command / AI Prompt Input**: Inset card style, no harsh borders, subtle background (`#FFFFFF`), with an inline Cyan generation badge and monospaced `⌘K` keyboard hint on the right edge.

### Flashcard & Mastery Cards
- **Structure**: Surface Pure White, 16px radius, 1px `#E2E8F0` border. Padding `space-lg` (20px).
- **Interactive State**: Keyboard-focusable. On hover or active review, the left border is accented with a 3px Deep Indigo or Cyan stripe. 

### Chips & Badges
- **Status Pills**: 24px height, full pill radius (9999px), `label-sm` font.
  - *Mastered*: Background `#DCFCE7`, text `#16A34A`.
  - *Review Due*: Background `#FEF3C7`, text `#B45309`.
  - *AI Generated*: Background `#CFFAFE`, text `#0891B2`.

### Checkboxes & Multiple Choice Selectors
- **Checkboxes**: 18px square with 4px border radius. Border 1.5px solid `#CBD5E1`. Checked state: Deep Indigo background with crisp white check icon.
- **Quiz Option Tile**: Full-width 12px rounded container with 1px border. Includes index pill (`A`, `B`, `C`) on the left. Selected state switches background to `#EEF2FF` with `#4F46E5` border and text.

### Interactive Transcript List
- Borderless rows with alternating hover states (`#F1F5F9`, 8px radius). Active synchronized line displays an Accent Cyan vertical marker (2px wide) and bold text color `#0F172A`, keeping inactive text at Slate 500 (`#64748B`).