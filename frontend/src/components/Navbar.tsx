import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import UnreadMessageCounter from './UnreadMessageCounter';

export default function Navbar(): React.ReactElement {
  const { user, logout } = useContext<any>(AuthContext);

  return (
    <header className="bg-[var(--bg-surface)] border-b border-[rgba(255,255,255,0.07)] p-4 flex items-center justify-between gap-4 shadow-[0_1px_0_rgba(255,255,255,0.04)]">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-3)]">APOLLO·KEY</p>
        <h1 className="text-xl font-semibold text-[var(--text-1)]">Parent & School Portal</h1>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <Link
            to="/messages"
            className="btn-ghost px-3 py-2 rounded-[var(--radius-sm)] text-[var(--text-2)] hover:text-[var(--text-1)]"
            title="Messages"
          >
            <UnreadMessageCounter />
          </Link>

          <div className="rounded-[var(--radius-sm)] border border-[rgba(255,255,255,0.07)] bg-[var(--bg-surface-2)] px-3 py-2 text-sm text-[var(--text-1)]">
            👋 {user.username}
          </div>

          <button
            onClick={logout}
            className="btn-ghost rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
