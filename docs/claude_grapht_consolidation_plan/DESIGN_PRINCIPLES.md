# grapht Design Principles

## Philosophy

grapht visualizations should feel **precise and weighty** — like a luxury instrument panel, not a generic dashboard. We draw inspiration from:

- **Swiss design**: Grid systems, clean typography, purposeful whitespace
- **Japanese minimalism**: Restraint, meaningful detail, craft
- **Luxury automotive**: Precision gauges, tactile feedback, premium materials
- **The Pudding**: Scrollytelling, personal entry points, data journalism

---

## Core Principles

### 1. Craftsmanship Over Utility
We're not building enterprise dashboards. We're building tools for developers who notice details and appreciate quality. Every pixel matters.

### 2. Meaningful Interactivity
Every interactive element must earn its place. If scrolling, hovering, or clicking doesn't reveal something valuable, remove it. Interactivity is not decoration.

### 3. Personal Entry Points
Give users a stake in the data. Start with their context:
- Their usage patterns (for agent analytics)
- Their county (for geographic stories)
- Their timeframe (for temporal analyses)

### 4. Progressive Disclosure
Start simple. Add complexity as users scroll/explore. Reserve full interactivity for the end. Don't overwhelm on first view.

### 5. Methods Transparency
Show your work. Link to code. Explain limitations. Build trust through openness.

---

## Visual Language

### Typography

| Use | Style | Examples |
|-----|-------|----------|
| Headlines | Serif, confident | Canela, Tiempos, Georgia |
| Body | Sans-serif, readable | National, Proxima Nova, system |
| Data labels | Tabular figures | Monospace for precision |
| Code | Monospace | JetBrains Mono, Fira Code |

**Rules:**
- Limit to 2 font families per project
- Use font-weight for hierarchy, not multiple fonts
- Line height: 1.5 for body, 1.2 for headlines

### Color

**Palette Philosophy:**
- Muted, sophisticated base (not primary colors)
- Single accent color for emphasis
- Sufficient contrast (WCAG AA minimum)

**Data Encoding:**
- Sequential scales for magnitude (light → dark)
- Diverging scales for comparison (negative ← neutral → positive)
- Categorical: max 7 distinct colors

**Specific Palettes:**

```css
/* Storm × Overdose story */
--storm-impact: #e74c3c;      /* Red for disasters */
--overdose-spike: #c0392b;    /* Darker red for deaths */
--baseline: #e0e0e0;          /* Gray for normal */
--background: #fafafa;        /* Off-white */

/* Agent Analytics */
--token-input: #3498db;       /* Blue for input tokens */
--token-output: #2ecc71;      /* Green for output tokens */
--cost: #e74c3c;              /* Red for costs */
--neutral: #95a5a6;           /* Gray for inactive */
```

**Accessibility:**
- Test with colorblind simulators (Coblis, Sim Daltonism)
- Never rely on color alone; use patterns, labels, or shapes
- Ensure 4.5:1 contrast ratio for text

### Animation

**Purpose:**
- Reveal relationships between data points
- Guide attention to important changes
- Provide feedback for interactions

**Timing:**
- Micro-interactions: 150-200ms
- State transitions: 300-500ms
- Complex animations: 500-800ms
- Never exceed 1000ms

**Easing:**
- Entrances: `ease-out` (fast start, slow end)
- Exits: `ease-in` (slow start, fast end)
- Continuous: `ease-in-out`
- Bouncy/playful: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

**Respect Preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Layout

**Grid:**
- 12-column responsive grid
- Gutters: 16px mobile, 24px tablet, 32px desktop
- Max content width: 1200px

**Whitespace:**
- Generous margins: 24px mobile, 40px+ desktop
- Section spacing: 80px minimum between major sections
- Let visualizations breathe

**Responsive Breakpoints:**
```css
--mobile: 480px;
--tablet: 768px;
--desktop: 1024px;
--wide: 1200px;
```

**Mobile-First:**
- Design for mobile first
- Enhance progressively for larger screens
- Stack complex layouts vertically on mobile
- Consider touch targets (44px minimum)

---

## Chart-Specific Guidelines

