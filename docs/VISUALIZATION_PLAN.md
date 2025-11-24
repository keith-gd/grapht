# Agent Analytics Dashboard: Visualization Plan

A design-forward approach to building unique, satisfying agentic data visualizations based on our Design Principles.

**Last Updated:** 2024-11-24 (Post-Review Revision)

---

## Current State Assessment

**What exists:**
- Basic D3.js dashboard with summary cards (1,067 lines vanilla JS)
- GitHub-style activity heatmap
- Cost variance scatter plot
- Sankey flow diagram (session → commits)
- Distribution histograms
- Standard bar/line charts

**What's wrong with it:**
- Generic "tech" styling (purple/indigo gradients)
- Floaty, weightless interactions
- No sense of mass or tactile feedback
- Missing personalization hooks (no "aha" moments)
- No storytelling or progressive disclosure
- Scattered visualizations without a cohesive narrative
- No mobile strategy
- No accessibility support

---

## Design Philosophy Application

### The "Precise and Weighty" Principle

Every interaction should feel like manipulating a precision instrument:

1. **Weighted Transitions**
   - No instant state changes
   - Elements should ease in/out with mass (ease-out-cubic, 200-300ms)
   - Hover states should feel like pressing a physical button
   - Scroll should have momentum and friction
   - **Gauge needle inertia** - overshoots then settles (analog behavior)

2. **Tactile Visual Language**
   - Hard shadows instead of soft glows
   - Solid backgrounds instead of glass morphism
   - Borders with actual thickness (2-3px)
   - High contrast (near-black on white, or white on near-black)
   - **Instrument backlighting** - deep blacks with illuminated elements

3. **Material Inspiration**
   - Think Ferrari gauge cluster, not Stripe dashboard
   - Brushed metal textures for control surfaces
   - Leather-grain patterns for card backgrounds (subtle)
   - Precision instrument bezels around key metrics

---

## Visualization Concepts

### 1. The Archive Wall (Scrollytelling) — PRIORITY

**Inspiration:** The Pudding, museum timeline exhibits

**Concept:** A vertical scroll through your agent history as a narrative journey. Mobile-first design.

**Sections:**
1. "Your First Session" - personal hook
2. "Your Most Expensive Day" - pattern revelation
3. "Your Favorite Agent" - behavioral insight
4. "Your Biggest Win" - commit with most impact (lines added metric)
5. "What's Next" - predictive suggestions

**Visual Elements:**
- Full-bleed images/visualizations per section
- Sticky headers with key stats
- Scroll-triggered animations (with `prefers-reduced-motion` support)
- Annotation callouts for key moments

**Interactions:**
- Smooth scroll snapping
- Progress indicator
- Share moments to social (requires OG image generation - Phase 2)

**Data Story:** "This is your story with AI agents."

**Required API Endpoints:**
- [x] Existing: `/api/metrics/summary`
- [ ] New: `/api/analytics/first-session` (ORDER BY session_start ASC LIMIT 1)
- [ ] New: `/api/analytics/most-expensive-day` (GROUP BY date, ORDER BY cost DESC)
- [ ] New: `/api/analytics/favorite-agent` (GROUP BY agent_type, ORDER BY count DESC)
- [ ] New: `/api/analytics/biggest-win` (commit with max lines_added)

**Why First:** Highest ROI, best mobile experience, validates Scrollama integration, personal data hook creates engagement.

---

### 2. The Command Console (Hero Visualization)

**Inspiration:** Dead Space spine health bar, Alien: Isolation motion tracker

**Concept:** A single, immersive "command console" view that shows your agent activity as if you're monitoring a spacecraft.

**Visual Elements:**
- Central circular gauge showing today's cost vs. budget
- Radial bars around it showing agent activity by type
- Pulse animations when sessions start/end (like a heartbeat) — **v1: static, v2: WebSocket**
- Amber/green/red status lighting (no purple!)
- CRT scan-line overlay (subtle, **off by default** for accessibility)

