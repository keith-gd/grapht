import { writable, derived } from 'svelte/store';

// API base URL - configure based on environment
const API_BASE = 'http://localhost:3001/api';

// Types for Archive Wall data
export interface ArchiveSession {
  session_id: string;
  session_start: string;
  session_end?: string;
  agent_type: string;
  model_name?: string;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  duration_minutes?: number;
}

export interface ArchiveDay {
  date: string;
  session_count: number;
  total_cost: number;
  total_tokens: number;
  agents_used: string[];
}

export interface ArchiveCommit {
  commit_hash: string;
  commit_message: string;
  commit_timestamp: string;
  files_changed: number;
  lines_added: number;
  lines_deleted: number;
  repository: string;
  author_name?: string;
  agent_type?: string;
  session_cost?: number;
}

export interface ArchiveStory {
  headline: string;
  subhead: string;
  insight: string;
  details?: Record<string, unknown>;
}

export interface ArchiveSummary {
  firstSession: ArchiveSession | null;
  mostExpensiveDay: ArchiveDay | null;
  favoriteAgent: { agent_type: string; count: number } | null;
  biggestWin: ArchiveCommit | null;
  totals: {
    total_sessions: number;
    total_cost: number;
    total_tokens: number;
  };
}

// Store state
interface ArchiveState {
  loading: boolean;
  error: string | null;
  summary: ArchiveSummary | null;
  firstSessionStory: ArchiveStory | null;
  expensiveDayStory: ArchiveStory | null;
  favoriteAgentStory: ArchiveStory | null;
  biggestWinStory: ArchiveStory | null;
}

const initialState: ArchiveState = {
  loading: false,
  error: null,
  summary: null,
  firstSessionStory: null,
  expensiveDayStory: null,
  favoriteAgentStory: null,
  biggestWinStory: null
};

// Create the store
function createArchiveStore() {
  const { subscribe, set, update } = writable<ArchiveState>(initialState);

  return {
    subscribe,

    // Fetch all archive data in one call
    async fetchSummary() {
      update(s => ({ ...s, loading: true, error: null }));

      try {
        const response = await fetch(`${API_BASE}/analytics/archive/summary`, {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const summary = await response.json();

        update(s => ({
          ...s,
          loading: false,
          summary,
          // Generate stories from summary data
          firstSessionStory: summary.firstSession ? generateFirstSessionStory(summary.firstSession) : null,
          expensiveDayStory: summary.mostExpensiveDay ? generateExpensiveDayStory(summary.mostExpensiveDay) : null,
          favoriteAgentStory: summary.favoriteAgent ? generateFavoriteAgentStory(summary.favoriteAgent, summary.totals.total_sessions) : null,
          biggestWinStory: summary.biggestWin ? generateBiggestWinStory(summary.biggestWin) : null
        }));

      } catch (error) {
        update(s => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch archive data'
        }));
      }
    },

    // Reset store
    reset() {
      set(initialState);
    }
  };
}

// Helper to get auth token (implement based on your auth system)
function getAuthToken(): string {
  // For development, use the default dev key
  // Check if we're in browser before accessing localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('auth_token') || 'dev_local_key';
  }
  return 'dev_local_key';
}

// Story generators
function generateFirstSessionStory(session: ArchiveSession): ArchiveStory {
  const date = new Date(session.session_start);
  return {
    headline: 'Your First Session',
    subhead: `It all started on ${date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`,
    insight: `You used ${formatAgentName(session.agent_type)} and spent $${(session.total_cost || 0).toFixed(2)}`
  };
}

function generateExpensiveDayStory(day: { date: string; sessions: number; cost: number }): ArchiveStory {
  const date = new Date(day.date);
  return {
    headline: 'Your Most Expensive Day',
    subhead: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    insight: `You ran ${day.sessions} sessions costing $${(day.cost || 0).toFixed(2)} total`
  };
}

function generateFavoriteAgentStory(agent: { agent_type: string; count: number }, totalSessions: number): ArchiveStory {
  const percentage = totalSessions > 0 ? ((agent.count / totalSessions) * 100).toFixed(0) : '0';
  return {
    headline: 'Your Favorite Agent',
    subhead: formatAgentName(agent.agent_type),
    insight: `${percentage}% of your sessions (${agent.count} total)`
  };
}

function generateBiggestWinStory(commit: ArchiveCommit): ArchiveStory {
  return {
    headline: 'Your Biggest Win',
    subhead: `+${commit.lines_added} lines in one commit`,
    insight: commit.commit_message || 'No commit message',
    details: {
      repository: commit.repository,
      filesChanged: commit.files_changed,
      date: commit.commit_timestamp
    }
  };
}

// Helper to format agent names nicely
function formatAgentName(agentType: string): string {
  if (!agentType) return 'Unknown Agent';
  return agentType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Export the store
export const archiveStore = createArchiveStore();

// Derived stores for easy access
export const isLoading = derived(archiveStore, $store => $store.loading);
export const archiveError = derived(archiveStore, $store => $store.error);
export const archiveSummary = derived(archiveStore, $store => $store.summary);
