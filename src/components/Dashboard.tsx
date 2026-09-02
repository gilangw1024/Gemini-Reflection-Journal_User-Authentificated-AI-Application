import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Bot,
  User as UserIcon,
  RefreshCw,
  Lightbulb,
  FileText,
  BookmarkPlus,
  Trash2,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Check,
  AlertCircle,
  Save,
  ArrowRight,
} from 'lucide-react';
import { JournalEntry, JournalMessage } from '../types';
import {
  saveJournalEntry,
  fetchUserJournalEntries,
  deleteJournalEntry,
  logoutUser,
} from '../firebase';
import { User } from 'firebase/auth';

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSignOut }) => {
  // Entries history state
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  // Active session state
  const [currentEntryId, setCurrentEntryId] = React.useState<string>(() =>
    'entry_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
  );
  const [entryTitle, setEntryTitle] = React.useState<string>('The Quiet Morning');
  const [entryTags, setEntryTags] = React.useState<string[]>(['Mindset', 'Clarity']);
  const [messages, setMessages] = React.useState<JournalMessage[]>([]);
  const [inputPrompt, setInputPrompt] = React.useState<string>('');
  const [selectedMode, setSelectedMode] = React.useState<
    'reflect' | 'summarize' | 'brainstorm' | 'chat'
  >('reflect');

  // AI & Save Status
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [modelUsed, setModelUsed] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Load user's isolated Firestore entries
  const loadEntries = React.useCallback(async () => {
    try {
      setLoadingEntries(true);
      const data = await fetchUserJournalEntries(user.uid);
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to load journal entries from Firestore:', err);
      setApiError('Unable to load entry history from Firestore.');
    } finally {
      setLoadingEntries(false);
    }
  }, [user.uid]);

  React.useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Save current entry to Firestore
  const handleSaveToFirestore = async (overrideMessages?: JournalMessage[]) => {
    const msgsToSave = overrideMessages || messages;
    if (msgsToSave.length === 0) return;

    try {
      setIsSaving(true);
      setApiError(null);

      await saveJournalEntry(user.uid, {
        id: currentEntryId,
        title: entryTitle || 'Untitled Reflection',
        tags: entryTags,
        mode: selectedMode,
        messages: msgsToSave,
        updatedAt: new Date().toISOString(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadEntries();
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setApiError('Failed to save journal to Firestore: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-generate title & tags using Gemini
  const handleAutoTitle = async () => {
    if (messages.length === 0) return;
    try {
      const fullText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      const response = await fetch('/api/journal/suggest-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });
      const data = await response.json();
      if (data.title) setEntryTitle(data.title);
      if (data.tags && Array.isArray(data.tags)) setEntryTags(data.tags);
    } catch (err) {
      console.warn('Auto title suggestion skipped:', err);
    }
  };

  // Submit Prompt to Gemini API
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || isGenerating) return;

    const userMessage: JournalMessage = {
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsGenerating(true);
    setApiError(null);

    try {
      const response = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          mode: selectedMode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gemini API call failed.');
      }

      const modelMessage: JournalMessage = {
        id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
        role: 'model',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, modelMessage];
      setMessages(finalMessages);
      setModelUsed(data.modelUsed);

      // Auto-save to Firestore immediately after generation
      await handleSaveToFirestore(finalMessages);

      // Automatically suggest smart title if on first turn
      if (messages.length === 0) {
        handleAutoTitle();
      }
    } catch (err: any) {
      console.error('Gemini Generation Error:', err);
      setApiError(err?.message || 'Error communicating with Gemini AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Start a fresh new journal entry
  const handleStartNewEntry = () => {
    setCurrentEntryId(
      'entry_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
    );
    setEntryTitle('The Quiet Reflection');
    setEntryTags(['Mindset', 'Growth']);
    setMessages([]);
    setInputPrompt('');
    setApiError(null);
  };

  // Select an existing entry from History
  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEntryId(entry.id);
    setEntryTitle(entry.title || 'Untitled Reflection');
    setEntryTags(entry.tags || []);
    setSelectedMode(entry.mode || 'reflect');
    setMessages(entry.messages || []);
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this reflection entry?')) return;

    try {
      await deleteJournalEntry(user.uid, entryId);
      if (currentEntryId === entryId) {
        handleStartNewEntry();
      }
      await loadEntries();
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setApiError('Could not delete entry.');
    }
  };

  // Filtered entries for search
  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = (e.title || '').toLowerCase().includes(q);
    const contentMatch = (e.messages || []).some((m) => m.content.toLowerCase().includes(q));
    const tagMatch = (e.tags || []).some((t) => t.toLowerCase().includes(q));
    return titleMatch || contentMatch || tagMatch;
  });

  // Extract initials for the bold user badge
  const userInitials = (user.displayName || user.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen w-full bg-[#FDFCFB] text-[#121212] font-sans overflow-hidden selection:bg-[#121212] selection:text-white">
      {/* SIDEBAR */}
      <aside
        className={`${
          isSidebarOpen ? 'w-80 sm:w-88' : 'w-0 -ml-80 sm:-ml-88 md:ml-0 md:w-20'
        } transition-all duration-300 ease-in-out border-r border-[#121212] flex flex-col justify-between p-6 sm:p-8 bg-[#FDFCFB] z-20 shrink-0 select-none`}
      >
        <div className="space-y-8 flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            {isSidebarOpen ? (
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase leading-none text-[#121212]">
                  MIND<br />REFLECT
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0] mt-1.5">
                  Gemini 3.6 • Firestore
                </p>
              </div>
            ) : (
              <div className="w-8 h-8 bg-[#121212] text-white flex items-center justify-center font-black text-xs">
                MR
              </div>
            )}
            <button
              id="toggle-sidebar-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 text-[#121212] hover:opacity-60 transition-opacity"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Action: New Entry */}
          <button
            id="new-reflection-btn"
            onClick={handleStartNewEntry}
            className={`bg-[#121212] text-white w-full py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              !isSidebarOpen && 'md:py-3 md:px-0'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {isSidebarOpen && <span>+ New Entry</span>}
          </button>

          {/* Search */}
          {isSidebarOpen && (
            <div className="relative border-b border-[#121212] pb-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH PAST SESSIONS..."
                className="w-full bg-transparent text-[11px] font-bold tracking-wider placeholder-[#A0A0A0] focus:outline-hidden text-[#121212]"
              />
              <Search className="w-3.5 h-3.5 absolute right-0 top-1 text-[#A0A0A0]" />
            </div>
          )}

          {/* Navigation / History List */}
          <nav className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              {isSidebarOpen && (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
                  History ({filteredEntries.length})
                </p>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingEntries ? (
                  <div className="py-4 text-center text-xs text-[#A0A0A0] flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {isSidebarOpen && <span>FETCHING ENTRIES...</span>}
                  </div>
                ) : filteredEntries.length === 0 ? (
                  isSidebarOpen && (
                    <div className="py-6 text-center text-[#A0A0A0]">
                      <BookmarkPlus className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">
                        NO ENTRIES RECORDED
                      </p>
                    </div>
                  )
                ) : (
                  <ul className="space-y-3.5">
                    {filteredEntries.map((entry) => {
                      const isSelected = entry.id === currentEntryId;
                      const dateFormatted = entry.updatedAt
                        ? new Date(entry.updatedAt)
                            .toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            .toUpperCase()
                        : 'RECENT';

                      return (
                        <li
                          key={entry.id}
                          onClick={() => handleSelectEntry(entry)}
                          className={`group cursor-pointer transition-opacity ${
                            isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span
                                className={`text-sm font-bold block truncate leading-tight ${
                                  isSelected ? 'border-b-2 border-[#121212] pb-0.5 inline-block' : ''
                                }`}
                              >
                                {entry.title || 'Untitled Session'}
                              </span>
                              {isSidebarOpen && (
                                <p className="text-[10px] font-bold text-[#A0A0A0] mt-1 tracking-wider uppercase">
                                  {dateFormatted} • {entry.messages?.length || 0} MSGS
                                </p>
                              )}
                            </div>

                            {isSidebarOpen && (
                              <button
                                onClick={(e) => handleDeleteEntry(entry.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-[#A0A0A0] hover:text-[#121212] transition-opacity"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-6 border-t border-[#121212] mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-[#121212] rounded-full flex items-center justify-center text-white text-[10px] font-black tracking-tight shrink-0">
              {userInitials}
            </div>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate text-[#121212]">
                  {user.displayName || user.email?.split('@')[0] || 'Member'}
                </p>
                <button
                  onClick={async () => {
                    await logoutUser();
                    onSignOut();
                  }}
                  className="text-[10px] text-[#A0A0A0] hover:text-[#121212] font-bold uppercase tracking-tighter cursor-pointer transition-colors block text-left"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <button
            id="dashboard-logout-btn"
            onClick={async () => {
              await logoutUser();
              onSignOut();
            }}
            className="p-1.5 text-[#121212] hover:opacity-60 transition-opacity"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative bg-[#FDFCFB] overflow-hidden">
        {/* Giant Watermark Typography */}
        <div className="absolute top-0 right-0 p-8 sm:p-12 pointer-events-none select-none z-0">
          <p className="text-[120px] sm:text-[180px] md:text-[220px] font-black leading-none text-[#121212] opacity-[0.03] uppercase tracking-tighter">
            GEMINI
          </p>
        </div>

        {/* Top Control Bar */}
        <header className="h-20 border-b border-[#121212] px-6 sm:px-12 flex items-center justify-between relative z-10 bg-[#FDFCFB]/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
              ACTIVE MODE:
            </span>
            <div className="flex items-center gap-1.5">
              {(['reflect', 'summarize', 'brainstorm'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                    selectedMode === mode
                      ? 'bg-[#121212] text-white'
                      : 'bg-[#EEE] text-[#121212] hover:bg-[#DDD]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {modelUsed && (
              <span className="hidden md:inline text-[9px] font-bold uppercase tracking-[0.15em] text-[#A0A0A0]">
                MODEL: {modelUsed}
              </span>
            )}

            <button
              id="manual-save-btn"
              onClick={() => handleSaveToFirestore()}
              disabled={isSaving || messages.length === 0}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#121212] transition-all flex items-center gap-2 cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-transparent text-[#121212] hover:bg-[#121212] hover:text-white'
              } disabled:opacity-30`}
            >
              {isSaving ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3 h-3" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span>{isSaving ? 'SAVING...' : saveSuccess ? 'SAVED' : 'SAVE'}</span>
            </button>
          </div>
        </header>

        {/* Error notification */}
        {apiError && (
          <div className="bg-red-600 text-white px-6 sm:px-12 py-2 flex items-center justify-between text-xs font-mono relative z-20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-white uppercase font-bold hover:underline"
            >
              [DISMISS]
            </button>
          </div>
        )}

        {/* Session Content Stream */}
        <section className="flex-1 p-6 sm:p-12 flex flex-col justify-between overflow-y-auto relative z-10 space-y-10">
          <div className="max-w-4xl w-full">
            {/* Massive Bold Headline Title */}
            <input
              id="entry-title-input"
              type="text"
              value={entryTitle}
              onChange={(e) => setEntryTitle(e.target.value)}
              placeholder="THE UNTITLED SESSION"
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-black leading-[0.88] tracking-tighter mb-8 uppercase text-[#121212] bg-transparent border-none focus:outline-hidden w-full placeholder-[#CCC]"
            />

            {/* Empty State / Initial Focus Card */}
            {messages.length === 0 ? (
              <div className="border-t border-[#121212] pt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-4">
                      Reflection Focus
                    </p>
                    <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-[#333]">
                      "What friction or milestone is occupying your attention today? Is the resistance you feel a barrier, or the momentum of growth?"
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-[#121212] text-white p-6 shadow-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Gemini 3.6 Synthesis
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-90 font-mono">
                        Multi-turn conversational reflection active. Write below to receive structured feedback, core summaries, and coaching prompts.
                      </p>
                    </div>

                    {/* Starter Inspiration Chips */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {['Productivity', 'Mindset', 'Clarity', 'Priorities'].map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-[#EEE] text-[9px] font-bold uppercase tracking-widest text-[#121212]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'I need to evaluate my current priorities and unpack where my energy is leaking.'
                      )
                    }
                    className="p-4 border border-[#121212] hover:bg-[#121212] hover:text-white transition-colors text-left group cursor-pointer"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">
                      01 / ENERGY & PRIORITIES
                    </p>
                    <p className="text-xs text-[#666] group-hover:text-stone-300">
                      Unpack demanding commitments and restore mental focus.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'I want to brainstorm a strategy for an ambitious project I am procrastinating on.'
                      )
                    }
                    className="p-4 border border-[#121212] hover:bg-[#121212] hover:text-white transition-colors text-left group cursor-pointer"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">
                      02 / AMBITIOUS STRATEGY
                    </p>
                    <p className="text-xs text-[#666] group-hover:text-stone-300">
                      Break hesitation into executable steps with Gemini.
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              /* Conversation Messages */
              <div className="border-t border-[#121212] pt-8 space-y-8">
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div
                      key={message.id}
                      className={`space-y-3 ${
                        isUser ? 'pl-4 border-l-2 border-[#121212]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
                        <span>{isUser ? `JOURNAL ENTRY // ${user.displayName || 'USER'}` : 'GEMINI REFLECTION // AI'}</span>
                        <span>
                          {message.timestamp
                            ? new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      {isUser ? (
                        <p className="text-lg sm:text-xl font-bold leading-relaxed text-[#121212] whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <div className="bg-[#121212] text-white p-6 sm:p-8 shadow-xl">
                          <div className="text-sm prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-li:my-1 text-stone-100">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Generating Status */}
                {isGenerating && (
                  <div className="bg-[#121212] text-white p-6 flex items-center gap-3">
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                      GEMINI IS SYNTHESIZING THOUGHTS...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Stark Input Bar */}
          <div className="w-full max-w-4xl pt-6">
            <div className="relative flex items-end gap-4 border-b-4 border-[#121212] pb-4">
              <textarea
                id="journal-prompt-textarea"
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="CONTINUE THE THOUGHT... (CMD + ENTER)"
                className="flex-1 bg-transparent border-none focus:outline-hidden text-xl sm:text-2xl font-bold placeholder-[#DDD] resize-none text-[#121212] leading-tight"
              />

              <button
                id="submit-reflection-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || isGenerating}
                className="h-12 w-12 flex items-center justify-center bg-[#121212] text-white hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-30 shrink-0"
                title="Send Prompt"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Status Metadata */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0] gap-1">
              <p>AUTOSAVED TO FIRESTORE • CLOUD ACTIVE</p>
              <p className="text-[#121212] font-mono">
                USER: {user.uid.substring(0, 12)}...
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