**Interactions:**
- Click gauge segments to drill down
- ~~Drag threshold indicators to set alerts~~ **DEFERRED** (requires alert infrastructure)
- Weighted rotation animation on hover

**Data Story:** "You are the commander. This is your mission control."

**Technical Notes:**
- Radial gauges and bars are standard D3.js territory
- Real-time pulse requires WebSocket (defer to v2)
- CRT overlay is CSS filter but **must be toggleable** (seizure risk)

---

### 3. The Flow Field (Organic Visualization) — SIMPLIFIED

**Inspiration:** Wind maps, particle simulations

**Concept:** Show sessions as particles flowing through your workflow. High-value sessions are larger, errors create turbulence.

**Visual Elements:**
- Particles spawn at session start
- Flow direction shows time progression
- Color intensity shows cost
- Particle trails fade over time
- ~~Confluences where multiple sessions contribute to same commit~~ **DEFERRED** (requires schema change)

**Interactions:**
- Click particles to freeze and inspect
- ~~Drag to create "nets" that capture sessions by criteria~~ **SIMPLIFIED** (click to filter instead)
- Scroll to zoom time scale

**Data Story:** "Your work flows like a river. Find the currents."

**Performance Constraints:**
- **Maximum 200 particles** (desktop)
- **Maximum 50 particles** (mobile) or static fallback
- Use Canvas 2D, not WebGL
- Implement visibility-based animation pausing (Intersection Observer)
- Add `requestAnimationFrame` cleanup to prevent memory leaks

**Platform:**
- Desktop only in v1
- Mobile fallback: static Sankey diagram (already exists)

---

### 4. DEFERRED: The Productivity Engine (Mechanical Visualization)

**Status:** Cut from initial phases due to high complexity and unclear data mapping.

