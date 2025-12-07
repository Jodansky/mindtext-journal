import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { seedEntries } from '../data/sampleEntries';
import { extractKeywords } from '../lib/extractKeywords';

const LOCAL_STORAGE_KEY = 'mindtext-entries';
const LOCAL_STORAGE_DRAFT_KEY = 'mindtext-draft';

const JournalContext = createContext({
  entries: [],
  addEntry: () => Promise.resolve(),
  deleteEntry: () => {},
  draftThread: [],
  draftInput: '',
  setDraftThread: () => {},
  setDraftInput: () => {},
  clearDraft: () => {},
  hasLoadedDraft: false,
});

function generateTitle() {
  return 'Summary';
}

function normalizeEntry(entry) {
  const keywords = entry.keywords?.length
    ? entry.keywords
    : extractKeywords(`${entry.userText} ${entry.assistantText}`);

  return {
    ...entry,
    keywords,
    title: generateTitle({ ...entry, keywords }),
  };
}

export function JournalProvider({ children }) {
  const [entries, setEntries] = useState(() => seedEntries.map(normalizeEntry));
  const [draftThread, setDraftThread] = useState([]);
  const [draftInput, setDraftInput] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          setEntries(parsed.map(normalizeEntry));
        }
      } catch (error) {
        console.error('Unable to parse stored journal entries', error);
      }
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedDraft = window.localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft);
        if (Array.isArray(parsed.thread)) {
          setDraftThread(parsed.thread);
        }
        if (typeof parsed.input === 'string') {
          setDraftInput(parsed.input);
        }
      } catch (error) {
        console.error('Unable to parse stored draft entry', error);
      }
    }
    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !hasLoadedDraft || typeof window === 'undefined') {
      return;
    }

    const cleanedThread = draftThread.filter((message) => message && !message.isTyping);

    window.localStorage.setItem(
      LOCAL_STORAGE_DRAFT_KEY,
      JSON.stringify({ thread: cleanedThread, input: draftInput || '' })
    );
  }, [draftThread, draftInput, hasHydrated, hasLoadedDraft]);

  const addEntry = useCallback(async ({ userText, assistantText }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`;

    const entry = normalizeEntry({
      id,
      userText,
      assistantText,
      createdAt: new Date().toISOString(),
    });

    setEntries((current) => [...current, entry]);
  }, []);

  const deleteEntry = useCallback((id) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearDraft = useCallback(() => {
    setDraftThread([]);
    setDraftInput('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      entries,
      addEntry,
      deleteEntry,
      draftThread,
      draftInput,
      setDraftThread,
      setDraftInput,
      clearDraft,
      hasLoadedDraft,
    }),
    [
      entries,
      addEntry,
      deleteEntry,
      draftThread,
      draftInput,
      setDraftThread,
      setDraftInput,
      clearDraft,
      hasLoadedDraft,
    ]
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
}
