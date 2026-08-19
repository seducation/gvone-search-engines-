import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, ChevronDown, Copy, Download, ExternalLink, FilePlus2, FileText, FolderKanban, Globe2, ImagePlus, Loader2, Menu, MessageSquarePlus, Mic, MoreHorizontal, Network, Plus, ScanSearch, Search, Settings, Share2, Sparkles, ThumbsDown, ThumbsUp, Trash2, Volume2, VolumeX, Waves, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getVoiceAvailability, voiceErrorToAvailability, type VoiceAvailability } from "@/lib/voice";
import { getGestureMode } from "@/lib/gesture";
import { motionSupported, normalizeMotion } from "@/lib/motion";
import { buildFedMemoryContext, buildMemoryContext, buildProjectContext, getConversationTitle, getVisibleFedMemories, upsertConversation, type ChatHistorySourceSet, type ChatHistoryVisualSet, type FedMemory } from "@/lib/chatHistory";
import { getTaskProgressPercent, TASK_PROGRESS_STAGES } from "@/lib/taskProgress";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  image?: { key: string; url: string; name: string };
};

type WebResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string;
};

type SavedConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  projectId?: string;
  sourceSets?: Record<number, ChatHistorySourceSet>;
  visualSets?: Record<number, ChatHistoryVisualSet>;
  updatedAt: number;
};

type ProjectFile = {
  key: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
};

type WorkspaceProject = {
  id: string;
  name: string;
  instructions: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
};

const HISTORY_KEY = "gvone-chat-history-v1";
const ACTIVE_SESSION_KEY = "gvone-active-session-v1";
const AUTO_SPEAK_KEY = "gvone-auto-speak-v1";
const SHOW_HINTS_KEY = "gvone-show-hints-v1";
const AMBIENT_MOTION_KEY = "gvone-ambient-motion-v1";
const MEMORY_ENABLED_KEY = "gvone-memory-enabled-v1";
const FEED_MEMORY_KEY = "gvone-fed-memory-v1";
const MAX_FED_MEMORIES = 4;
const PROJECTS_KEY = "gvone-projects-v1";
const ACTIVE_PROJECT_KEY = "gvone-active-project-v1";

