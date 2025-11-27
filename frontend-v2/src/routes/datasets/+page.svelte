<script lang="ts">
  import Fuse from 'fuse.js';
  import DatasetAccordion from '$lib/components/DatasetAccordion.svelte';
  import catalogData from '$lib/data/datasets.json';

  interface Collision {
    with: string;
    hypothesis: string;
  }

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
    collisions: Collision[];
  }

  interface Category {
    id: string;
    name: string;
    icon: string;
    datasets: Dataset[];
  }

  const categories: Category[] = catalogData.categories;

  // Flatten datasets for search
  const allDatasets = categories.flatMap(cat =>
    cat.datasets.map(d => ({ ...d, categoryId: cat.id }))
  );

  // Fuse.js configuration
  const fuse = new Fuse(allDatasets, {
    keys: ['title', 'description', 'source', 'join_key'],
    threshold: 0.4,
    includeScore: true
  });

  let searchQuery = $state('');
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Debounced search
  let debouncedQuery = $state('');

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQuery = searchQuery;
    }, 150);
  }

  // Compute filtered results
  let searchResults = $derived.by(() => {
    if (!debouncedQuery.trim()) {
      return null; // Show all categories
    }

    const results = fuse.search(debouncedQuery);
    const matchedIds = new Set(results.map(r => r.item.id));
    const matchedCategories = new Set(results.map(r => r.item.categoryId));

    return { matchedIds, matchedCategories };
  });

  // Filter categories based on search
  let filteredCategories = $derived.by(() => {
    if (!searchResults) {
      return categories;
    }

    return categories
      .filter(cat => searchResults.matchedCategories.has(cat.id))
      .map(cat => ({
        ...cat,
        datasets: cat.datasets.filter(d => searchResults.matchedIds.has(d.id))
      }));
  });

  // Track expanded state per category
  let expandedState = $state<Record<string, boolean>>({});

  // Auto-expand when searching
  $effect(() => {
    if (searchResults) {
      const newState: Record<string, boolean> = {};
      for (const catId of searchResults.matchedCategories) {
        newState[catId] = true;
      }
      expandedState = newState;
    }
  });

  // Total counts
  const totalDatasets = allDatasets.length;
  const totalCategories = categories.length;
</script>

<svelte:head>
  <title>Dataset Discovery | grapht</title>
</svelte:head>

<div class="datasets-page">
  <header class="page-header">
    <h1>Dataset Discovery</h1>
    <p class="subtitle">
      Curated government datasets with collision hypotheses.
      {totalDatasets} datasets across {totalCategories} categories.
    </p>
  </header>

  <div class="search-container">
    <input
      type="text"
      class="search-input"
      placeholder="Search datasets..."
      value={searchQuery}
      oninput={handleInput}
    />
    {#if debouncedQuery}
      <button class="clear-btn" onclick={() => { searchQuery = ''; debouncedQuery = ''; }}>
        ×
      </button>
    {/if}
  </div>

  <div class="results-summary">
    {#if searchResults}
      {#if filteredCategories.length === 0}
        <p class="no-results">No datasets match "{debouncedQuery}"</p>
      {:else}
        <p class="match-count">
          {searchResults.matchedIds.size} dataset{searchResults.matchedIds.size === 1 ? '' : 's'} found
        </p>
      {/if}
    {/if}
  </div>

  <div class="categories-list">
    {#each filteredCategories as category (category.id)}
      <DatasetAccordion
        {category}
        bind:expanded={expandedState[category.id]}
        highlightedDatasets={searchResults?.matchedIds ?? new Set()}
      />
    {/each}
  </div>

  {#if filteredCategories.length === 0 && !debouncedQuery}
    <p class="empty-state">No datasets available.</p>
  {/if}
</div>

<style>
  .datasets-page {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-8, 32px) var(--space-4, 16px);
  }

  .page-header {
    margin-bottom: var(--space-8, 32px);
  }

  h1 {
    font-size: var(--font-size-2xl, 32px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-text, #f5f5f5);
    margin: 0 0 var(--space-2, 8px);
  }

  .subtitle {
    font-size: var(--font-size-base, 16px);
    color: var(--color-text-muted, #a0a0a0);
    margin: 0;
  }

  .search-container {
    position: relative;
    margin-bottom: var(--space-4, 16px);
  }

  .search-input {
    width: 100%;
    padding: var(--space-3, 12px) var(--space-4, 16px);
    padding-right: var(--space-10, 40px);
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    font-family: inherit;
    font-size: var(--font-size-base, 16px);
    color: var(--color-text, #f5f5f5);
    outline: none;
    transition: border-color var(--transition-fast, 100ms) ease-out;
  }

  .search-input::placeholder {
    color: var(--color-text-muted, #a0a0a0);
  }

  .search-input:focus {
    border-color: var(--color-blue, #3b82f6);
  }

  .clear-btn {
    position: absolute;
    right: var(--space-3, 12px);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: var(--font-size-lg, 20px);
    color: var(--color-text-muted, #a0a0a0);
    cursor: pointer;
    padding: var(--space-1, 4px);
    line-height: 1;
  }

  .clear-btn:hover {
    color: var(--color-text, #f5f5f5);
  }

  .results-summary {
    min-height: var(--space-6, 24px);
    margin-bottom: var(--space-4, 16px);
  }

  .match-count {
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-muted, #a0a0a0);
    margin: 0;
  }

  .no-results {
    font-size: var(--font-size-base, 16px);
    color: var(--color-text-muted, #a0a0a0);
    text-align: center;
    padding: var(--space-8, 32px);
    margin: 0;
  }

  .categories-list {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    text-align: center;
    color: var(--color-text-muted, #a0a0a0);
    padding: var(--space-8, 32px);
  }

  @media (max-width: 768px) {
    .datasets-page {
      padding: var(--space-4, 16px);
    }

    h1 {
      font-size: var(--font-size-xl, 24px);
    }
  }
</style>
