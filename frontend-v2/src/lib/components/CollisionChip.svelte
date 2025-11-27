<script lang="ts">
  interface Collision {
    with: string;
    hypothesis: string;
  }

  let { collision }: { collision: Collision } = $props();
</script>

<div class="collision-chip">
  <span class="target">× {collision.with}</span>
  <span class="hypothesis">{collision.hypothesis}</span>
</div>

<style>
  .collision-chip {
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 4px);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    background: var(--color-surface, #1a1a1a);
    border-radius: 4px;
    border-left: 2px solid var(--color-amber, #f59e0b);
  }

  .target {
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-amber, #f59e0b);
    font-family: var(--font-mono, 'SFMono-Regular', Monaco, Menlo, Consolas, monospace);
  }

  .hypothesis {
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-muted, #a0a0a0);
    line-height: 1.4;
  }
</style>
