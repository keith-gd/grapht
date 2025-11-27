<script lang="ts">
  import { onMount } from 'svelte';

  export let value: number | string;
  export let prefix: string = '';
  export let suffix: string = '';
  export let color: 'blue' | 'green' | 'amber' | 'red' | 'highlight' = 'highlight';
  export let animate: boolean = true;
  export let duration: number = 1000;

  let displayValue: number | string = typeof value === 'number' ? 0 : value;
  let mounted = false;

  // Check for reduced motion preference
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const colorMap: Record<string, string> = {
    blue: 'var(--color-blue)',
    green: 'var(--color-green)',
    amber: 'var(--color-amber)',
    red: 'var(--color-red)',
    highlight: 'var(--color-highlight)'
  };

  const glowMap: Record<string, string> = {
    blue: 'var(--glow-blue)',
    green: 'var(--glow-green)',
    amber: 'var(--glow-amber)',
    red: 'var(--glow-red)',
    highlight: '0 0 20px rgba(251, 191, 36, 0.4)'
  };

  onMount(() => {
    mounted = true;

    if (animate && typeof value === 'number' && !reducedMotion) {
      animateValue(0, value, duration);
    } else {
      displayValue = value;
    }
  });

  // Animate number counting up
  function animateValue(start: number, end: number, dur: number) {
    const startTime = performance.now();
    const diff = end - start;

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / dur, 1);

      // Ease out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      displayValue = Math.round(start + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        displayValue = end;
      }
    }

    requestAnimationFrame(step);
  }

  // Re-animate when value changes
  $: if (mounted && animate && typeof value === 'number' && !reducedMotion) {
    const current = typeof displayValue === 'number' ? displayValue : 0;
    animateValue(current, value, duration);
  }

  // Format number with commas
  function formatNumber(n: number | string): string {
    if (typeof n === 'string') return n;
    return n.toLocaleString();
  }
</script>

<span
  class="archive-metric"
  style="
    --metric-color: {colorMap[color]};
    --metric-glow: {glowMap[color]};
  "
>
  {#if prefix}<span class="prefix">{prefix}</span>{/if}
  <span class="value">{formatNumber(displayValue)}</span>
  {#if suffix}<span class="suffix">{suffix}</span>{/if}
</span>

<style>
  .archive-metric {
    display: inline-block;
    font-size: clamp(3rem, 15vw, 8rem);
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    color: var(--metric-color);
    text-shadow: var(--metric-glow);
    line-height: 1;
  }

  .prefix,
  .suffix {
    font-size: 0.5em;
    opacity: 0.8;
  }

  .prefix {
    margin-right: 0.1em;
  }

  .suffix {
    margin-left: 0.1em;
  }
</style>
