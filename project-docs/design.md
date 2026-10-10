# LectureLoop — Design System

**Design direction:** Clean Minimal  
**Color theme:** Slate & Blue  
**Purpose:** A practical design reference for Stitch UI integration and frontend implementation  
**Related documents:** `PRD.md`, `requirement.md`, `architecture.md`

---

## 1. Design Philosophy

LectureLoop should feel like a calm, modern learning workspace. Use a light neutral background, clear typography, generous whitespace, and one restrained blue accent.

The interface should prioritize:
- Readability during long study sessions.
- Clear learning progress and next actions.
- Consistent layouts across the dashboard and Interactive Learning.
- Minimal visual noise and decoration.
- Clear distinction between neutral UI, primary actions, correct answers, and errors.
- Responsive behavior on desktop, tablet, and mobile.

**Keep the existing Stitch UI layout and components wherever possible.** Apply this design system by adapting shared tokens and components rather than rebuilding all screens.

## 2. Color Palette

### 2.1 Core colors

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#F8FAFC` | Main application background |
| `--color-surface` | `#FFFFFF` | Cards, menus, panels, dialogs |
| `--color-text` | `#334155` | Primary text and headings |
| `--color-text-strong` | `#0F172A` | Important headings and high-emphasis text |
| `--color-text-muted` | `#64748B` | Secondary text, descriptions, metadata |
| `--color-border` | `#E2E8F0` | Borders, dividers, input outlines |
| `--color-accent` | `#3B82F6` | Primary buttons, active links, selected states |
| `--color-accent-hover` | `#2563EB` | Hover state for primary actions |
| `--color-accent-soft` | `#EFF6FF` | Subtle blue backgrounds and selected navigation |
| `--color-focus` | `#93C5FD` | Keyboard focus ring |

### 2.2 Semantic colors

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#15803D` | Correct answers and completed states |
| `--color-success-bg` | `#F0FDF4` | Correct-answer background |
| `--color-warning` | `#B45309` | Warnings and retry notices |
| `--color-warning-bg` | `#FFFBEB` | Warning callouts |
| `--color-danger` | `#B91C1C` | Incorrect answers and destructive actions |
| `--color-danger-bg` | `#FEF2F2` | Error and incorrect-answer background |
| `--color-info` | `#1D4ED8` | Informational messages |
| `--color-info-bg` | `#EFF6FF` | Informational callouts |

### 2.3 Palette rules

- Use white surfaces over a very light slate background.
- Use blue for primary actions and active navigation, not for every icon or card.
- Use borders and spacing before adding shadows.
- Use green and red primarily for semantic feedback, not decoration.
- Do not rely on color alone to communicate correct/incorrect status; include text and/or icons.
- Avoid gradients, neon colors, glassmorphism, excessive shadows, and multiple competing accent colors.
- Ensure text/background contrast remains readable.

## 3. Typography

Use the existing project fonts if already configured and visually consistent. Otherwise use a clean system sans-serif stack.

Suggested stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
```

Type scale:

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| `--text-xs` | 12px | 400–500 | Small metadata, timestamps |
| `--text-sm` | 14px | 400–500 | Supporting text, labels |
| `--text-base` | 16px | 400 | Main body text |
| `--text-lg` | 18px | 500–600 | Card headings, section labels |
| `--text-xl` | 20px | 600 | Page subheadings |
| `--text-2xl` | 24px | 600–700 | Page titles |
| `--text-3xl` | 30px | 600–700 | Dashboard welcome/title where appropriate |

Guidelines:
- Use sentence case for labels and buttons.
- Keep body text line-height around 1.5.
- Avoid overly light font weights for important information.
- Use tabular numerals for time, counts, and metrics where supported.
- Do not use large marketing-style typography inside focused quiz screens.

## 4. Layout and Spacing

Use a consistent spacing scale based on 4px.

| Token | Value | Common use |
|---|---:|---|
| `--space-1` | 4px | Tiny icon/text gap |
| `--space-2` | 8px | Compact control gap |
| `--space-3` | 12px | Form and list spacing |
| `--space-4` | 16px | Standard component padding |
| `--space-5` | 20px | Card spacing |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Large section spacing |
| `--space-10` | 40px | Major page separation |
| `--space-12` | 48px | Large layout separation |

Layout guidance:
- Use a consistent centered content width where appropriate.
- Keep page titles, primary actions, and content aligned to a common grid.
- Prefer simple vertical rhythm and whitespace over decorative separators.
- Do not let the learning workspace become cramped at laptop widths.
- Prevent horizontal overflow at every supported viewport.
- Reuse the existing sidebar width and responsive behavior unless there is a concrete usability problem.

## 5. Borders, Radius, and Elevation

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Small inputs and compact controls |
| `--radius-md` | 8px | Buttons, inputs, small cards |
| `--radius-lg` | 12px | Standard cards and panels |
| `--radius-xl` | 16px | Large learning panels or dialogs |
| `--border-width` | 1px | Default borders |
| `--shadow-card` | `0 1px 2px rgba(15, 23, 42, 0.04)` | Optional subtle card elevation |
| `--shadow-dialog` | `0 12px 32px rgba(15, 23, 42, 0.12)` | Dialogs/popovers when needed |

Rules:
- Default to a 1px neutral border.
- Most cards should not need a noticeable shadow.
- Do not combine heavy borders and heavy shadows on the same element.
- Use consistent radii across similar components.

## 6. Components

### 6.1 Buttons

**Primary**
- Blue background `#3B82F6`.
- White text.
- Hover `#2563EB`.
- Clear disabled/loading state.
- Use for the main action on a screen.

