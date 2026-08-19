import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Loader2, Mic, MoreHorizontal, Sparkles, Volume2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const CHARACTER_IMAGE = "/manus-storage/character-persona_6467bdc8.jpg";

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
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [hasEntered, setHasEntered] = useState(() => {
    try {
      return window.localStorage.getItem("muse-intro-seen") === "1";
    } catch {
      return false;
    }
  });
  const [failedMessages, setFailedMessages] = useState<ChatMessage[] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: ({ content }) => {
      setFailedMessages(null);
      setMessages((current) => [...current, { role: "assistant", content }]);
    },
    onError: (_error, variables) => {
      setFailedMessages(variables.messages);
      toast.error("I couldn’t reach the conversation just now. Please try again.");
    },
  });

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

  const recentMessages = useMemo(() => messages.slice(-4), [messages]);

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

  return (
    <main className="assistant-shell min-h-screen overflow-hidden bg-[#f4f0ea] text-[#1f2430]">
      <div className="grain" aria-hidden="true" />
      <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <button className="brand-mark" aria-label="Character Assistant home">
          <span className="brand-dot" />
          <span className="brand-name">muse</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="header-pill hidden sm:inline-flex" onClick={() => toast("Your private conversation space")}>Private space</button>
          <button className="icon-button" aria-label="More options" onClick={() => toast("More moments are coming soon")}> <MoreHorizontal size={18} /> </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-86px)] max-w-[1500px] grid-cols-1 items-center gap-4 px-5 pb-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(370px,0.76fr)] lg:gap-12 lg:px-12 lg:pb-12">
        <div className={cn("character-stage", hasEntered && "is-visible")}>
          <div className="ambient-orb orb-one" />
          <div className="ambient-orb orb-two" />
          <div className="character-caption">
            <span className="caption-line" />
            <span>your companion for curious moments</span>
          </div>
          <div className="character-frame">
            <div className="frame-glow" />
            <img src={CHARACTER_IMAGE} alt="Your character assistant" className="character-image" />
          </div>
          <div className="character-shadow" />
          <div className="status-chip"><span className="status-pulse" /> online now</div>
        </div>

        <div className={cn("conversation-panel", hasEntered && "is-visible")}>
          <div className="eyebrow"><Sparkles size={13} /> A little space for you</div>
          <h1>Let’s make<br /><em>something</em> of this moment.</h1>
          <p className="intro-copy">A quiet, intelligent presence to think with, wonder with, and talk to whenever you need it.</p>

          <div className="conversation-card">
            <div className="bubble-stack" aria-live="polite">
              {recentMessages.map((message, index) => (
                <div key={`${message.role}-${index}-${message.content.slice(0, 12)}`} className={cn("message-row", message.role === "user" ? "user-row" : "assistant-row")}>
                  {message.role === "assistant" && <div className="mini-avatar"><img src={CHARACTER_IMAGE} alt="" /></div>}
                  <div className={cn("speech-bubble", message.role === "user" ? "user-bubble" : "assistant-bubble")}>
                    {message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="message-row assistant-row"><div className="mini-avatar"><img src={CHARACTER_IMAGE} alt="" /></div><div className="speech-bubble assistant-bubble typing"><span /><span /><span /></div></div>
              )}
              {failedMessages && !chatMutation.isPending && (
                <div className="retry-row"><span>Something interrupted our moment.</span><button type="button" onClick={() => { setFailedMessages(null); chatMutation.mutate({ messages: failedMessages }); }}>Try again</button></div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="prompt-row">
              {suggestedPrompts.map((prompt) => <button key={prompt} className="prompt-chip" onClick={() => sendMessage(prompt)} disabled={chatMutation.isPending}>{prompt}</button>)}
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say anything…" aria-label="Message your character assistant" disabled={chatMutation.isPending} />
              <div className="composer-actions">
                <button type="button" className={cn("composer-icon", isListening && "active")} onClick={() => { setIsListening((value) => !value); toast(isListening ? "Voice input paused" : "Voice input is ready when you are"); }} aria-label="Toggle voice input"><Mic size={17} /></button>
                <button type="submit" className="send-button" disabled={!input.trim() || chatMutation.isPending} aria-label="Send message">{chatMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}</button>
              </div>
            </form>
          </div>

          <div className="panel-footer"><span><Volume2 size={14} /> Gentle by design</span><span>Press enter to send</span></div>
        </div>
      </section>
      <button className="scroll-cue" onClick={() => inputRef.current?.focus()} aria-label="Start a conversation"><span>start a conversation</span><ChevronDown size={15} /></button>
    </main>
  );
}
