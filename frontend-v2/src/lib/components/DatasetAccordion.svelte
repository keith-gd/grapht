<script lang="ts">
  import DatasetCard from './DatasetCard.svelte';

  interface Dataset {
    id: string;
    title: string;
    source: string;
    url: string;
    description: string;
    granularity: string[];
    years: number[];
    join_key: string;
    download: string;
    collisions: Array<{ with: string; hypothesis: string }>;
  }

  interface Category {
    id: string;
    name: string;
    icon: string;
    datasets: Dataset[];
  }

  let { category, expanded = $bindable(false), highlightedDatasets = new Set() }: {
    category: Category;
    expanded?: boolean;
    highlightedDatasets?: Set<string>;
  } = $props();

  function toggle() {
    expanded = !expanded;
  }
</script>

<div class="accordion" class:expanded>
  <button class="accordion-header" onclick={toggle}>
    <span class="icon">{category.icon}</span>
    <span class="name">{category.name}</span>
    <span class="count">{category.datasets.length}</span>
    <span class="chevron" class:rotated={expanded}>▾</span>
  </button>

  <div class="accordion-content" class:open={expanded}>
    {#each category.datasets as dataset (dataset.id)}
      <DatasetCard
        {dataset}
        highlighted={highlightedDatasets.has(dataset.id)}
      />
    {/each}
  </div>
</div>

<style>
  .accordion {
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: var(--space-3, 12px);
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    width: 100%;
    padding: var(--space-4, 16px);
    background: var(--color-surface, #1a1a1a);
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: var(--font-size-base, 16px);
    color: var(--color-text, #f5f5f5);
    text-align: left;
    transition: background var(--transition-fast, 100ms) ease-out;
  }

  .accordion-header:hover {
    background: var(--color-surface-hover, #252525);
  }

  .icon {
    font-size: var(--font-size-lg, 20px);
  }

  .name {
    flex: 1;
    font-weight: var(--font-weight-semibold, 600);
  }

  .count {
    background: var(--color-bg, #0f0f0f);
    padding: var(--space-1, 4px) var(--space-2, 8px);
    border-radius: 12px;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-muted, #a0a0a0);
  }

  .chevron {
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-muted, #a0a0a0);
    transition: transform var(--transition-normal, 200ms) ease-out;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .accordion-content {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--transition-normal, 200ms) ease-out;
  }

  .accordion-content.open {
    grid-template-rows: 1fr;
  }

  .accordion-content > :global(*) {
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron,
    .accordion-content {
      transition: none;
    }
  }
</style>