**Secondary**
- White background.
- Slate text.
- Neutral border.
- Use for actions such as Cancel or View Details.

**Tertiary / ghost**
- Transparent background.
- Slate text.
- Use for low-emphasis navigation or inline actions.

**Destructive**
- Red semantic styling.
- Use only for delete or destructive confirmation actions.

Rules:
- Use concise, action-oriented labels: “Add lecture”, “Start learning”, “Submit answer”, “Replay topic”.
- Avoid more than one dominant primary button in the same small visual group.
- Show a spinner or explicit progress label during pending actions.
- Prevent repeated clicks while an action is submitting.

### 6.2 Cards and panels

- White background.
- Thin slate border.
- 12px radius by default.
- Consistent internal padding.
- Clear heading and supporting text hierarchy.
- Avoid adding icons, badges, and colored backgrounds unless they convey meaning.

### 6.3 Forms

- Labels must remain visible; do not rely only on placeholders.
- Use a clear blue focus ring.
- Show inline validation messages close to the field.
- Maintain input values when safe after a recoverable error.
- Use appropriate input types and accessible labels.

### 6.4 Status badges

Use restrained, low-saturation backgrounds:
- Ready/completed: green tint.
- Processing/in progress: blue tint.
- Warning/retry: amber tint.
- Failed/incorrect: red tint.
- Draft/neutral: slate tint.

Always include a text label; color alone is insufficient.

### 6.5 Navigation

- One shared sidebar and header across the app.
- Active navigation item uses blue text and a pale blue background.
- Inactive items use muted slate text.
- Use the same icon set throughout, preferably the one already installed.
- Keep icon size, alignment, and label spacing consistent.
- Mobile navigation must be usable and must not cover critical content.

### 6.6 Quiz answers

- Make each answer option a clear, full-width selectable control.
- Use a visible border and a subtle hover/focus state.
- Selected state: blue border and pale blue background.
- Correct feedback: green semantic state with explicit “Correct” text.
- Incorrect feedback: red semantic state with explicit “Not quite” or equivalent text.
- Do not reveal the correct option before submission.
- Disable submission while the answer is being processed.

### 6.7 Remediation panel

- Keep it calm and helpful, not punitive.
- State what happened in plain language.
- Present “Replay this topic” and “Review topic notes” as clear actions.
- Keep notes readable and easy to scan.
- Display retry count or attempts remaining where useful.
- Do not overwhelm the student with a large red warning panel.

### 6.8 Video player and topic list

- Preserve the video's expected aspect ratio.
- Make current topic selection obvious.
- Show topic title, timestamp range, duration, and completion state.
- Keep topic list scroll behavior predictable.
- Ensure controls and quiz content remain usable at mobile widths.

## 7. Page-Level Design Guidance

### Dashboard
- Light slate page background.
- White cards and panels.
- One prominent Add Lecture action.
- Recent lectures and real progress summaries.
- Simple empty state for new users.
- Avoid fake analytics or decorative charts without real data.

### Interactive Learning home
- Clear explanation of the workflow.
- Add YouTube Lecture as the primary action.
- Lecture cards with title, source, status, and Resume/Open action.
- Simple processing and failure states.

### Add YouTube Lecture
- Minimal form with URL required.
- Optional title and subject fields.
- Clear supported URL hint.
- Inline validation and loading feedback.

### Lecture processing and topic overview
- Clearly show processing stage or failure.
- Present ordered topic segments with timestamps.
- Use restrained status indicators.
- Provide a clear Start Learning or Resume action.

