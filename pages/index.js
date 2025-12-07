import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { useJournal } from '../context/JournalContext';

const welcomeText = 'How are you feeling?';

function createWelcomeMessage() {
  return {
    id: `assistant-welcome-${Date.now()}`,
    role: 'assistant',
    text: welcomeText,
    createdAt: new Date().toISOString(),
    isSeed: true,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const {
    addEntry,
    draftThread,
    draftInput,
    setDraftThread,
    setDraftInput,
    clearDraft,
    hasLoadedDraft,
  } = useJournal();
  const [thread, setThread] = useState(() => [createWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  useEffect(() => {
    if (!hasLoadedDraft || hasHydratedDraft) {
      return;
    }

    if (draftThread?.length) {
      setThread(draftThread);
    } else {
      setThread([createWelcomeMessage()]);
    }

    if (typeof draftInput === 'string') {
      setInput(draftInput);
    }

    setHasHydratedDraft(true);
  }, [draftThread, draftInput, hasLoadedDraft, hasHydratedDraft]);

  useEffect(() => {
    if (!hasHydratedDraft) return;
    const cleaned = thread.filter((message) => message && !message.isTyping);
    setDraftThread(cleaned);
  }, [thread, hasHydratedDraft, setDraftThread]);

  useEffect(() => {
    if (!hasHydratedDraft) return;
    setDraftInput(input);
  }, [input, hasHydratedDraft, setDraftInput]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread.length]);

  const hasUserMessage = thread.some((message) => message.role === 'user');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending || isSummarizing) {
      return;
    }

    setError('');
    const stamp = Date.now();
    const userMessage = {
      id: `user-${stamp}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    const typingMessage = {
      id: `assistant-typing-${stamp}`,
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      isTyping: true,
    };

    const baseThread = [...thread, userMessage];

    setThread((previous) => [...previous, userMessage, typingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const history = baseThread
        .filter((message) => !message.isSeed)
        .map((message) => ({ role: message.role, content: message.text }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: trimmed, history }),
      });

      if (!response.ok) {
        throw new Error('Unable to reach the journal service.');
      }

      const data = await response.json();
      const reply =
        data.message?.trim() ?? "I'm not sure what to say yet, but I'm listening.";

      const assistantMessage = {
        id: `assistant-${stamp}`,
        role: 'assistant',
        text: reply,
        createdAt: new Date().toISOString(),
      };

      setThread((previous) =>
        previous.map((message) =>
          message.id === typingMessage.id ? assistantMessage : message
        )
      );
    } catch (err) {
      console.error(err);
      setThread((previous) =>
        previous.filter((message) => message.id !== typingMessage.id)
      );
      setError('MindText had trouble responding. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleNewEntry = () => {
    if (isSending || isSummarizing) {
      return;
    }

    const shouldConfirm = hasUserMessage && typeof window !== 'undefined';
    if (shouldConfirm) {
      const confirmReset = window.confirm(
        'Start a fresh entry? Your current conversation will be cleared.'
      );
      if (!confirmReset) {
        return;
      }
    }

    setThread([createWelcomeMessage()]);
    setInput('');
    setError('');
    clearDraft();
  };

  const handleSaveEntry = async () => {
    if (!hasUserMessage || isSummarizing) {
      return;
    }

    setError('');
    setIsSummarizing(true);

    const orderedMessages = thread.filter(
      (message) => !message.isTyping && !message.isSeed
    );
    const userNarrativeParts = orderedMessages
      .filter((message) => message.role === 'user')
      .map((message) => message.text.trim())
      .filter(Boolean);

    if (userNarrativeParts.length === 0) {
      setIsSummarizing(false);
      setError('Add a thought before saving this entry.');
      return;
    }

    const entryBody = userNarrativeParts.join('\n\n');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entryText: entryBody }),
      });

      if (!response.ok) {
        throw new Error('Unable to summarize entry.');
      }

      const data = await response.json();
      const summary =
        data.summary?.trim() ??
        'You checked in with MindText but we could not create a summary this time.';

      await addEntry({ userText: entryBody, assistantText: summary });
      clearDraft();
      setThread([createWelcomeMessage()]);
      setInput('');
      router.push('/summaries?saved=1');
    } catch (err) {
      console.error(err);
      setError('MindText could not save that entry. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <AppShell>
      <div className="chat-stack">
        <div className="chat-actions">
          <button
            type="button"
            className="action-button"
            onClick={handleNewEntry}
            disabled={isSending || isSummarizing}
          >
            New entry
          </button>
          <button
            type="button"
            className="action-button action-primary"
            onClick={handleSaveEntry}
            disabled={!hasUserMessage || isSending || isSummarizing}
          >
            {isSummarizing ? 'Saving…' : 'Save & Summarize'}
          </button>
        </div>
        <div ref={listRef} className="chat-list" aria-live="polite">
          {thread.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
        <div className="chat-input-bar">
          {error && (
            <p className="message-meta" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="entry"
              autoComplete="off"
              placeholder="What's on your mind?"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isSending || isSummarizing}
            />
            <button type="submit" disabled={isSending || isSummarizing}>
              {isSending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}>
      {message.isTyping ? (
        <span className="typing-indicator">
          <span />
          <span />
          <span />
        </span>
      ) : (
        message.text
      )}
      <div className="message-meta">
        {isUser ? 'You' : 'MindText'} ·{' '}
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
