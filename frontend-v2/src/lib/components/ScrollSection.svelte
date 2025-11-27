<script lang="ts">
  import { inview } from 'svelte-inview';
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let theme: 'dark' | 'blue' | 'green' | 'amber' | 'red' = 'dark';
  export let align: 'center' | 'left' | 'right' = 'center';

  const dispatch = createEventDispatcher();

  let isInView = false;
  let progress = 0;

  // Theme color mapping
  const themeColors: Record<string, string> = {
    dark: 'var(--color-bg)',
    blue: 'var(--color-blue)',
    green: 'var(--color-green)',
    amber: 'var(--color-amber)',
    red: 'var(--color-red)'
  };

  function handleInView({ detail }: { detail: { inView: boolean; scrollDirection: { vertical: string } } }) {
    isInView = detail.inView;
    dispatch('visibility', { id, inView: isInView });
  }

  function handleProgress({ detail }: { detail: { inView: boolean; node: HTMLElement } }) {
    if (detail.inView && detail.node) {
      const rect = detail.node.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Calculate how far through the section we are
      progress = Math.max(0, Math.min(1, 1 - (rect.top / viewportHeight)));
    }
  }
</script>

<section
  {id}
  class="scroll-section"
  class:in-view={isInView}
  class:align-left={align === 'left'}
  class:align-right={align === 'right'}
  style="--section-accent: {themeColors[theme]}"
  use:inview={{ threshold: 0.15, rootMargin: '-10% 0px' }}
  on:inview_change={handleInView}
  on:inview_enter={handleProgress}
>
  <div class="scroll-content" style="--progress: {progress}">
    <slot {isInView} {progress} />
  </div>

  <!-- Decorative accent line -->
  {#if theme !== 'dark'}
    <div class="accent-line"></div>
  {/if}
</section>

<style>
  .scroll-section {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--space-8);
    position: relative;
    background: var(--color-bg);
    transition: opacity var(--transition-slow);
  }

  .scroll-section.align-left {
    align-items: flex-start;
    text-align: left;
  }

  .scroll-section.align-right {
    align-items: flex-end;
    text-align: right;
  }

  .scroll-section:not(.align-left):not(.align-right) {
    align-items: center;
    text-align: center;
  }

  .scroll-content {
    max-width: 800px;
    width: 100%;
    opacity: 0;
    transform: translateY(20px);
    transition:
      opacity 400ms ease-out,
      transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .scroll-section.in-view .scroll-content {
    opacity: 1;
    transform: translateY(0);
  }

  /* Prevent transform from affecting scroll behavior */
  .scroll-section {
    will-change: auto;
  }

  .accent-line {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 3px;
    background: var(--section-accent);
    border-radius: 2px;
    opacity: 0.5;
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    .scroll-section {
      padding: var(--space-6) var(--space-4);
      min-height: auto;
      min-height: 80vh;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .scroll-content {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
</style>
