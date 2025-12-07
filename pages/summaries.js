import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { useJournal } from '../context/JournalContext';

export default function SummariesPage() {
  const router = useRouter();
  const { entries, deleteEntry } = useJournal();
  const [query, setQuery] = useState('');
  const [showSavedNotice, setShowSavedNotice] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!router.isReady || !router.query.saved) {
      return undefined;
    }

    setShowSavedNotice(true);
    const timer = setTimeout(() => setShowSavedNotice(false), 4000);

    const { saved, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, {
      shallow: true,
    });

    return () => clearTimeout(timer);
  }, [router.isReady, router.pathname, router.query, router.replace]);

  const handleDelete = (id) => {
    const confirmed =
      typeof window === 'undefined' ? true : window.confirm('Delete this entry?');

    if (!confirmed) {
      return;
    }

    deleteEntry(id);
  };

  const keywordCounts = useMemo(() => {
    const counts = new Map();
    entries.forEach((entry) => {
      entry.keywords?.forEach((keyword) => {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword]) => keyword);
  }, [entries]);

  const results = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter((entry) => {
      const haystack = `${entry.userText} ${entry.assistantText}`.toLowerCase();
      const keywordMatch = entry.keywords?.some((keyword) =>
        keyword.includes(normalizedQuery)
      );
      return haystack.includes(normalizedQuery) || keywordMatch;
    });
  }, [entries, normalizedQuery]);

  return (
    <AppShell>
      <section className="summary-view">
        {showSavedNotice && (
          <div className="status-banner status-success" role="status">
            Entry Saved
          </div>
        )}
        <div>
          <form className="summary-search" onSubmit={(event) => event.preventDefault()}>
            <input
              type="search"
              placeholder="Search gratitude, energy, names, themes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search entries"
            />
          </form>
          {keywordCounts.length > 0 && (
            <div className="quick-keywords" aria-label="Quick filters">
              {keywordCounts.map((keyword) => (
                <button
                  type="button"
                  key={keyword}
                  onClick={() => setQuery(keyword)}
                  className={
                    keyword.toLowerCase() === normalizedQuery ? 'is-active' : undefined
                  }
                >
                  {keyword}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="summary-results">
          {results.length === 0 ? (
            <div className="empty-state">
              <p>No entries mention “{query}” yet.</p>
              <p>Try a different keyword or write something new today.</p>
            </div>
          ) : (
            results.map((entry) => {
              const summaryText = entry.assistantText ?? '';
              const writingText = entry.userText ?? '';
              const summaryMatches =
                normalizedQuery && summaryText.toLowerCase().includes(normalizedQuery);
              const writingMatches =
                normalizedQuery && writingText.toLowerCase().includes(normalizedQuery);

              return (
                <article key={entry.id} className="summary-card">
                  <div className="summary-card-header">
                    <p className="message-meta">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(entry.id)}
                      aria-label="Delete entry"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <h2>{renderHighlight(entry.title || 'MindText summary', normalizedQuery)}</h2>
                  <p>{renderHighlight(summaryText, normalizedQuery)}</p>
                  {writingMatches && !summaryMatches && (
                    <p className="match-note">
                      You mentioned “{query}” in your writing even if it isn’t in this
                      summary.
                    </p>
                  )}
                  {entry.keywords?.length > 0 && (
                    <div className="keyword-row">
                      {entry.keywords.map((keyword) => (
                        <span key={keyword} className="keyword-pill">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </AppShell>
  );
}

function renderHighlight(text = '', query) {
  const safeText = text ?? '';
  if (!query) {
    return safeText;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
  const parts = safeText.split(regex);
  const normalized = query.toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === normalized ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" role="img" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3.5h6c.28 0 .5.22.5.5v1H8.5v-1c0-.28.22-.5.5-.5Zm-2 1v-1A2.5 2.5 0 0 1 9.5 1h5A2.5 2.5 0 0 1 17 3.5v1h3a1 1 0 1 1 0 2h-.65l-.84 13.02A2.5 2.5 0 0 1 16.02 22H7.98a2.5 2.5 0 0 1-2.49-2.48L4.65 6.5H4a1 1 0 1 1 0-2h3Zm8.84 4H8.16l.78 12.13a.5.5 0 0 0 .5.47h4.12a.5.5 0 0 0 .5-.47L15.84 8.5ZM10 10.5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}
