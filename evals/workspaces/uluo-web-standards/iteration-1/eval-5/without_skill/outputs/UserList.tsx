import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  ChangeEvent,
} from 'react';
import './UserList.css';

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
}

export interface UserListProps {
  /** Fire-and-forget callback when the user selects a row */
  onUserSelect?: (user: User) => void;
  /** Custom placeholder text for the search input (optional) */
  searchPlaceholder?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

function UserList({ onUserSelect, searchPlaceholder = 'Search users…' }: UserListProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // ── Side-effect: fetch users from API ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          'https://jsonplaceholder.typicode.com/users',
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data: User[] = await response.json();

        if (!cancelled) {
          setUsers(data);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []); // run once on mount

  // ── Derived: filtered list ─────────────────────────────────────────────
  const filteredUsers = useMemo<User[]>(() => {
    if (!searchTerm.trim()) {
      return users;
    }

    const lower = searchTerm.toLowerCase();

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(lower) ||
        user.username.toLowerCase().includes(lower) ||
        user.email.toLowerCase().includes(lower),
    );
  }, [users, searchTerm]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const handleSelect = useCallback(
    (user: User) => {
      onUserSelect?.(user);
    },
    [onUserSelect],
  );

  // ── Render helpers ─────────────────────────────────────────────────────
  const renderStatus = () => {
    if (loading) {
      return (
        <div className="user-list__status user-list__status--loading">
          <span className="user-list__spinner" aria-hidden="true" />
          <p>Loading users…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="user-list__status user-list__status--error" role="alert">
          <p className="user-list__error-title">Something went wrong</p>
          <p className="user-list__error-detail">{error}</p>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="user-list__status user-list__status--empty">
          <p>No users available.</p>
        </div>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <div className="user-list__status user-list__status--empty">
          <p>
            No users match <strong>"{searchTerm}"</strong>
          </p>
        </div>
      );
    }

    return null; // data available — render the table below
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <section className="user-list" aria-busy={loading}>
      <header className="user-list__header">
        <h2 className="user-list__title">User Directory</h2>

        <div className="user-list__search">
          <label htmlFor="user-search" className="user-list__search-label">
            Search
          </label>
          <input
            id="user-search"
            className="user-list__search-input"
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            disabled={loading || users.length === 0}
          />
        </div>
      </header>

      {renderStatus()}

      {filteredUsers.length > 0 && (
        <table className="user-list__table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Username</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Website</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="user-list__row"
                tabIndex={0}
                role="button"
                onClick={() => handleSelect(user)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(user);
                  }
                }}
              >
                <td>{user.name}</td>
                <td>@{user.username}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.website}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default UserList;
