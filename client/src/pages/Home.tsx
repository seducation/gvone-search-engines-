import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Download, Loader2, Menu, MessageSquarePlus, Mic, MoreHorizontal, Search, Settings, Sparkles, Trash2, Volume2, VolumeX, Waves, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getVoiceAvailability, voiceErrorToAvailability, type VoiceAvailability } from "@/lib/voice";
import { getGestureMode } from "@/lib/gesture";
import { motionSupported, normalizeMotion } from "@/lib/motion";
import { getConversationTitle, upsertConversation } from "@/lib/chatHistory";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SavedConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const HISTORY_KEY = "gvone-chat-history-v1";
const ACTIVE_SESSION_KEY = "gvone-active-session-v1";
const AUTO_SPEAK_KEY = "gvone-auto-speak-v1";
const SHOW_HINTS_KEY = "gvone-show-hints-v1";
const AMBIENT_MOTION_KEY = "gvone-ambient-motion-v1";

const safeId = () => `gvone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const readSavedConversations = (): SavedConversation[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as SavedConversation[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && Array.isArray(item.messages)) : [];
  } catch {
    return [];
  }
};

const CHARACTER_IMAGE = "/manus-storage/character-persona_6467bdc8.jpg";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Hello. I’ve been waiting for you. What would you like to explore today?",
  },
];

const suggestedPrompts = [
  "Help me find a little inspiration",
  "Tell me something unexpected",
  "I need a calm moment",
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (!preview) {
      try {
        const activeId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
        const active = readSavedConversations().find((conversation) => conversation.id === activeId);
        if (active?.messages?.length) return active.messages;
      } catch {
        // Continue with the starter conversation when storage is unavailable.
      }
    }
    const levelMatch = preview?.match(/^level-(\d)$/);
    const previewLevel = levelMatch ? Math.min(Math.max(Number(levelMatch[1]), 0), 4) : preview === "expanded" ? 2 : 0;
    if (previewLevel === 0) return starterMessages;
    const seeded: ChatMessage[] = [...starterMessages];
    const seedPairs = [
      ["Tell me something unexpected.", "A small moment can become a doorway when you give it your full attention."],
      ["Help me find a little inspiration.", "Start with one honest question, then let the next idea arrive without rushing it."],
      ["I need a calm moment.", "Let the noise soften. You do not have to solve everything in the next minute."],
      ["What should we explore next?", "Follow the thread that feels quietly alive. That is usually where the interesting part begins."],
    ];
    for (let index = 0; index < previewLevel; index += 1) {
      const pair = seedPairs[index];
      if (!pair) continue;
      seeded.push({ role: "user", content: pair[0] }, { role: "assistant", content: pair[1] });
    }
    return seeded;
  });
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<SavedConversation[]>(readSavedConversations);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    try { return window.localStorage.getItem(ACTIVE_SESSION_KEY) ?? safeId(); } catch { return safeId(); }
  });
  const [historyOpen, setHistoryOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "history");
  const [menuOpen, setMenuOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "menu");
  const [settingsOpen, setSettingsOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "settings");
  const [historySearch, setHistorySearch] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try { return window.localStorage.getItem(AUTO_SPEAK_KEY) !== "0"; } catch { return true; }
  });
  const [showHints, setShowHints] = useState(() => {
    try { return window.localStorage.getItem(SHOW_HINTS_KEY) !== "0"; } catch { return true; }
  });
  const [ambientMotion, setAmbientMotion] = useState(() => {
    try { return window.localStorage.getItem(AMBIENT_MOTION_KEY) !== "0"; } catch { return true; }
  });
  const [hasEntered, setHasEntered] = useState(() => {
    try {
      return window.localStorage.getItem("muse-intro-seen") === "1";
    } catch {
      return false;
    }
  });
  const [failedMessages, setFailedMessages] = useState<ChatMessage[] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [voiceAvailability, setVoiceAvailability] = useState<VoiceAvailability>("ready");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const [motionInput, setMotionInput] = useState({ x: 0, y: 0 });
  const [motionPermission, setMotionPermission] = useState<"idle" | "enabled" | "denied" | "unsupported">("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const unlockAudio = () => {
    if (audioUnlocked) return;
    try {
      window.speechSynthesis?.cancel();
      const silent = new SpeechSynthesisUtterance("");
      silent.volume = 0;
      window.speechSynthesis?.speak(silent);
      window.speechSynthesis?.cancel();
      setAudioUnlocked(true);
    } catch {
      setAudioUnlocked(false);
    }
  };

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    unlockAudio();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.volume = 1;
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setLastSpokenText(text.trim());
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 40);
  };

  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: ({ content }) => {
      setFailedMessages(null);
      setMessages((current) => [...current, { role: "assistant", content }]);
      if (autoSpeak) speakText(content);
    },
    onError: (_error, variables) => {
      setFailedMessages(variables.messages);
      toast.error("I couldn’t reach the conversation just now. Please try again.");
    },
  });

  useEffect(() => {
    const Recognition = (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    setVoiceAvailability(getVoiceAvailability(Boolean(Recognition), "speechSynthesis" in window));
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (hasEntered) return;
    const timer = window.setTimeout(() => {
      setHasEntered(true);
      try {
        window.localStorage.setItem("muse-intro-seen", "1");
      } catch {
        // Session storage may be unavailable in privacy-restricted browsers.
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [hasEntered]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, chatMutation.isPending]);

  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const chatLevel = Math.min(userMessageCount, 4);
  const isChatExpanded = userMessageCount > 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(conversations));
      window.localStorage.setItem(AUTO_SPEAK_KEY, autoSpeak ? "1" : "0");
      window.localStorage.setItem(SHOW_HINTS_KEY, showHints ? "1" : "0");
      window.localStorage.setItem(AMBIENT_MOTION_KEY, ambientMotion ? "1" : "0");
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }, [activeSessionId, ambientMotion, autoSpeak, conversations, showHints]);

  useEffect(() => {
    if (!messages.some((message) => message.role === "user")) return;
    const title = getConversationTitle(messages);
    setConversations((current) => upsertConversation(current, { id: activeSessionId, title, messages, updatedAt: Date.now() }));
  }, [activeSessionId, messages]);

  const startNewChat = () => {
    const nextId = safeId();
    setActiveSessionId(nextId);
    setMessages(starterMessages);
    setInput("");
    setFailedMessages(null);
    setMenuOpen(false);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openConversation = (conversation: SavedConversation) => {
    setActiveSessionId(conversation.id);
    setMessages(conversation.messages);
    setInput("");
    setFailedMessages(null);
    setHistoryOpen(false);
  };

  const deleteConversation = (id: string) => {
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (id === activeSessionId) startNewChat();
    toast.success("Conversation removed");
  };

  const clearCurrentChat = () => {
    setMessages(starterMessages);
    setFailedMessages(null);
    setMenuOpen(false);
    toast.success("Current conversation cleared");
  };

  const exportCurrentChat = () => {
    const transcript = messages.map((message) => `${message.role === "user" ? "You" : "gvone"}: ${message.content}`).join("\\n\\n");
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gvone-conversation.txt";
    link.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    toast.success("Conversation exported");
  };

  const sendMessage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || chatMutation.isPending) return;
    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setFailedMessages(null);
    setInput("");
    chatMutation.mutate({ messages: nextMessages });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  const requestMotionAccess = async () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMotionPermission("unsupported");
      return;
    }
    if (!motionSupported()) {
      setMotionPermission("unsupported");
      return;
    }
    if (motionPermission === "enabled") return;
    try {
      const motionApi = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
      if (motionApi.requestPermission) {
        const result = await motionApi.requestPermission();
        if (result !== "granted") {
          setMotionPermission("denied");
          return;
        }
      }
      const handleMotion = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity;
        const next = normalizeMotion(acceleration?.x ?? 0, -(acceleration?.y ?? 0));
        setMotionInput(next);
      };
      window.addEventListener("devicemotion", handleMotion, { passive: true });
      setMotionPermission("enabled");
    } catch {
      setMotionPermission("denied");
    }
  };

  const handleCharacterPointerDown = () => {
    unlockAudio();
    void requestMotionAccess();
    setIsTouched(true);
  };

  const handleCharacterPointerUp = () => setIsTouched(false);

  const startListening = () => {
    unlockAudio();
    if (voiceAvailability === "unsupported") {
      toast.error("Voice input needs a browser with microphone speech support.");
      return;
    }
    if (voiceAvailability === "permission-denied") {
      toast.error("Microphone access is blocked. Allow it in your browser settings, then try again.");
      return;
    }
    if (isListening || chatMutation.isPending) return;
    const Recognition = (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    if (!Recognition) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ");
      setIsListening(false);
      recognitionRef.current = null;
      sendMessage(transcript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      const nextAvailability = voiceErrorToAvailability((event as unknown as { error?: string }).error ?? "");
      setVoiceAvailability(nextAvailability);
      toast.error(nextAvailability === "permission-denied" ? "Microphone access is blocked. Allow it, then try again." : "I didn’t catch that. Hold the circle and try again.");
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <main className={cn("assistant-shell min-h-screen overflow-hidden bg-[#f4f0ea] text-[#1f2430]", !ambientMotion && "ambient-muted")}>
      <div className="grain" aria-hidden="true" />
      <header className="relative z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="shell-header-group">
          <button className="shell-icon-button" type="button" onClick={() => { setHistoryOpen(true); setMenuOpen(false); }} aria-label="Open chat history">
            <Menu size={19} />
          </button>
          <button className="brand-mark" type="button" onClick={startNewChat} aria-label="Start a new gvone chat">
            <span className="brand-dot" />
            <span className="brand-name">gvone</span>
          </button>
        </div>
        <div className="shell-header-group">
          <span className="header-note hidden sm:inline-flex">a small presence</span>
          <div className="shell-menu-wrap">
            <button className="shell-icon-button" type="button" onClick={() => { setMenuOpen((value) => !value); setHistoryOpen(false); }} aria-label="Open chat options" aria-expanded={menuOpen}>
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && <div className="shell-menu" role="menu">
              <button type="button" onClick={startNewChat}><MessageSquarePlus size={15} /> New chat</button>
              <button type="button" onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}><Settings size={15} /> Settings</button>
              <button type="button" onClick={exportCurrentChat}><Download size={15} /> Export chat</button>
              <button type="button" onClick={clearCurrentChat}><Trash2 size={15} /> Clear chat</button>
            </div>}
          </div>
        </div>
      </header>

      {historyOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" />
        <aside className="history-drawer" aria-label="Saved conversations">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone archive</span><h2>Chat history</h2></div><button className="drawer-close" type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history"><X size={18} /></button></div>
          <button className="new-chat-button" type="button" onClick={startNewChat}><MessageSquarePlus size={16} /> New conversation</button>
          <label className="history-search"><Search size={15} /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
          <div className="history-list">
            {conversations.filter((conversation) => conversation.title.toLowerCase().includes(historySearch.toLowerCase())).map((conversation) => <div className={cn("history-item", conversation.id === activeSessionId && "is-active")} key={conversation.id}>
              <button type="button" className="history-item-main" onClick={() => openConversation(conversation)}><span className="history-item-title">{conversation.title}</span><small>{new Date(conversation.updatedAt).toLocaleDateString()}</small></button>
              <button type="button" className="history-delete" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2 size={14} /></button>
            </div>)}
            {conversations.length === 0 && <div className="history-empty"><MessageSquarePlus size={21} /><p>Your conversations will appear here.</p><small>Start a chat with gvone to save it.</small></div>}
          </div>
        </aside>
      </>}

      {settingsOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings" />
        <aside className="settings-drawer" aria-label="gvone settings">
          <div className="drawer-heading"><div><span className="drawer-kicker">personalize gvone</span><h2>Settings</h2></div><button className="drawer-close" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div>
          <div className="settings-section"><span className="settings-label">Voice & response</span><button className="setting-row" type="button" onClick={() => setAutoSpeak((value) => !value)}><span><span className="setting-icon">{autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}</span><strong>Speak responses aloud</strong><small>Use browser voice after gvone replies</small></span><span className={cn("toggle", autoSpeak && "is-on")}><i /></span></button></div>
          <div className="settings-section"><span className="settings-label">Interface</span><button className="setting-row" type="button" onClick={() => setShowHints((value) => !value)}><span><span className="setting-icon"><Sparkles size={16} /></span><strong>Show conversation hints</strong><small>Keep starter prompts near the composer</small></span><span className={cn("toggle", showHints && "is-on")}><i /></span></button><button className="setting-row" type="button" onClick={() => setAmbientMotion((value) => !value)}><span><span className="setting-icon"><Sparkles size={16} /></span><strong>Ambient motion</strong><small>Control the background drift and idle atmosphere</small></span><span className={cn("toggle", ambientMotion && "is-on")}><i /></span></button></div>
          <div className="settings-note">Your preferences and saved conversations stay in this browser. Nothing here requires an account.</div>
        </aside>
      </>}

      <section className={cn("relative z-10 mx-auto grid min-h-[calc(100vh-86px)] max-w-[1500px] grid-cols-1 items-center gap-4 px-5 pb-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(370px,0.76fr)] lg:gap-12 lg:px-12 lg:pb-12", `chat-level-${chatLevel}`)}>
        <div className={cn("character-stage", hasEntered && "is-visible", isChatExpanded && "chat-character-compressed")}>
          <div className="ambient-orb orb-one" />
          <div className="ambient-orb orb-two" />
          <div className="character-caption">
            <span className="caption-line" />
            <span>gvone · your curious companion</span>
          </div>
          <div className={cn("character-orbit", `gesture-${getGestureMode(isTouched, isListening, isSpeaking)}`)}>
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className={cn("character-frame", isTouched && "is-touched")} onPointerDown={handleCharacterPointerDown} onPointerUp={handleCharacterPointerUp} onPointerLeave={handleCharacterPointerUp}>
              <div className="frame-glow" />
              <div className={cn("idle-expression", !isTouched && !isListening && !isSpeaking && "is-idle")} aria-hidden="true" />
              <div className="touch-ripple ripple-one" />
              <div className="touch-ripple ripple-two" />
              <img src={CHARACTER_IMAGE} alt="gvone, your character assistant" className={cn("character-image", Math.hypot(motionInput.x, motionInput.y) > 0.16 && "motion-active")} />
            </div>
            <button className="voice-orbit-button" type="button" onPointerDown={startListening} onPointerUp={stopListening} onPointerLeave={stopListening} onKeyDown={(event) => { if (event.key === " ") startListening(); }} onKeyUp={(event) => { if (event.key === " ") stopListening(); }} aria-label={isListening ? "Release to send your voice message" : "Press and hold to talk to gvone"} disabled={chatMutation.isPending}>
              {isListening ? <Waves size={18} /> : <Mic size={18} />}
            </button>
            {isListening && <span className="voice-hint">listening… release to send</span>}
            {!isListening && !isSpeaking && voiceAvailability === "ready" && audioUnlocked && <span className="voice-hint idle-hint">hold to talk</span>}
            {voiceAvailability === "unsupported" && <span className="voice-hint warning-hint">voice unavailable</span>}
            {voiceAvailability === "permission-denied" && <span className="voice-hint warning-hint">allow microphone</span>}
            {isSpeaking && <span className="voice-hint">gvone is speaking</span>}
            {!audioUnlocked && voiceAvailability === "ready" && <span className="voice-hint audio-hint">tap gvone to wake voice</span>}
            {motionPermission === "enabled" && <span className="motion-hint">shake to float</span>}
            {motionPermission === "denied" && <span className="motion-hint warning-hint">motion access off</span>}
          </div>
          <div className="character-shadow" />
          <div className="status-chip"><span className="status-pulse" /> online now</div>
        </div>

        <div className={cn("conversation-panel", hasEntered && "is-visible", isChatExpanded && "chat-panel-expanded")}>
          <div className={cn("gvone-chat-header", isChatExpanded && "is-visible")}>
            <img src={CHARACTER_IMAGE} alt="" aria-hidden="true" />
            <span><strong>gvone</strong><small>your curious companion</small></span>
            <i className="gvone-header-status" aria-hidden="true" />
          </div>
          <div className={cn("hero-copy", isChatExpanded && "is-collapsed")}>
            <div className="eyebrow"><Sparkles size={13} /> Meet gvone</div>
            <h1>Let’s make<br /><em>something</em> of this moment.</h1>
            <p className="intro-copy">A quiet, intelligent presence to think with, wonder with, and talk to whenever you need it. Hold the circle to speak.</p>
          </div>

          <div className="conversation-card">
            <div className="bubble-stack" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}-${message.content.slice(0, 12)}`} className={cn("message-row", message.role === "user" ? "user-row" : "assistant-row")}>
                  {message.role === "assistant" && <div className="mini-avatar"><span className="mini-avatar-dot" aria-hidden="true" /></div>}
                  <div className={cn("speech-bubble", message.role === "user" ? "user-bubble" : "assistant-bubble")}>
                    {message.role === "assistant" ? <><Streamdown>{message.content}</Streamdown><button type="button" className="replay-button" onClick={() => speakText(message.content)} aria-label="Replay gvone response"><Volume2 size={12} /> replay</button></> : <p>{message.content}</p>}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="message-row assistant-row"><div className="mini-avatar"><span className="mini-avatar-dot" aria-hidden="true" /></div><div className="speech-bubble assistant-bubble typing"><span /><span /><span /></div></div>
              )}
              {failedMessages && !chatMutation.isPending && (
                <div className="retry-row"><span>Something interrupted our moment.</span><button type="button" onClick={() => { setFailedMessages(null); chatMutation.mutate({ messages: failedMessages }); }}>Try again</button></div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showHints && <div className="prompt-row">
              {suggestedPrompts.map((prompt) => <button key={prompt} className="prompt-chip" onClick={() => sendMessage(prompt)} disabled={chatMutation.isPending}>{prompt}</button>)}
            </div>}

            <form className="composer" onSubmit={handleSubmit}>
              <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say anything…" aria-label="Message your character assistant" disabled={chatMutation.isPending} />
              <div className="composer-actions">
                <button type="button" className={cn("composer-icon", isListening && "active")} onClick={() => { setIsListening((value) => !value); toast(isListening ? "Voice input paused" : "Voice input is ready when you are"); }} aria-label="Toggle voice input"><Mic size={17} /></button>
                <button type="submit" className="send-button" disabled={!input.trim() || chatMutation.isPending} aria-label="Send message">{chatMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}</button>
              </div>
            </form>
          </div>

        </div>
      </section>
      <button className="scroll-cue" onClick={() => inputRef.current?.focus()} aria-label="Start a conversation"><span>start a conversation</span><ChevronDown size={15} /></button>
    </main>
  );
}