### Choropleth Maps
- Use sequential color scales (single hue)
- Include legend with clear breaks
- Consider using quantile breaks for skewed distributions
- Provide tooltip on hover with exact values
- Include zoom/pan for dense areas

### Time Series
- X-axis always shows time (left to right)
- Annotate significant events
- Use area charts sparingly (only for cumulative)
- Line charts for trends, bar charts for discrete periods

### Scatter Plots
- Include trend line only if meaningful
- Size encoding: area (not radius) for accurate perception
- Jitter overlapping points or use transparency
- Provide brushing/zoom for dense plots

### Bar Charts
- Horizontal for many categories
- Vertical for time-based comparisons
- Always include zero baseline
- Sort meaningfully (not alphabetically unless necessary)

---

## Anti-Patterns

**❌ Visual:**
- Rainbow color schemes
- Unnecessary 3D effects
- Pie charts with more than 5 slices
- Dual y-axes (almost always confusing)
- Chartjunk (decorative gridlines, excessive labels)

**❌ Interaction:**
- Animation for animation's sake
- Tooltips as crutch for bad design
- Requiring hover to understand basic meaning
- Breaking browser back button
- Auto-playing videos/animations

**❌ Layout:**
- Dashboard fatigue (too many charts competing)
- Walls of text without visual breaks
- Fixed-width layouts that don't respond
- Tiny fonts on mobile

---

## Component Patterns

### Scrollytelling
When to use:
- Transitions that are meaningful (not just flashy)
- Change over time visualization
- Spatial movement through data
- Single chart with state changes

Implementation:
- Use Scrollama or similar
- Be explicit about visual state at EACH step
- Users scroll quickly—can't rely on animations completing
- Plan mobile alternative (may need to stack instead)

### Interactive Filters
- Show current filter state clearly
- Provide "reset all" option
- Animate transitions between filter states
- Consider URL params for shareable states

### Data Tables
- Sortable columns with clear indicators
- Sticky headers for long tables
- Search/filter for large datasets
- Export to CSV option

---

## Inspiration Sources

### Data Journalism
- [The Pudding](https://pudding.cool) - Visual essays, scrollytelling
- [Reuters Graphics](https://graphics.reuters.com) - News visualization
- [NYT Graphics](https://www.nytimes.com/spotlight/graphics) - Premium journalism
- [The Upshot](https://www.nytimes.com/section/upshot) - Data-driven analysis

### Design Systems
- [IBM Carbon](https://carbondesignsystem.com/data-visualization/getting-started/) - Data viz guidelines
- [Shopify Polaris](https://polaris.shopify.com) - Component patterns
- [Material Design](https://m3.material.io) - Interaction patterns

### Visualization Theory
- [Flowing Data](https://flowingdata.com) - Nathan Yau
- [Information is Beautiful](https://informationisbeautiful.net) - David McCandless
- [Perceptual Edge](https://perceptualedge.com) - Stephen Few
- [Storytelling with Data](https://storytellingwithdata.com) - Cole Nussbaumer Knaflic

### Technical Resources
- [D3.js Gallery](https://observablehq.com/@d3/gallery) - Official examples
- [LayerCake](https://layercake.graphics) - Svelte charting
- [Observable](https://observablehq.com) - Interactive notebooks

---

## Quality Checklist

Before shipping any visualization:

### Functionality
- [ ] Works on mobile (test on real devices)
- [ ] Handles empty/null data gracefully
- [ ] Loading states for async data
- [ ] Error states with helpful messages

### Accessibility
- [ ] Keyboard navigable
- [ ] Screen reader tested
- [ ] Color contrast passes WCAG AA
- [ ] Respects prefers-reduced-motion
- [ ] Alt text for meaningful images

### Performance
- [ ] Renders smoothly (60fps animations)
- [ ] Lazy loads heavy resources
- [ ] Optimized bundle size
- [ ] Works offline (where appropriate)

### Polish
- [ ] Consistent spacing and alignment
- [ ] Typography hierarchy clear
- [ ] Interactive states visible (hover, focus, active)
- [ ] Methods/source section included

---

## Living Document

This document evolves as we learn. When you discover a new technique or anti-pattern, add it here. When a principle no longer serves us, revise it.

Last updated: 2025-01-21
