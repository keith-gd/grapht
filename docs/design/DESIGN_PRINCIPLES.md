# Design Principles for grapht/Claude Code Lens

Actionable philosophy, rules, and guidelines for building beautiful, precise analytics interfaces.

---

## Core Philosophy

### The "Precise and Weighty" Principle
Digital interfaces should feel substantial and tactile, like physical instruments rather than floating abstractions.

**Key qualities:**
- Mass and friction in interactions
- Purposeful movement and transitions
- Solid, grounded visual presence
- Minimal but meaningful decoration

**Anti-patterns:**
- Floaty, weightless interactions
- Excessive animation without purpose
- Generic "tech" styling (purple gradients, glows, glass morphism)
- Abstraction that distances user from their data

---

## Visual Design Rules

### Color
- **Use fewer colors** - Most designs use too many; limit your palette
- **Avoid AI aesthetic clichés** - No purple gradients, excessive glows, or generic blue/purple tech styling
- **High contrast** - Low contrast makes interfaces hard to use
- **Strategic color** - Color should have meaning, not just decoration

### Typography
- **Increase font sizes** - Text is usually too small
- **Increase font weight** - Thin fonts lack presence
- **Use system fonts** - Custom fonts often load poorly or look worse
- **Use fewer typefaces** - Stick to 1-2 fonts maximum
- **Increase line height** - Tight line spacing hurts readability

### Layout & Spacing
- **Add more whitespace** - Designs are typically too cramped
- **Generous margins** - Let content breathe
- **Reduce decorative elements** - Every element should serve a purpose

### Visual Effects
- **Reduce drop shadows** - Overuse makes designs look dated
- **Reduce border radius** - Overly rounded corners look unprofessional
- **Minimal glass morphism** - Use sparingly if at all
- **No gratuitous glows** - Light should have a source and purpose

---

## Interaction Design

### Movement & Transitions
- **Weighted interactions** - Nothing should feel instantaneous or floaty
- **Purposeful animation** - Movement should communicate meaning
- **Consistent timing** - Establish and maintain timing curves
- **Directional awareness** - Transitions should respect spatial relationships

### Feedback
- **Immediate response** - User actions get instant acknowledgment
- **State clarity** - Always clear what is active, selected, or available
- **Progressive disclosure** - Complexity revealed as needed
- **Tactile feedback** - Interactions should feel responsive and solid

---

## Data Visualization Principles

### Core Tenets (from The Pudding)
1. **Entry points matter** - Give users a personal stake in the data
2. **Iteration is everything** - First pass is never good enough
3. **Interactivity should be meaningful** - Not decoration
4. **Methods transparency builds trust**
5. **Single-point thesis** - Clear message, not just exploratory tool

### Interaction Patterns
- **Progressive disclosure** - Start simple, add complexity gradually
- **Personalization via survey** - Plot user's position in visualizations
- **Annotation strategy** - Highlight key shifts, link to context
- **Color coding** - Consistent categories throughout
- **Tooltips** - Details on demand, not always visible

### Chart Design
- **Purpose-driven** - Every chart answers a specific question
- **Accessible** - Colorblind modes, screen reader support
- **Mobile-first** - Plan mobile experience from the start
- **Performance** - Smooth even with large datasets

---

## Design System References

### Systems to Study
- **Swiss design** - Dieter Rams, Braun products
- **Japanese minimalism** - Muji philosophy
- **Apple's design system** - Precision and restraint
- **Bungie's UI/UX** - Destiny's design language

### Key Principles from These Systems
- **Less, but better** (Rams)
- **Honest materials** - Don't fake physicality
- **Functional beauty** - Form follows function
- **Restraint** - Know when to stop adding

---

## Competitive Positioning

### What We Are NOT
- Utilitarian enterprise dashboards (Paid.ai, etc.)
- Generic observability platforms
- AI-generated "tech" aesthetic
- One-size-fits-all solutions

### What We ARE
- Beautifully crafted personal analytics
- Interactive exploration tools
- Design-forward developer tools
- Premium experience for users who notice details

### Our Unique Value
- **Craftsmanship over features** - Fewer things, done incredibly well
- **Interactive storytelling** - Help users discover patterns, not just report them
- **Aesthetic quality** - For developers who appreciate beautiful tools
- **Personal analytics** - Focus on individual insight, not team surveillance

---

## Implementation Workflow

### When Building Visualizations
1. Sketch whiteboard version first
2. Define single-point thesis
3. Identify "aha" moment
4. Plan personalization hook
5. Prototype quickly (Python/matplotlib)
6. Iterate extensively (this is where quality happens)
7. Build production version (D3.js/Svelte)
8. Polish interactions and transitions
9. Test on actual devices
10. Add methods transparency

### When Evaluating Designs
Ask:
- Does this feel precise and weighty?
- Is every element purposeful?
- Would this work on mobile?
- Does it avoid AI aesthetic clichés?
- Is it beautiful AND functional?
- Does it help users understand their data?
- Would I be proud to show this?

---

## Performance Requirements

- Smooth 60fps interactions
- Fast initial load
- Progressive enhancement
- Works on mobile devices
- Accessible by default

---

## Evolution Notes

**Phase 1 (Current):** Establishing principles
**Phase 2:** Create component library following these principles
**Phase 3:** Extract into reusable Claude Code skill
**Phase 4:** Document case studies of applications

---

## Related Documents
- `RESOURCES.md` - All external links, tools, and inspiration references
- `README.md` - Project overview
- `__The_Pudding__Techniques__Tools___Best_Practices` - Detailed Pudding analysis

---

*Consult before designing any new interface. When in doubt: "Is this precise and weighty, or floaty and generic?"*