const safeId = () => `gvone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const readSavedConversations = (): SavedConversation[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as SavedConversation[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && Array.isArray(item.messages)) : [];
  } catch {
    return [];
  }
};

const readFedMemories = (): FedMemory[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEED_MEMORY_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is FedMemory => Boolean(item && typeof item === "object" && typeof (item as FedMemory).id === "string" && typeof (item as FedMemory).content === "string"))
      .map((item) => ({ id: item.id, content: item.content.slice(0, 1800), enabled: item.enabled !== false, scope: (item.scope === "chat" ? "chat" : "global") as FedMemory["scope"], chatId: typeof item.chatId === "string" ? item.chatId : undefined, updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now() }))
      .slice(0, MAX_FED_MEMORIES);
  } catch {
    return [];
  }
};

const readProjects = (): WorkspaceProject[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is WorkspaceProject => Boolean(item && typeof item === "object" && typeof (item as WorkspaceProject).id === "string" && typeof (item as WorkspaceProject).name === "string"))
      .map((item) => ({ id: item.id, name: item.name.slice(0, 70), instructions: typeof item.instructions === "string" ? item.instructions.slice(0, 1800) : "", files: Array.isArray(item.files) ? item.files.filter((file): file is ProjectFile => Boolean(file && typeof file.name === "string" && typeof file.key === "string" && typeof file.url === "string")).slice(0, 12) : [], createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(), updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now() }))
      .slice(0, 12);
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
  const progressPreview = new URLSearchParams(window.location.search).get("preview");
  const isProgressPreview = progressPreview === "progress" || progressPreview === "progress-compact";
  const isProgressPreviewExpanded = progressPreview === "progress";
  const isFeedMemoryPreview = progressPreview === "feed-memory" || progressPreview === "feed-memory-chat";
  const feedMemoryPreviewScope: FedMemory["scope"] = progressPreview === "feed-memory-chat" ? "chat" : "global";
  const isProjectEntryPreview = progressPreview === "project-view";
  const isProjectsPreview = progressPreview === "projects" || isProjectEntryPreview;
  const isWorkspacePreview = isProjectsPreview || progressPreview === "history" || progressPreview === "history-project";
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
  const [responseSources, setResponseSources] = useState<Record<number, ChatHistorySourceSet>>(() => {
    if (new URLSearchParams(window.location.search).get("preview")) return {};
    try {
      const activeId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
      return readSavedConversations().find((conversation) => conversation.id === activeId)?.sourceSets ?? {};
    } catch {
      return {};
    }
  });
  const [visualSets, setVisualSets] = useState<Record<number, ChatHistoryVisualSet>>(() => {
    if (new URLSearchParams(window.location.search).get("preview")) return {};
    try {
      const activeId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
      return readSavedConversations().find((conversation) => conversation.id === activeId)?.visualSets ?? {};
    } catch { return {}; }
  });
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState<number | null>(null);
  const [visualDrawerOpen, setVisualDrawerOpen] = useState(false);
  const [activeVisualIndex, setActiveVisualIndex] = useState<number | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ key: string; url: string; name: string } | null>(null);
  const [visualDiscoveryMode, setVisualDiscoveryMode] = useState(false);
  const [conversations, setConversations] = useState<SavedConversation[]>(() => isWorkspacePreview ? [{ id: "preview-personal", title: "Literature review outline", messages: [{ role: "user", content: "Help structure the literature review." }, { role: "assistant", content: "Start with the research question and themes." }], updatedAt: 0 }, { id: "preview-project-chat", title: "Source evaluation", projectId: "preview-project", messages: [{ role: "user", content: "Which sources should lead the project?" }, { role: "assistant", content: "Prioritize original evidence and clear attribution." }], updatedAt: 1 }] : readSavedConversations());
  const [activeSessionId, setActiveSessionId] = useState(() => {
    if (progressPreview === "feed-memory-chat") return "preview-chat";
    try { return window.localStorage.getItem(ACTIVE_SESSION_KEY) ?? safeId(); } catch { return safeId(); }
  });
  const [projects, setProjects] = useState<WorkspaceProject[]>(() => isWorkspacePreview ? [{ id: "preview-project", name: "Research Studio", instructions: "Use a clear, research-led tone. Identify assumptions and keep recommendations practical.", files: [{ key: "preview-brief", url: "#", name: "project-brief.pdf", mimeType: "application/pdf", size: 248000, uploadedAt: 0 }, { key: "preview-notes", url: "#", name: "source-notes.md", mimeType: "text/markdown", size: 12000, uploadedAt: 0 }], createdAt: 0, updatedAt: 0 }] : readProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (isProjectsPreview) return "preview-project";
    try { return window.localStorage.getItem(ACTIVE_PROJECT_KEY) || null; } catch { return null; }
  });
  const [projectsOpen, setProjectsOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "projects");
  const [projectViewOpen, setProjectViewOpen] = useState(isProjectEntryPreview);
  const [newProjectName, setNewProjectName] = useState("");
  const [assignProjectChatId, setAssignProjectChatId] = useState<string | null>(() => progressPreview === "history-project" ? "preview-personal" : null);
  const [historyOpen, setHistoryOpen] = useState(() => ["history", "history-project"].includes(new URLSearchParams(window.location.search).get("preview") ?? ""));
  const [menuOpen, setMenuOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "menu");
  const [settingsOpen, setSettingsOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "settings");
  const [memoryOpen, setMemoryOpen] = useState(() => new URLSearchParams(window.location.search).get("preview") === "memory");
  const [feedMemoryOpen, setFeedMemoryOpen] = useState(isFeedMemoryPreview);
  const [fedMemories, setFedMemories] = useState<FedMemory[]>(() => isFeedMemoryPreview ? [{ id: "preview-memory", content: "Keep this response warm, practical, and focused on the current creative project.", enabled: true, scope: feedMemoryPreviewScope, chatId: feedMemoryPreviewScope === "chat" ? "preview-chat" : undefined, updatedAt: 0 }] : readFedMemories());
  const [feedMemoryDraft, setFeedMemoryDraft] = useState("");
  const [editingFeedMemoryId, setEditingFeedMemoryId] = useState<string | null>(null);
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
  const [memoryEnabled, setMemoryEnabled] = useState(() => {
    try { return window.localStorage.getItem(MEMORY_ENABLED_KEY) !== "0"; } catch { return true; }
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
  const [taskStageIndex, setTaskStageIndex] = useState(0);
  const [taskProgressOpen, setTaskProgressOpen] = useState(isProgressPreviewExpanded);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

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

  const webRetryMutation = trpc.assistant.webResults.useMutation();
  const imageUploadMutation = trpc.assistant.uploadImage.useMutation();
  const projectFileUploadMutation = trpc.assistant.uploadProjectFile.useMutation();
  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: ({ content, results, webError, visualResults, visualQuery, visualError }, variables) => {
      setFailedMessages(null);
      const assistantIndex = variables.messages.length;
      const query = variables.messages.at(-1)?.content ?? "";
      if (results.length || webError) setResponseSources((current) => ({ ...current, [assistantIndex]: { query, results: results ?? [], error: webError ?? undefined } }));
      if (visualResults.length || visualError) setVisualSets((current) => ({ ...current, [assistantIndex]: { query: visualQuery ?? query, results: visualResults, error: visualError ?? undefined } }));
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

  useEffect(() => {
    if (!chatMutation.isPending) {
      setTaskStageIndex(isProgressPreview ? 2 : 0);
      setTaskProgressOpen(isProgressPreviewExpanded);
      return;
    }
    setTaskStageIndex(0);
    setTaskProgressOpen(false);
    const timer = window.setInterval(() => {
      setTaskStageIndex((current) => Math.min(current + 1, TASK_PROGRESS_STAGES.length - 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, [chatMutation.isPending, isProgressPreview, isProgressPreviewExpanded]);

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
      window.localStorage.setItem(MEMORY_ENABLED_KEY, memoryEnabled ? "1" : "0");
      if (!isFeedMemoryPreview) window.localStorage.setItem(FEED_MEMORY_KEY, JSON.stringify(fedMemories));
      if (!isWorkspacePreview) {
        window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
        if (activeProjectId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId); else window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }, [activeProjectId, activeSessionId, ambientMotion, autoSpeak, conversations, fedMemories, isFeedMemoryPreview, isWorkspacePreview, memoryEnabled, projects, showHints]);

  useEffect(() => {
    if (!messages.some((message) => message.role === "user")) return;
    const title = getConversationTitle(messages);
    setConversations((current) => upsertConversation(current, { id: activeSessionId, title, messages, projectId: activeProjectId ?? undefined, sourceSets: responseSources, visualSets, updatedAt: Date.now() }));
  }, [activeProjectId, activeSessionId, messages, responseSources, visualSets]);

  const startNewChat = () => {
    const nextId = safeId();
    setActiveSessionId(nextId);
    setMessages(starterMessages);
    setResponseSources({});
    setVisualSets({});
    setActiveSourceIndex(null);
    setSourceDrawerOpen(false);
    setActiveVisualIndex(null);
    setVisualDrawerOpen(false);
    setAttachedImage(null);
    setInput("");
    setFailedMessages(null);
    setMenuOpen(false);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openConversation = (conversation: SavedConversation) => {
    setActiveSessionId(conversation.id);
    setActiveProjectId(conversation.projectId ?? null);
    setMessages(conversation.messages);
    setResponseSources(conversation.sourceSets ?? {});
    setVisualSets(conversation.visualSets ?? {});
    setActiveSourceIndex(null);
    setSourceDrawerOpen(false);
    setActiveVisualIndex(null);
    setVisualDrawerOpen(false);
    setAttachedImage(null);
    setInput("");
    setFailedMessages(null);
    setHistoryOpen(false);
    setProjectViewOpen(false);
  };

  const createProject = () => {
    const name = newProjectName.trim();
    if (!name) { toast.error("Give the project a name first."); return; }
    if (projects.length >= 12) { toast.error("Keep up to twelve projects. Remove one to create another."); return; }
    const now = Date.now();
    const project: WorkspaceProject = { id: safeId(), name: name.slice(0, 70), instructions: "", files: [], createdAt: now, updatedAt: now };
    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setNewProjectName("");
    setProjectsOpen(false);
    setProjectViewOpen(true);
    toast.success(`${project.name} is ready for your work.`);
  };

  const enterProjectView = (projectId: string) => {
    setActiveProjectId(projectId);
    setProjectsOpen(false);
    setHistoryOpen(false);
    setProjectViewOpen(true);
  };

  const startProjectChat = () => {
    startNewChat();
    setProjectViewOpen(false);
  };

  const selectProject = (projectId: string | null) => {
    setActiveProjectId(projectId);
    const latest = projectId ? conversations.filter((conversation) => conversation.projectId === projectId).sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined;
    if (latest) openConversation(latest); else startNewChat();
    setProjectsOpen(false);
  };

  const updateProject = (projectId: string, update: Partial<WorkspaceProject>) => {
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, ...update, updatedAt: Date.now() } : project));
  };

  const deleteProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    setProjects((current) => current.filter((item) => item.id !== projectId));
    setConversations((current) => current.map((conversation) => conversation.projectId === projectId ? { ...conversation, projectId: undefined } : conversation));
    if (activeProjectId === projectId) { setActiveProjectId(null); setProjectViewOpen(false); startNewChat(); }
    toast.success(`${project?.name ?? "Project"} moved its chats back to Personal.`);
  };

  const assignChatToProject = (chatId: string, projectId: string | null) => {
    const project = projectId ? projects.find((item) => item.id === projectId) : undefined;
    setConversations((current) => current.map((conversation) => conversation.id === chatId ? { ...conversation, projectId: projectId ?? undefined, updatedAt: Date.now() } : conversation));
    if (chatId === activeSessionId) setActiveProjectId(projectId);
    setAssignProjectChatId(null);
    toast.success(project ? `Chat added to ${project.name}.` : "Chat moved to Personal chats.");
  };

  const deleteConversation = (id: string) => {
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (id === activeSessionId) startNewChat();
    toast.success("Conversation removed");
  };

  const retryWebResults = (messageIndex: number) => {
    const sourceSet = responseSources[messageIndex];
    if (!sourceSet?.query) return;
    webRetryMutation.mutate({ query: sourceSet.query }, {
      onSuccess: ({ results }) => setResponseSources((current) => ({ ...current, [messageIndex]: { ...sourceSet, results, error: undefined } })),
      onError: () => setResponseSources((current) => ({ ...current, [messageIndex]: { ...sourceSet, error: "Website sources are temporarily unavailable." } })),
    });
  };

  const clearCurrentChat = () => {
    setMessages(starterMessages);
    setResponseSources({});
    setVisualSets({});
    setActiveSourceIndex(null);
    setSourceDrawerOpen(false);
    setActiveVisualIndex(null);
    setVisualDrawerOpen(false);
    setAttachedImage(null);
    setFailedMessages(null);
    setMenuOpen(false);
    toast.success("Current conversation cleared");
  };

  const saveFedMemory = () => {
    const content = feedMemoryDraft.trim();
    if (!content) { toast.error("Paste a note before saving it to memory."); return; }
    if (editingFeedMemoryId) {
      setFedMemories((current) => current.map((item) => item.id === editingFeedMemoryId ? { ...item, content, enabled: true, updatedAt: Date.now() } : item));
      toast.success("Memory updated");
    } else {
      if (fedMemories.length >= MAX_FED_MEMORIES) { toast.error("Keep up to four memory notes. Remove one to add another."); return; }
      setFedMemories((current) => [{ id: safeId(), content, enabled: true, scope: "global", updatedAt: Date.now() }, ...current]);
      toast.success("Memory added to gvone’s context");
    }
    setFeedMemoryDraft("");
    setEditingFeedMemoryId(null);
  };

  const editFedMemory = (item: FedMemory) => {
    setEditingFeedMemoryId(item.id);
    setFeedMemoryDraft(item.content);
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

  const uploadImage = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > 5_000_000) { toast.error("Choose an image smaller than 5 MB."); return; }
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Unable to read this image."));
        reader.readAsDataURL(file);
      });
      imageUploadMutation.mutate({ name: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64 }, {
        onSuccess: (image) => { setAttachedImage(image); toast.success("Image attached — ask gvone to identify it."); },
        onError: (error) => toast.error(error.message || "Image upload failed. Please try again."),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read this image.");
    }
  };

  const uploadProjectFile = async (file: File) => {
    if (!activeProjectId) { toast.error("Choose a project before adding files."); return; }
    if (file.size > 5_000_000) { toast.error("Choose a file smaller than 5 MB."); return; }
    const supportedTypes = ["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!supportedTypes.includes(file.type) && !file.type.startsWith("image/")) { toast.error("Choose a PDF, text, spreadsheet, document, or image file."); return; }
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Unable to read this file."));
        reader.readAsDataURL(file);
      });
      projectFileUploadMutation.mutate({ projectId: activeProjectId, name: file.name, mimeType: file.type || "application/octet-stream", base64 }, {
        onSuccess: (uploaded) => { setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, files: [...project.files, { ...uploaded, uploadedAt: Date.now() }], updatedAt: Date.now() } : project)); toast.success(`${uploaded.name} added to this project.`); },
        onError: (error) => toast.error(error.message || "Project file upload failed. Please try again."),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read this file.");
    }
  };

  const sendMessage = (value: string) => {
    const trimmed = value.trim();
    if ((!trimmed && !attachedImage) || chatMutation.isPending || imageUploadMutation.isPending || projectFileUploadMutation.isPending) return;
    const content = trimmed || "What can you tell me about this image?";
    const nextMessages = [...messages, { role: "user" as const, content, image: attachedImage ?? undefined }];
    setMessages(nextMessages);
    setFailedMessages(null);
    setInput("");
    const discoverVisuals = visualDiscoveryMode || Boolean(attachedImage);
    const conversationMemory = memoryEnabled ? buildMemoryContext(conversations, activeSessionId) : "";
    const fedMemory = buildFedMemoryContext(fedMemories, activeSessionId);
    const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : undefined;
    const projectContext = activeProject ? buildProjectContext(conversations, activeProject.id, activeSessionId) : "";
    setAttachedImage(null);
    setVisualDiscoveryMode(false);
    chatMutation.mutate({ messages: nextMessages, discoverVisuals, memory: fedMemory || conversationMemory || activeProject ? { fedMemory: fedMemory || undefined, conversationMemory: conversationMemory || undefined, projectInstructions: activeProject?.instructions || undefined, projectContext: projectContext || undefined, projectFiles: activeProject?.files.map((file) => ({ name: file.name, mimeType: file.mimeType })) } : undefined });
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

  const activeSourceSet = activeSourceIndex === null ? null : responseSources[activeSourceIndex] ?? null;
  const activeVisualSet = activeVisualIndex === null ? null : visualSets[activeVisualIndex] ?? null;
  const latestSourceIndex = messages.at(-1)?.role === "assistant" ? messages.length - 1 : null;
  const latestSourceSet = latestSourceIndex === null ? null : responseSources[latestSourceIndex] ?? null;
  const latestVisualSet = latestSourceIndex === null ? null : visualSets[latestSourceIndex] ?? null;
  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : undefined;
  const visibleFedMemories = getVisibleFedMemories(fedMemories, activeSessionId);

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
          <button className={cn("shell-icon-button", "projects-trigger", activeProject && "has-active-project")} type="button" onClick={() => { setProjectsOpen(true); setMenuOpen(false); setHistoryOpen(false); }} aria-label="Open Projects" aria-haspopup="dialog"><FolderKanban size={18} /><span aria-hidden="true" /></button>
          <button className={cn("shell-icon-button", "feed-memory-trigger", fedMemories.some((item) => item.enabled) && "has-fed-memory")} type="button" onClick={() => { setFeedMemoryOpen(true); setMenuOpen(false); setHistoryOpen(false); }} aria-label="Open Feed Memory" aria-haspopup="dialog"><Network size={18} /><span aria-hidden="true" /></button>
          <div className="shell-menu-wrap">
            <button className="shell-icon-button" type="button" onClick={() => { setMenuOpen((value) => !value); setHistoryOpen(false); }} aria-label="Open chat options" aria-expanded={menuOpen}>
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && <div className="shell-menu" role="menu">
              <button type="button" onClick={startNewChat}><MessageSquarePlus size={15} /> New chat</button>
              <button type="button" onClick={() => { setMemoryOpen(true); setMenuOpen(false); }}><Sparkles size={15} /> Conversation memory</button>
              <button type="button" onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}><Settings size={15} /> Settings</button>
              <button type="button" onClick={exportCurrentChat}><Download size={15} /> Export chat</button>
              <button type="button" onClick={clearCurrentChat}><Trash2 size={15} /> Clear chat</button>
            </div>}
          </div>
        </div>
      </header>

      {projectViewOpen && activeProject && <section className="project-chat-view" aria-label={`${activeProject.name} project`}><header className="project-chat-view-header"><button className="project-view-back" type="button" onClick={() => setProjectViewOpen(false)}><ArrowLeft size={17} /> All chats</button><div className="project-view-title"><span>PROJECT</span><h1>{activeProject.name}</h1></div><div className="project-view-actions"><button type="button" onClick={() => { setProjectsOpen(true); setProjectViewOpen(false); }}><Settings size={15} /> Manage</button><button type="button" onClick={startProjectChat}><MessageSquarePlus size={15} /> New chat</button></div></header><main className="project-chat-view-main"><div className="project-chat-view-intro"><FolderKanban size={19} /><div><strong>{conversations.filter((conversation) => conversation.projectId === activeProject.id).length} chats in this project</strong><small>Chats stay together here. Manage instructions and files separately when needed.</small></div></div><div className="project-chat-view-list">{conversations.filter((conversation) => conversation.projectId === activeProject.id).sort((a, b) => b.updatedAt - a.updatedAt).map((conversation) => <button type="button" onClick={() => openConversation(conversation)} key={conversation.id}><MessageSquarePlus size={16} /><span><strong>{conversation.title}</strong><small>{conversation.messages.filter((message) => message.role === "user").at(-1)?.content ?? "No visitor message yet"}</small><em>{new Date(conversation.updatedAt).toLocaleDateString()}</em></span></button>)}{!conversations.some((conversation) => conversation.projectId === activeProject.id) && <div className="project-chat-view-empty"><MessageSquarePlus size={26} /><h2>Start the first chat in {activeProject.name}</h2><p>Everything you discuss here will stay with this project.</p><button type="button" onClick={startProjectChat}>New project chat</button></div>}</div></main></section>}

      {(chatMutation.isPending || isProgressPreview) && <section className={cn("header-task-progress", taskProgressOpen && "is-expanded")} aria-label="gvone task progress"><button className="header-task-summary" type="button" onClick={() => setTaskProgressOpen((value) => !value)} aria-expanded={taskProgressOpen}><span className="task-progress-orb" /><span><b>{TASK_PROGRESS_STAGES[taskStageIndex]}</b><small>gvone is working</small></span><span className="header-task-meter"><i style={{ width: `${getTaskProgressPercent(taskStageIndex)}%` }} /></span><ChevronDown size={15} /></button>{taskProgressOpen && <div className="header-task-details"><div className="header-task-steps">{TASK_PROGRESS_STAGES.map((stage, index) => <div className={cn(index < taskStageIndex && "is-complete", index === taskStageIndex && "is-current")} key={stage}><i /> <span>{stage}</span><small>{index < taskStageIndex ? "done" : index === taskStageIndex ? "in progress" : "queued"}</small></div>)}</div></div>}</section>}

      {historyOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" />
        <aside className="history-drawer chat-navigation-drawer" aria-label="Chats and projects">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone workspace</span><h2>Chats</h2></div><button className="drawer-close" type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat navigation"><X size={18} /></button></div>
          <div className="chat-navigation-actions"><button className="new-chat-button" type="button" onClick={startNewChat}><MessageSquarePlus size={16} /> New chat</button><button className="projects-nav-button" type="button" onClick={() => { setProjectsOpen(true); setHistoryOpen(false); }}><FolderKanban size={16} /> Projects</button></div>
          <label className="history-search"><Search size={15} /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
          <div className="chat-navigation-section"><div className="chat-navigation-section-heading"><span>Projects</span><button type="button" onClick={() => { setProjectsOpen(true); setHistoryOpen(false); }}><Plus size={13} /> New</button></div><div className="chat-project-list">{projects.map((project) => <button className={cn("chat-project-item", project.id === activeProjectId && "is-active")} type="button" onClick={() => enterProjectView(project.id)} key={project.id}><FolderKanban size={14} /><span><strong>{project.name}</strong><small>{conversations.filter((conversation) => conversation.projectId === project.id).length} chats</small></span></button>)}{!projects.length && <p>No projects yet. Create one to keep a long-running topic together.</p>}</div></div>
          <div className="chat-navigation-section history-list"><div className="chat-navigation-section-heading"><span>{activeProject ? `${activeProject.name} chats` : "Personal chats"}</span>{activeProject && <button type="button" onClick={() => selectProject(null)}>View personal</button>}</div>{conversations.filter((conversation) => conversation.title.toLowerCase().includes(historySearch.toLowerCase()) && (activeProject ? conversation.projectId === activeProject.id : !conversation.projectId)).map((conversation) => <div className={cn("history-item", conversation.id === activeSessionId && "is-active", assignProjectChatId === conversation.id && "project-menu-open")} key={conversation.id}><button type="button" className="history-item-main" onClick={() => openConversation(conversation)}><span className="history-item-title">{conversation.title}</span><small>{conversation.projectId ? projects.find((project) => project.id === conversation.projectId)?.name ?? "Project" : new Date(conversation.updatedAt).toLocaleDateString()}</small></button><div className="history-item-actions"><button type="button" className="history-project" onClick={() => setAssignProjectChatId((current) => current === conversation.id ? null : conversation.id)} aria-label={`Add ${conversation.title} to a project`} aria-expanded={assignProjectChatId === conversation.id}><FolderKanban size={13} /></button><button type="button" className="history-delete" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2 size={14} /></button></div>{assignProjectChatId === conversation.id && <div className="chat-project-menu" role="menu"><span>Move to project</span><button type="button" onClick={() => assignChatToProject(conversation.id, null)} className={!conversation.projectId ? "is-selected" : ""}>Personal chats</button>{projects.map((project) => <button type="button" onClick={() => assignChatToProject(conversation.id, project.id)} className={conversation.projectId === project.id ? "is-selected" : ""} key={project.id}><FolderKanban size={12} /> {project.name}</button>)}{!projects.length && <small>Create a project first, then move this chat into it.</small>}</div>}</div>)}{!conversations.filter((conversation) => activeProject ? conversation.projectId === activeProject.id : !conversation.projectId).length && <div className="history-empty"><MessageSquarePlus size={21} /><p>{activeProject ? "Start a project chat here." : "Your personal chats will appear here."}</p><small>Use a project to keep a specific goal together.</small></div>}</div>
        </aside>
      </>}

      {projectsOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => setProjectsOpen(false)} aria-label="Close Projects" />
        <aside className="projects-drawer" aria-label="Projects">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone workspaces</span><h2>Projects</h2></div><button className="drawer-close" type="button" onClick={() => setProjectsOpen(false)} aria-label="Close Projects"><X size={18} /></button></div>
          <div className="project-create"><input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value.slice(0, 70))} onKeyDown={(event) => { if (event.key === "Enter") createProject(); }} placeholder="New project name" aria-label="New project name" /><button type="button" onClick={createProject} aria-label="Create project"><Plus size={16} /> Create</button></div>
          <div className="project-switcher"><button className={cn("project-switch-item", !activeProjectId && "is-active")} type="button" onClick={() => selectProject(null)}><span className="project-switch-icon"><MessageSquarePlus size={14} /></span><span><strong>Personal chats</strong><small>{conversations.filter((conversation) => !conversation.projectId).length} ungrouped chats</small></span></button>{projects.map((project) => <div className={cn("project-switch-wrap", project.id === activeProjectId && "is-active")} key={project.id}><button className="project-switch-item" type="button" onClick={() => enterProjectView(project.id)}><span className="project-switch-icon"><FolderKanban size={14} /></span><span><strong>{project.name}</strong><small>{conversations.filter((conversation) => conversation.projectId === project.id).length} chats · {project.files.length} files</small></span></button><button className="project-delete" type="button" onClick={() => deleteProject(project.id)} aria-label={`Delete ${project.name} project`}><Trash2 size={13} /></button></div>)}</div>
          {activeProject ? <section className="project-workspace chat-first-workspace"><div className="project-workspace-heading"><div><span>PROJECT</span><h3>{activeProject.name}</h3></div><button type="button" onClick={startNewChat}><MessageSquarePlus size={14} /> New chat</button></div><div className="project-primary-chats"><div className="project-primary-chats-heading"><span>Chats in this project</span><small>{conversations.filter((conversation) => conversation.projectId === activeProject.id).length}</small></div>{conversations.filter((conversation) => conversation.projectId === activeProject.id).sort((a, b) => b.updatedAt - a.updatedAt).map((conversation) => <button className={cn(conversation.id === activeSessionId && "is-active")} type="button" onClick={() => openConversation(conversation)} key={conversation.id}><MessageSquarePlus size={13} /><span><strong>{conversation.title}</strong><small>{new Date(conversation.updatedAt).toLocaleDateString()}</small></span></button>)}{!conversations.some((conversation) => conversation.projectId === activeProject.id) && <div className="project-chat-empty"><MessageSquarePlus size={19} /><p>No chats in this project yet.</p><button type="button" onClick={startNewChat}>Start the first chat</button></div>}</div><details className="project-secondary-section"><summary><span><Settings size={14} /> Project instructions</span><small>{activeProject.instructions ? "Set" : "Optional"}</small></summary><label className="project-instructions"><span>Instructions for new replies</span><textarea value={activeProject.instructions} onChange={(event) => updateProject(activeProject.id, { instructions: event.target.value.slice(0, 1800) })} placeholder="Set tone, goals, constraints, or working preferences for every chat in this project." rows={4} /><small>{activeProject.instructions.length}/1800 · applied to new replies</small></label></details><details className="project-secondary-section"><summary><span><FileText size={14} /> Project files</span><small>{activeProject.files.length}</small></summary><div className="project-files"><div className="project-files-heading"><span>Shared file library</span><input ref={projectFileInputRef} type="file" className="project-file-input" accept=".pdf,.txt,.md,.csv,.json,.docx,.xlsx,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProjectFile(file); event.currentTarget.value = ""; }} /><button type="button" onClick={() => projectFileInputRef.current?.click()} disabled={projectFileUploadMutation.isPending}>{projectFileUploadMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FilePlus2 size={14} />} Add file</button></div><div className="project-file-list">{activeProject.files.map((file) => <article key={file.key}><a href={file.url} target="_blank" rel="noreferrer"><FileText size={15} /><span><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB · {file.mimeType.split("/").at(-1)}</small></span></a><button type="button" onClick={() => updateProject(activeProject.id, { files: activeProject.files.filter((item) => item.key !== file.key) })} aria-label={`Remove ${file.name}`}><Trash2 size={13} /></button></article>)}{!activeProject.files.length && <p>Keep briefs, notes, sources, and assets together here.</p>}</div></div></details></section> : <div className="projects-empty"><FolderKanban size={22} /><p>Organize longer work in a dedicated project.</p><small>Projects keep related chats, files, shared instructions, and context together.</small></div>}
        </aside>
      </>}

      {settingsOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings" />
        <aside className="settings-drawer" aria-label="gvone settings">
          <div className="drawer-heading"><div><span className="drawer-kicker">personalize gvone</span><h2>Settings</h2></div><button className="drawer-close" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div>
          <div className="settings-section"><span className="settings-label">Voice & response</span><button className="setting-row" type="button" onClick={() => setAutoSpeak((value) => !value)}><span><span className="setting-icon">{autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}</span><strong>Speak responses aloud</strong><small>Use browser voice after gvone replies</small></span><span className={cn("toggle", autoSpeak && "is-on")}><i /></span></button></div>
          <div className="settings-section"><span className="settings-label">Interface</span><button className="setting-row" type="button" onClick={() => setShowHints((value) => !value)}><span><span className="setting-icon"><Sparkles size={16} /></span><strong>Show conversation hints</strong><small>Keep starter prompts near the composer</small></span><span className={cn("toggle", showHints && "is-on")}><i /></span></button><button className="setting-row" type="button" onClick={() => setAmbientMotion((value) => !value)}><span><span className="setting-icon"><Sparkles size={16} /></span><strong>Ambient motion</strong><small>Control the background drift and idle atmosphere</small></span><span className={cn("toggle", ambientMotion && "is-on")}><i /></span></button></div>
          <div className="settings-section"><span className="settings-label">Conversation memory</span><button className="setting-row" type="button" onClick={() => setMemoryEnabled((value) => !value)}><span><span className="setting-icon"><Sparkles size={16} /></span><strong>Use saved chat context</strong><small>Let gvone draw on relevant earlier conversations</small></span><span className={cn("toggle", memoryEnabled && "is-on")}><i /></span></button></div>
          <div className="settings-note">Conversation memory stays in this browser. You can pause it at any time without deleting saved chats.</div>
        </aside>
      </>}

      {memoryOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => setMemoryOpen(false)} aria-label="Close conversation memory" />
        <aside className="settings-drawer memory-drawer" aria-label="Conversation memory">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone context</span><h2>Conversation memory</h2></div><button className="drawer-close" type="button" onClick={() => setMemoryOpen(false)} aria-label="Close conversation memory"><X size={18} /></button></div>
          <div className="memory-status"><span className={cn("status-pulse", !memoryEnabled && "is-paused")} /><div><strong>{memoryEnabled ? "Context is active" : "Context is paused"}</strong><small>{memoryEnabled ? "gvone may use relevant saved conversations when answering." : "Saved chats remain available, but are not sent as context."}</small></div></div>
          <div className="memory-list"><span className="settings-label">Recent context candidates</span>{conversations.filter((conversation) => conversation.id !== activeSessionId).slice(0, 5).map((conversation) => <article key={conversation.id}><strong>{conversation.title}</strong><small>{conversation.messages.filter((message) => message.role === "user").at(-1)?.content ?? "No visitor message yet"}</small></article>)}{!conversations.filter((conversation) => conversation.id !== activeSessionId).length && <p>No earlier chats are available yet.</p>}</div>
          <button className="memory-action" type="button" onClick={() => { setMemoryEnabled((value) => !value); toast(memoryEnabled ? "Conversation memory paused" : "Conversation memory enabled"); }}>{memoryEnabled ? "Pause memory for new replies" : "Enable memory for new replies"}</button>
          <button className="memory-clear" type="button" onClick={() => { setConversations((current) => current.filter((conversation) => conversation.id === activeSessionId)); setMemoryEnabled(false); toast.success("Earlier conversation context cleared"); }}>Clear saved context</button>
        </aside>
      </>}

      {feedMemoryOpen && <>
        <button className="drawer-backdrop" type="button" onClick={() => { setFeedMemoryOpen(false); setFeedMemoryDraft(""); setEditingFeedMemoryId(null); }} aria-label="Close Feed Memory" />
        <aside className="settings-drawer feed-memory-drawer" aria-label="Feed Memory">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone context</span><h2>Feed Memory</h2></div><button className="drawer-close" type="button" onClick={() => { setFeedMemoryOpen(false); setFeedMemoryDraft(""); setEditingFeedMemoryId(null); }} aria-label="Close Feed Memory"><X size={18} /></button></div>
          <div className="feed-memory-intro"><Network size={16} /><div><strong>Keep useful context close</strong><small>Paste notes, preferences, or background. gvone uses enabled notes alongside relevant saved chats.</small></div></div>
          <div className="feed-memory-editor"><label htmlFor="feed-memory-input">{editingFeedMemoryId ? "Edit memory note" : "Feed a memory note"}</label><textarea id="feed-memory-input" value={feedMemoryDraft} onChange={(event) => setFeedMemoryDraft(event.target.value.slice(0, 1800))} placeholder="Example: I’m planning a calm, minimal portfolio for a ceramics studio. Keep recommendations practical and warm." rows={6} maxLength={1800} /><div className="feed-memory-editor-footer"><small>{feedMemoryDraft.length}/1800</small><div>{editingFeedMemoryId && <button className="feed-memory-cancel" type="button" onClick={() => { setFeedMemoryDraft(""); setEditingFeedMemoryId(null); }}>Cancel</button>}<button className="feed-memory-save" type="button" onClick={saveFedMemory}>{editingFeedMemoryId ? "Update memory" : "Add to memory"}</button></div></div></div>
          <div className="feed-memory-list"><span className="settings-label">This chat’s notes · {visibleFedMemories.length}/{MAX_FED_MEMORIES}</span>{visibleFedMemories.map((item, index) => <article className={cn(!item.enabled && "is-disabled")} key={item.id}><button className={cn("feed-memory-toggle", item.enabled && "is-on")} type="button" onClick={() => setFedMemories((current) => current.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry))} aria-pressed={item.enabled} aria-label={`${item.enabled ? "Disable" : "Enable"} memory ${index + 1}`}><i /></button><div><strong>Memory {index + 1}</strong><div className="feed-memory-scope" role="group" aria-label={`Memory ${index + 1} scope`}><button className={cn(item.scope === "global" && "is-selected")} type="button" onClick={() => setFedMemories((current) => current.map((entry) => entry.id === item.id ? { ...entry, scope: "global", chatId: undefined, updatedAt: Date.now() } : entry))} aria-pressed={item.scope === "global"}>Global</button><button className={cn(item.scope === "chat" && "is-selected")} type="button" onClick={() => setFedMemories((current) => current.map((entry) => entry.id === item.id ? { ...entry, scope: "chat", chatId: activeSessionId, updatedAt: Date.now() } : entry))} aria-pressed={item.scope === "chat"}>This chat</button></div><p>{item.content}</p><small>{!item.enabled ? "Paused" : item.scope === "global" ? "Active in all chats" : "Active for this chat only"}</small></div><div className="feed-memory-item-actions"><button type="button" onClick={() => editFedMemory(item)}>Edit</button><button type="button" onClick={() => { setFedMemories((current) => current.filter((entry) => entry.id !== item.id)); if (editingFeedMemoryId === item.id) { setFeedMemoryDraft(""); setEditingFeedMemoryId(null); } }} aria-label={`Remove memory ${index + 1}`}><Trash2 size={13} /></button></div></article>)}{!visibleFedMemories.length && <p className="feed-memory-empty">No memory is active in this chat yet. Add a note here, or make a note global to use it everywhere.</p>}</div>
          <p className="feed-memory-privacy">Stored in this browser. gvone treats fed notes as reference material, not instructions.</p>
        </aside>
      </>}

      {sourceDrawerOpen && activeSourceSet && <>
        <button className="drawer-backdrop source-drawer-backdrop" type="button" onClick={() => setSourceDrawerOpen(false)} aria-label="Close web results" />
        <aside className="source-results-drawer" aria-label="Web results for this response">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone sources</span><h2>Web results</h2></div><button className="drawer-close" type="button" onClick={() => setSourceDrawerOpen(false)} aria-label="Close web results"><X size={18} /></button></div>
          <section className="web-results" aria-label="Website sources">
            <div className="web-results-heading"><div><span className="web-results-kicker"><Globe2 size={13} /> web results</span><strong>Sources for: {activeSourceSet.query}</strong></div><span className="web-results-info">saved sources</span></div>
            {webRetryMutation.isPending && <div className="web-results-loading"><span /><span /><span /> Refreshing websites…</div>}
            {!webRetryMutation.isPending && activeSourceSet.results.map((result) => <article className="web-result-card" key={result.url}>
              <img src={result.favicon} alt="" className="web-result-favicon" />
              <div className="web-result-copy"><a href={result.url} target="_blank" rel="noreferrer" className="web-result-title">{result.title}<ExternalLink size={12} /></a><span className="web-result-domain">{result.domain}</span><p>{result.snippet}</p><div className="web-result-actions"><button type="button" onClick={() => { void navigator.clipboard?.writeText(result.url); toast.success("Link copied"); }}><Copy size={12} /> copy</button><button type="button" onClick={() => { if (navigator.share) void navigator.share({ title: result.title, url: result.url }); else { void navigator.clipboard?.writeText(result.url); toast.success("Link copied"); } }}><Share2 size={12} /> share</button><button type="button" aria-label="Like source"><ThumbsUp size={12} /></button><button type="button" aria-label="Dislike source"><ThumbsDown size={12} /></button></div></div>
            </article>)}
            {!webRetryMutation.isPending && activeSourceSet.error && <div className="web-results-error">{activeSourceSet.error}<button type="button" onClick={() => retryWebResults(activeSourceIndex ?? -1)}>Retry sources</button></div>}
            {!webRetryMutation.isPending && !activeSourceSet.error && !activeSourceSet.results.length && <div className="web-results-error">No source pages were found for this query.</div>}
            {!webRetryMutation.isPending && activeSourceSet.results.length >= 5 && <button className="web-results-more" type="button" onClick={() => toast("Showing the five most relevant saved sources")}>Show more results <ChevronDown size={14} /></button>}
          </section>
        </aside>
      </>}

      {visualDrawerOpen && activeVisualSet && <>
        <button className="drawer-backdrop source-drawer-backdrop" type="button" onClick={() => setVisualDrawerOpen(false)} aria-label="Close visual matches" />
        <aside className="source-results-drawer visual-results-drawer" aria-label="Visual matches for this response">
          <div className="drawer-heading"><div><span className="drawer-kicker">gvone vision</span><h2>Visual matches</h2></div><button className="drawer-close" type="button" onClick={() => setVisualDrawerOpen(false)} aria-label="Close visual matches"><X size={18} /></button></div>
          <section className="visual-results" aria-label="Related visual references">
            <div className="visual-results-heading"><div><span><ScanSearch size={13} /> image discovery</span><strong>Related to: {activeVisualSet.query}</strong></div><small>saved references</small></div>
            <div className="visual-result-grid">{activeVisualSet.results.map((result) => <a className="visual-result-card" href={result.url} target="_blank" rel="noreferrer" key={result.url}><img src={result.imageUrl} alt="" /><span><b>{result.title}</b><small>{result.domain}</small><em>{result.caption}</em></span><ExternalLink size={13} /></a>)}</div>
            {activeVisualSet.error && <div className="web-results-error">{activeVisualSet.error}</div>}
            {!activeVisualSet.error && !activeVisualSet.results.length && <div className="web-results-error">No related visual references were found.</div>}
          </section>
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
                    {message.role === "assistant" ? <><Streamdown>{message.content}</Streamdown><div className="assistant-message-actions"><button type="button" className="replay-button" onClick={() => speakText(message.content)} aria-label="Replay gvone response"><Volume2 size={12} /> replay</button>{responseSources[index] && index !== latestSourceIndex && <button type="button" className="web-results-trigger" onClick={() => { setActiveSourceIndex(index); setSourceDrawerOpen(true); }}><Globe2 size={12} /> Web results <span>{responseSources[index].results.length || "!"}</span></button>}{visualSets[index] && index !== latestSourceIndex && <button type="button" className="visual-results-trigger" onClick={() => { setActiveVisualIndex(index); setVisualDrawerOpen(true); }}><ScanSearch size={12} /> Visual matches <span>{visualSets[index].results.length || "!"}</span></button>}</div></> : <>{message.image && <img className="message-image" src={message.image.url} alt={`Attached image: ${message.image.name}`} />}<p>{message.content}</p></>}
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
              {latestVisualSet && <section className="visual-results latest-visual-results" aria-label="Latest image discovery results">
                <div className="visual-results-heading"><div><span><ScanSearch size={13} /> image discovery</span><strong>Visual references for: {latestVisualSet.query}</strong></div><small>latest reply</small></div>
                <div className="visual-result-grid">{latestVisualSet.results.slice(0, 3).map((result) => <a className="visual-result-card" href={result.url} target="_blank" rel="noreferrer" key={result.url}><img src={result.imageUrl} alt="" /><span><b>{result.title}</b><small>{result.domain}</small><em>{result.caption}</em></span><ExternalLink size={13} /></a>)}</div>
                {latestVisualSet.error && <div className="web-results-error">{latestVisualSet.error}</div>}
                {!latestVisualSet.error && !latestVisualSet.results.length && <div className="web-results-error">No related visual references were found.</div>}
                {latestVisualSet.results.length > 3 && <button className="web-results-more" type="button" onClick={() => { setActiveVisualIndex(latestSourceIndex); setVisualDrawerOpen(true); }}>Explore all visual matches <ChevronDown size={14} /></button>}
              </section>}
              {latestSourceSet && <section className="web-results latest-web-results" aria-label="Latest web results">
                <div className="web-results-heading"><div><span className="web-results-kicker"><Globe2 size={13} /> web results</span><strong>Sources for: {latestSourceSet.query}</strong></div><span className="web-results-info">latest reply</span></div>
                {latestSourceSet.results.map((result) => <article className="web-result-card" key={result.url}>
                  <img src={result.favicon} alt="" className="web-result-favicon" />
                  <div className="web-result-copy"><a href={result.url} target="_blank" rel="noreferrer" className="web-result-title">{result.title}<ExternalLink size={12} /></a><span className="web-result-domain">{result.domain}</span><p>{result.snippet}</p><div className="web-result-actions"><button type="button" onClick={() => { void navigator.clipboard?.writeText(result.url); toast.success("Link copied"); }}><Copy size={12} /> copy</button><button type="button" onClick={() => { if (navigator.share) void navigator.share({ title: result.title, url: result.url }); else { void navigator.clipboard?.writeText(result.url); toast.success("Link copied"); } }}><Share2 size={12} /> share</button><button type="button" aria-label="Like source"><ThumbsUp size={12} /></button><button type="button" aria-label="Dislike source"><ThumbsDown size={12} /></button></div></div>
                </article>)}
                {latestSourceSet.error && <div className="web-results-error">{latestSourceSet.error}<button type="button" onClick={() => retryWebResults(latestSourceIndex ?? -1)}>Retry sources</button></div>}
                {!latestSourceSet.error && !latestSourceSet.results.length && <div className="web-results-error">No source pages were found for this query.</div>}
                {latestSourceSet.results.length >= 5 && <button className="web-results-more" type="button" onClick={() => { setActiveSourceIndex(latestSourceIndex); setSourceDrawerOpen(true); }}>Show all saved results <ChevronDown size={14} /></button>}
              </section>}
            </div>

            {showHints && <div className="prompt-row">
              {suggestedPrompts.map((prompt) => <button key={prompt} className="prompt-chip" onClick={() => sendMessage(prompt)} disabled={chatMutation.isPending}>{prompt}</button>)}
            </div>}

            <form className={cn("composer", attachedImage && "has-image")} onSubmit={handleSubmit}>
              <input ref={imageInputRef} className="image-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} aria-label="Attach an image for identification" />
              {attachedImage && <div className="attached-image-chip"><img src={attachedImage.url} alt="Attached for identification" /><span>{attachedImage.name}</span><small>visual analysis</small><button type="button" onClick={() => setAttachedImage(null)} aria-label="Remove attached image"><X size={12} /></button></div>}
              <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say anything…" aria-label="Message your character assistant" disabled={chatMutation.isPending} />
              <div className="composer-actions">
                <button type="button" className="composer-icon image-attach-button" onClick={() => imageInputRef.current?.click()} disabled={chatMutation.isPending || imageUploadMutation.isPending} aria-label="Attach image for identification">{imageUploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={17} />}</button>
                <button type="button" className={cn("composer-icon", "visual-discovery-button", visualDiscoveryMode && "active")} onClick={() => setVisualDiscoveryMode((value) => !value)} disabled={chatMutation.isPending || imageUploadMutation.isPending} aria-pressed={visualDiscoveryMode} aria-label="Toggle image discovery for this prompt"><ScanSearch size={16} /></button>
                <button type="button" className={cn("composer-icon", isListening && "active")} onClick={() => { setIsListening((value) => !value); toast(isListening ? "Voice input paused" : "Voice input is ready when you are"); }} aria-label="Toggle voice input"><Mic size={17} /></button>
                <button type="submit" className="send-button" disabled={(!input.trim() && !attachedImage) || chatMutation.isPending || imageUploadMutation.isPending} aria-label="Send message">{chatMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}</button>
              </div>
            </form>
          </div>

        </div>
      </section>
      <button className="scroll-cue" onClick={() => inputRef.current?.focus()} aria-label="Start a conversation"><span>start a conversation</span><ChevronDown size={15} /></button>
    </main>
  );
}
