import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import styles from './UserList.module.css';

// =============================================================================
// Types
// =============================================================================

/** Represents a user entity returned by the API. */
interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Discriminated union for async data-fetching state.
 * Only one status branch is active at any time — TypeScript
 * narrows the available fields after checking the discriminant.
 */
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T[] }
  | { status: 'error'; error: string }
  | { status: 'empty' };

/** Props accepted by the UserList component. */
interface UserListProps {
  /**
   * Callback invoked when the user clicks a list item.
   * The parent receives the full User object to decide what to do next.
   */
  onUserSelect: (user: User) => void;
  /** Override the default API endpoint. Defaults to '/api/users'. */
  apiEndpoint?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * UserList — a searchable, selectable user directory.
 *
 * Behaviour:
 * 1. Fetches users from `apiEndpoint` on mount (with AbortController cleanup).
 * 2. Provides a client-side search filter backed by `useMemo`.
 * 3. Covers four UI states: loading (skeleton), empty (guidance), error (retry),
 *    success (interactive list).
 * 4. Emits the selected `User` to the parent via `onUserSelect` (wrapped in
 *    `useCallback` for stable reference).
 */
export function UserList({
  onUserSelect,
  apiEndpoint = '/api/users',
}: UserListProps) {
  // ---- State ------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [asyncState, setAsyncState] = useState<AsyncState<User>>({
    status: 'idle',
  });

  // Incrementing this key triggers a re-fetch (used by the retry flow).
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // ---- Effects ----------------------------------------------------------

  /**
   * Fetch user data whenever the endpoint or fetch-trigger changes.
   * The AbortController + `cancelled` flag prevent state updates after
   * unmount.
   */
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchUsers(): Promise<void> {
      setAsyncState({ status: 'loading' });

      try {
        const response = await fetch(apiEndpoint, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const users = (await response.json()) as User[];

        if (cancelled) {
          return;
        }

        if (users.length === 0) {
          setAsyncState({ status: 'empty' });
        } else {
          setAsyncState({ status: 'success', data: users });
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        // AbortError is expected on unmount — silently ignore.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setAsyncState({ status: 'error', error: message });
      }
    }

    fetchUsers();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiEndpoint, fetchTrigger]);

  // ---- Derived Data -----------------------------------------------------

  /**
   * Client-side filtering: match users whose name or email contains the
   * search query (case-insensitive).  When the query is empty the full
   * dataset is returned.
   */
  const filteredUsers = useMemo<User[]>(() => {
    if (asyncState.status !== 'success') {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) {
      return asyncState.data;
    }

    return asyncState.data.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [asyncState, searchQuery]);

  // ---- Handlers (stable references via useCallback) ---------------------

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  /**
   * Notify the parent when a user is selected.
   * Wrapped in `useCallback` so the reference is stable across renders
   * (important when the parent passes `onUserSelect` as a dependency to
   * other hooks).
   */
  const handleSelectUser = useCallback(
    (user: User) => {
      onUserSelect(user);
    },
    [onUserSelect],
  );

  /** Re-trigger the data fetch (used by the Error and Empty views). */
  const handleRetry = useCallback(() => {
    setFetchTrigger((count) => count + 1);
  }, []);

  /**
   * Keyboard support: Enter/Space activate the item, matching native button
   * behaviour that some assistive-tech users rely on.
   */
  const handleItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, user: User) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectUser(user);
      }
    },
    [handleSelectUser],
  );

  // ---- Render: Error State ----------------------------------------------

  if (asyncState.status === 'error') {
    return (
      <div className={styles.container} role="alert">
        <div className={styles.errorBlock}>
          <p className={styles.errorTitle}>Failed to load users</p>
          <p className={styles.errorDetail}>{asyncState.error}</p>
          <button
            className={styles.retryButton}
            type="button"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---- Render: Loading / Idle State -------------------------------------

  if (asyncState.status === 'loading' || asyncState.status === 'idle') {
    return (
      <div
        className={styles.container}
        role="status"
        aria-label="Loading user list"
      >
        <div className={styles.searchSkeleton} />
        <ul className={styles.list}>
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className={styles.skeletonItem}>
              <span className={styles.skeletonLine} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- Render: Empty State (API returned zero users) --------------------

  if (asyncState.status === 'empty') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyBlock}>
          <p className={styles.emptyTitle}>No users yet</p>
          <p className={styles.emptyHint}>
            Create your first user to get started.
          </p>
          <button
            className={styles.retryButton}
            type="button"
            onClick={handleRetry}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // ---- Render: Success State --------------------------------------------

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasFilteredResults = filteredUsers.length > 0;

  return (
    <div className={styles.container}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search users"
        />
      </div>

      {/* Search yielded no matches */}
      {hasSearchQuery && !hasFilteredResults ? (
        <div className={styles.emptyBlock}>
          <p className={styles.emptyTitle}>
            No users match &ldquo;{searchQuery}&rdquo;
          </p>
          <p className={styles.emptyHint}>
            Try a different keyword or clear the search.
          </p>
        </div>
      ) : (
        /* Interactive user list */
        <ul className={styles.list}>
          {filteredUsers.map((user) => (
            <li key={user.id} className={styles.listItem}>
              <button
                className={styles.userButton}
                type="button"
                onClick={() => handleSelectUser(user)}
                onKeyDown={(event) => handleItemKeyDown(event, user)}
                aria-label={`Select ${user.name}, ${user.email}`}
              >
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