**Issues Identified:**
- Gear animation synchronized to real data is complex
- "Wind back in time" requires time-scrubbing API (doesn't exist)
- Unclear what gear rotation speed actually represents
- Performance risk with multiple animated elements

**If Revisited:** Simplify to single "engine gauge" showing aggregate throughput rather than interconnected mechanical parts.

---

### 5. DEFERRED: The Variance Topography (3D Visualization)

**Status:** Deferred to Phase 5+ due to Three.js complexity and mobile incompatibility.

**Issues Identified:**
- Three.js is overkill; consider `d3-contour` for 2.5D approach
- No error/status field in current session schema
- "Efficiency" metric undefined
- Mobile will be unusable

**Alternative:** Efficiency Quadrant Chart (2x2: high cost/low output, high cost/high output, etc.) — standard business visualization, highly familiar.

---

## Implementation Priority (Revised)

### Phase 1: Foundation + Migration (Weeks 1-2)

**Week 1:**
1. SvelteKit project setup
2. Migrate ONE existing chart to LayerCake (proof of concept)
3. New color palette (swap in existing charts.js immediately)
4. Add `prefers-reduced-motion` media query check

**Week 2:**
5. Typography upgrade (larger, heavier, system fonts)
6. Weighted interaction library (hover, click, transitions)
7. Remove all glass morphism and soft glows
8. Implement dark theme with hard shadows
9. Add ARIA labels to existing D3 charts

**Quick Wins (Do Immediately):**
```javascript
// Color palette swap in charts.js (30 min)
const COLORS = {
  primary: '#3b82f6',    // Blue (was #818cf8 indigo)
  secondary: '#22c55e',  // Green (was #c084fc purple)
  tertiary: '#f59e0b',   // Amber
  quaternary: '#ef4444', // Red
  // ...
};

// Reduced motion check (15 min)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### Phase 2: Archive Wall (Weeks 3-4)

1. Add missing API endpoints (first-session, most-expensive-day, etc.)
2. Scrollama integration
3. Personal data extraction
4. Section designs (mobile-first)
5. Scroll animations (with reduced-motion fallback)
6. Progress indicator

**Deferred to Phase 2.5:**
- Share functionality (requires OG image generation)

### Phase 3: Command Console (Weeks 5-7)

1. Central gauge component
2. Radial progress bars
3. Status lighting system (amber/green/red)
4. Drill-down interactions
5. Pulse animations (static data, no WebSocket)
6. CRT overlay (toggleable, off by default)

**Deferred:**
- Real-time WebSocket updates
- Alert threshold dragging

### Phase 4: Flow Field Simplified (Weeks 8-10)

1. Canvas 2D particle system (200 particle max)
2. Session-to-particle mapping
3. Click-to-inspect interaction
4. Time scale zoom
5. Intersection Observer for visibility-based pause
6. Desktop only; mobile gets static Sankey fallback

### Phase 5+: Future Considerations

- Variance Topography (if demand exists, use d3-contour not Three.js)
- Productivity Engine (simplified single gauge)
- Real-time WebSocket for Command Console
- Alert/threshold infrastructure
- Social sharing with OG images

---

## Technical Stack (Revised)

**Core:**
- D3.js v7 (already in place)
- SvelteKit (migrate from vanilla JS)
- LayerCake (Svelte-D3 integration)
- Scrollama (scroll-driven stories)

**Animations:**
- Svelte transitions (built-in)
- GSAP (for complex timelines)
- ~~Framer Motion~~ **REMOVED** (React-only, doesn't work with Svelte)
- Motion One (alternative if needed)

**Rendering:**
- Canvas 2D (particle system)
- SVG (gauges, charts)
- ~~WebGL~~ **DEFERRED** (only if truly needed)
- ~~Three.js~~ **DEFERRED** (consider d3-contour instead)

**State Management:**
- SvelteKit stores
- Svelte 5 runes (if using Svelte 5)

**Performance:**
- Intersection Observer (visibility-based animation)
- `requestAnimationFrame` with proper cleanup
- Worker threads for data processing (if needed)
- Progressive enhancement
- 60fps target

**Build:**
- Vite (comes with SvelteKit)

---

## API Endpoints Needed

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/analytics/first-session` | Archive Wall "Your First Session" | To Add |
| `/api/analytics/most-expensive-day` | Archive Wall pattern reveal | To Add |
| `/api/analytics/favorite-agent` | Archive Wall behavioral insight | To Add |
| `/api/analytics/biggest-win` | Archive Wall commit impact | To Add (needs impact definition) |
| `/api/alerts/thresholds` | Command Console alert dragging | Deferred |
| WebSocket `/ws/sessions` | Real-time pulse | Deferred |

**Schema Changes Needed (Deferred):**
- Session error/status field
- Multi-session commit ancestry tracking
- Efficiency metric definition

---

## Color Palette

**Primary Palette (no purple!):**
```
Background:     #0f0f0f (near black)
Surface:        #1a1a1a
Border:         #2a2a2a
Text Primary:   #f5f5f5
Text Secondary: #a0a0a0
```

**Status Colors:**
```
Success:   #22c55e (green)
Warning:   #f59e0b (amber)
Error:     #ef4444 (red)
Info:      #3b82f6 (blue)
```

**Agent Colors:**
```
Claude Code:    #3b82f6 (blue)
Cursor:         #22c55e (green)
Copilot:        #f59e0b (amber)
Factory Droid:  #ef4444 (red)
```

**Accent (use sparingly):**
```
Highlight:  #fbbf24 (gold - for "aha" moments)
```

---

## Typography

```css
body {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, monospace;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
}

h1 { font-size: 32px; font-weight: 700; }
h2 { font-size: 24px; font-weight: 600; }
h3 { font-size: 18px; font-weight: 600; }

.metric { font-size: 48px; font-weight: 700; font-variant-numeric: tabular-nums; }
.label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
```

---

## Accessibility Requirements

**Motion:**
```javascript
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Skip animations, disable particle systems, use static alternatives
```

**Color:**
- All agent colors must have shape/pattern alternatives for colorblind users
- Never rely on color alone to convey meaning
- Maintain WCAG AA contrast ratios (4.5:1 for text)

**Screen Readers:**
- Add ARIA labels to all D3 chart elements
- Provide text alternatives for visualizations
- Keyboard navigation for interactive elements

**Photosensitivity:**
- CRT scan-line overlay OFF by default
- No flashing animations >3Hz
- Pulse animations must be subtle

---

## Interaction Library

**Hover States:**
```css
.interactive {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.interactive:hover {
  transform: scale(1.02) translateY(-2px);
}
.interactive:active {
  transform: scale(0.98);
  transition: transform 50ms;
}
```

**Gauge Needle (Analog Behavior):**
```css
.gauge-needle {
  transition: transform 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55);
  /* Overshoots then settles - like real analog gauge */
}
```

**Instrument Backlighting:**
```css
.gauge {
  box-shadow:
    inset 0 0 30px rgba(0,0,0,0.8),
    0 0 15px rgba(59, 130, 246, 0.3);
}
```

**Button Press:**
- Scale down to 0.95 on press
- Hard shadow moves from 4px to 1px
- Background lightens slightly
- Release bounces back with overshoot

**Card Hover:**
- Border thickens from 1px to 2px
- Subtle inner glow (not outer)
- Content shifts up 2px
- Shadow deepens

**Chart Interactions:**
- Data points scale up 1.5x on hover
- Connected elements highlight
- Unrelated elements fade to 50%
- Tooltip follows cursor with momentum

---

## Mobile Strategy

| Visualization | Mobile Support | Fallback |
|--------------|----------------|----------|
| Archive Wall | Full (mobile-first) | N/A |
| Command Console | Partial (simplified gauge) | Summary cards |
| Flow Field | None | Static Sankey diagram |
| Productivity Engine | None | Deferred |
| Variance Topography | None | Deferred |

**Breakpoints:**
```css
/* Mobile first */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

---

## Success Metrics

1. **First Impression:** User says "wow" or "cool" within 5 seconds
2. **Engagement:** Average session > 3 minutes (vs current unknown)
3. **Insight Generation:** User discovers something new in first visit
4. **Share Rate:** Users share their "Archive Wall" stories
5. **Return Rate:** Users come back to check metrics daily
6. **Accessibility:** Passes WCAG AA audit
7. **Performance:** 60fps on desktop, 30fps minimum on mobile

---

## Anti-Patterns to Avoid

1. Purple/cyan gradients (AI aesthetic cliche)
2. Glass morphism / frosted glass
3. Outer glows and halos
4. Thin fonts under 14px
5. Low contrast text
6. Generic dashboard templates
7. Unnecessary 3D effects
8. Animations without purpose
9. Hover effects that don't feel physical
10. Loading spinners (use skeleton states)
11. **Color-only differentiation** (accessibility)
12. **Animations without reduced-motion support** (accessibility)
13. **React libraries in Svelte** (Framer Motion)

---

## Dependencies to Install

```bash
# Core
npm create svelte@latest frontend-v2
cd frontend-v2
npm install

# Visualization
npm install d3 layercake scrollama

# Animation
npm install gsap
# Optional: npm install motion (Motion One)

# Utilities
npm install svelte-inview  # Intersection Observer for Svelte
```

---

## Next Steps

1. [x] Review this plan and provide feedback
2. [ ] **Quick wins:** Color palette swap, reduced motion check (TODAY)
3. [ ] Create `frontend-v2` SvelteKit project
4. [ ] Migrate one chart to LayerCake (proof of concept)
5. [ ] Add missing Archive Wall API endpoints
6. [ ] Build Archive Wall mobile-first

---

*This plan follows our Design Principles: precise and weighty, not floaty and generic.*

*Reviewed and revised based on Opus 4.5 feasibility assessment.*