### Learning session
- Make the player and current topic the main focus.
- Keep progress and quiz state visible.
- Use a side panel on wide screens only where it improves usability.
- On mobile, stack player, topic progress, question, feedback, and notes vertically.
- Avoid unnecessary animation during study.

### Session results
- Use simple metrics and clear labels.
- Highlight weak topics with restrained semantic styling.
- Provide direct actions to review a weak topic or return to the dashboard.
- Do not use chart decoration unless it communicates real recorded data.

## 8. Motion and Interaction

- Prefer short, subtle transitions (roughly 120–200ms) for hover, focus, and panel changes.
- Avoid bouncing, parallax, animated gradients, and unnecessary confetti.
- Respect reduced-motion preferences.
- Do not autoplay a new topic unexpectedly.
- Do not submit answers automatically when a user selects an option.
- Provide clear confirmation for destructive actions.
- Maintain keyboard focus when dialogs open and close.

## 9. Accessibility

- Use semantic HTML elements.
- Ensure interactive elements can be reached and activated by keyboard.
- Keep visible focus indicators.
- Associate labels and validation messages with form controls.
- Maintain adequate contrast for text and controls.
- Never communicate correctness, failure, or status using color alone.
- Use accessible names for icon-only buttons.
- Avoid using color as the only selected-state indicator.
- Keep touch targets comfortable on mobile.

## 10. Responsive Rules

### Desktop
- Shared sidebar and header.
- Main content aligned to a consistent grid.
- Two-column learning layout when sufficient width is available.

### Tablet
- Reduce horizontal gaps and card padding when needed.
- Preserve readable text and clear navigation.
- Avoid overly narrow player or quiz columns.

### Mobile
- Use a single-column content flow.
- Collapse or adapt the sidebar using the existing navigation pattern.
- Keep buttons and answer options full-width where useful.
- Avoid horizontal scrolling.
- Stack notes and remediation below the question/player in a predictable order.

## 11. Tailwind Implementation Guidance

If the project uses Tailwind CSS, implement the palette through the existing theme/configuration approach. Do not scatter raw hex values throughout components.

Suggested semantic token names:
- `background`
- `surface`
- `foreground`
- `muted`
- `border`
- `primary`
- `primary-hover`
- `primary-soft`
- `success`
- `success-soft`
- `warning`
- `warning-soft`
- `danger`
- `danger-soft`
- `focus-ring`

Adapt to the Tailwind version and setup already present. Do not replace the configuration wholesale without inspecting it.

Example CSS variables if the project uses CSS custom properties:

```css
:root {
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #334155;
  --color-text-strong: #0F172A;
  --color-text-muted: #64748B;
  --color-border: #E2E8F0;
  --color-accent: #3B82F6;
  --color-accent-hover: #2563EB;
  --color-accent-soft: #EFF6FF;
  --color-focus: #93C5FD;
  --color-success: #15803D;
  --color-success-bg: #F0FDF4;
  --color-warning: #B45309;
  --color-warning-bg: #FFFBEB;
  --color-danger: #B91C1C;
  --color-danger-bg: #FEF2F2;
  --color-info: #1D4ED8;
  --color-info-bg: #EFF6FF;
}
```

## 12. Design Acceptance Checklist

- [ ] Slate & Blue palette is applied consistently.
- [ ] Main backgrounds are light neutral and surfaces are white.
- [ ] Blue is reserved for primary actions, focus, and selected states.
- [ ] Correct/incorrect states use semantic styling and explicit text.
- [ ] Dashboard and learning module use one shared visual system.
- [ ] Stitch-generated layouts and components are preserved wherever possible.
- [ ] Cards, buttons, fields, badges, and spacing are consistent.
- [ ] Desktop, tablet, and mobile layouts are usable without horizontal overflow.
- [ ] Loading, empty, processing, and error states match the design system.
- [ ] Keyboard focus and text contrast are adequate.
- [ ] No fake metrics or decorative UI misrepresent product state.
- [ ] No unnecessary gradients, heavy shadows, or competing accent colors.

## 13. Instructions for the AI Coding Agent

1. Inspect the existing UI and styles before editing.
2. Identify the current tokens, component library, and Tailwind version.
3. Reuse existing components and preserve the Stitch layout.
4. Apply these colors through shared design tokens where possible.
5. Update shared components first so the palette remains consistent.
6. Avoid changing page structure unless necessary for usability or consistency.
7. Verify all primary pages and learning states after the theme change.
8. Test responsive layouts and visible focus states.
9. Report changed files, verification performed, and any remaining inconsistencies.

**Design summary:** A light, neutral, minimal interface with slate typography, subtle borders, white surfaces, and restrained blue accents. Keep the learning content—not the decoration—at the center of LectureLoop.
