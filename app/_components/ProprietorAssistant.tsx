"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type CardDoc = { student: string; classKey: string; term: string; session: string; name?: string };
type Message = { role: "user" | "assistant"; content: string; failed?: boolean; doc?: CardDoc; document?: boolean };
type Model = { id: string; label: string; description?: string; url?: string; providerId?: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number };
type Person = { id?: string; full_name?: string };
type AssistantConfig = { configured: boolean; models: Model[]; default_model: string; default_url: string; results_url?: string; is_admin: boolean; person?: Person };
type TestState = { state: "idle" | "running" | "pass" | "fail"; message: string };
type Job = { threadId: string; messages: Message[]; started: number; jobId?: string };

const DEFAULT_URL = "https://api.deepseek.com";

function hostOf(value: string) {
  try { return new URL(value).host; } catch { return value; }
}
const FALLBACK_MODELS: Model[] = [
  { id: "deepseek-chat", label: "DeepSeek Chat", description: "Everyday school requests" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", description: "Longer reasoning tasks" },
];
/** Provider errors arrive as raw JSON; keep the one sentence the provider sent. */
function saidText(raw: unknown) {
  const text = String(raw || "").trim();
  if (!text) return "";
  try {
    const raw = JSON.parse(text) as unknown;
    const parsed = (Array.isArray(raw) ? raw[0] : raw) as { error?: { message?: string } | string; message?: string } | undefined;
    const inner = typeof parsed?.error === "string" ? parsed.error : parsed?.error?.message || parsed?.message || "";
    if (inner) return ` ${inner}`;
  } catch { /* not JSON */ }
  return ` ${text.slice(0, 200)}`;
}

const ERRORS: Record<string, string> = {
  ASSISTANT_MODEL_KEY_REJECTED: "The API key was rejected. Check the key in Models.",
  ASSISTANT_MODEL_NOT_FOUND: "The model name was not found. Check the model ID in Models.",
  ASSISTANT_MODEL_UNAVAILABLE: "This key cannot reach that model. Fetch the models the key supports and pick one.",
  ASSISTANT_MODEL_RATE_LIMITED: "The provider is limiting requests. Wait a moment and try again.",
  ASSISTANT_MODEL_BUSY: "The provider is busy right now. Try again in a moment, or pick another model.",
  ASSISTANT_MODEL_TIMEOUT: "The model took too long to answer. Try again.",
  ASSISTANT_MODEL_UNREACHABLE: "The provider could not be reached from the school server.",
  ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED: "Add a model API key in Models.",
  ASSISTANT_MODEL_REQUEST_FAILED: "The model could not answer. Check the model settings in Models.",
  ASSISTANT_PROVIDER_URL_INVALID: "The endpoint address is not a valid https chat-completions address.",
  ASSISTANT_ADMIN_REQUIRED: "Model settings are available to the developer account only.",
  ASSISTANT_MODEL_NOT_AVAILABLE: "That model name is too long or invalid.",
  STAFF_SESSION_REQUIRED: "Your sign-in expired. Reload the page and sign in again.",
  STAFF_SESSION_NOT_ACTIVE: "Your sign-in expired. Reload the page and sign in again.",
  PROPRIETOR_ACCESS_REQUIRED: "This account does not have proprietor or developer access.",
};

type Effort = "low" | "medium" | "high";

type Stored = {
  models: Model[];
  defaultModel: string;
  providerKey: string;
  keys: Record<string, string>;
  providerUrl: string;
  providerId: string;
  effort: Effort;
  usagePercent: number;
  perReplyCost: number;
  usageDays: number;
  usageUntil: number;
};

const PROVIDERS = [
  { id: "yeta", label: "Yeta", url: "https://platform.yeta.ai/v1" },
  { id: "xingchiapi", label: "Xingchiapi", url: "https://api.xingchiapi.com" },
  { id: "deepseek", label: "DeepSeek", url: "https://api.deepseek.com" },
  { id: "openai", label: "OpenAI", url: "https://api.openai.com/v1" },
  { id: "gemini", label: "Gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "other", label: "Other", url: "" },
];

const EFFORTS: { id: Effort; label: string }[] = [
  { id: "low", label: "Low (faster)" },
  { id: "medium", label: "Medium (balanced)" },
  { id: "high", label: "High (deeper)" },
];

function providerOf(url: string) {
  const match = PROVIDERS.find((provider) => provider.url && url.startsWith(provider.url));
  return match ? match.id : "other";
}

function sanitiseModels(value: unknown, fallback: Model[]): Model[] {
  const list = Array.isArray(value) ? value : [];
  const clean = list
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String((item as Model).id || "").trim(),
      label: String((item as Model).label || "").trim(),
      description: String((item as Model).description || ""),
      url: typeof (item as Model).url === "string" ? (item as Model).url : "",
      providerId: typeof (item as Model).providerId === "string" ? (item as Model).providerId : "",
    }))
    .filter((item) => item.id);
  return clean.length ? clean : fallback;
}

/** Keys are kept per provider so switching back to an old provider still works. */
function readKeys(saved: Partial<Stored>) {
  const raw = saved.keys;
  const clean: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [id, value] of Object.entries(raw)) {
      if (typeof value === "string" && value.trim()) clean[id] = value.trim();
    }
  }
  if (!Object.keys(clean).length && typeof saved.providerKey === "string" && saved.providerKey) {
    clean[saved.providerId || providerOf(saved.providerUrl || "")] = saved.providerKey;
  }
  return clean;
}

function readStored(key: string, config: AssistantConfig): Stored {
  // A fresh account starts with the one model in use, not the whole provider list.
  const seed = config.default_model ? [{ id: config.default_model, label: config.default_model }] : FALLBACK_MODELS.slice(0, 1);
  const fallback: Stored = {
    models: seed,
    defaultModel: config.default_model || FALLBACK_MODELS[0].id,
    providerKey: "",
    keys: {},
    providerUrl: config.default_url || DEFAULT_URL,
    providerId: providerOf(config.default_url || DEFAULT_URL),
    effort: "low",
    usagePercent: 100,
    perReplyCost: 1,
    usageDays: 30,
    usageUntil: 0,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null") as Partial<Stored> | null;
    if (!saved) return fallback;
    // Older entries had no route of their own; pin them to the route they were saved under.
    const models = sanitiseModels(saved.models, fallback.models).map((model) => ({
      ...model,
      url: model.url || saved.providerUrl || fallback.providerUrl,
      providerId: model.providerId || saved.providerId || fallback.providerId,
    }));
    const defaultModel = models.some((model) => model.id === saved.defaultModel) ? String(saved.defaultModel) : models[0].id;
    return {
      models,
      defaultModel,
      providerKey: typeof saved.providerKey === "string" ? saved.providerKey : "",
      keys: readKeys(saved),
      providerUrl: typeof saved.providerUrl === "string" && saved.providerUrl ? saved.providerUrl : fallback.providerUrl,
      providerId: typeof saved.providerId === "string" && PROVIDERS.some((provider) => provider.id === saved.providerId) ? saved.providerId : providerOf(saved.providerUrl || fallback.providerUrl),
      effort: saved.effort === "medium" || saved.effort === "high" ? saved.effort : "low",
      usagePercent: Number.isFinite(saved.usagePercent) ? Math.max(0, Math.min(100, Number(saved.usagePercent))) : 100,
      perReplyCost: Number.isFinite(saved.perReplyCost) ? Math.max(0, Math.min(100, Number(saved.perReplyCost))) : 1,
      usageDays: Number.isFinite(saved.usageDays) ? Math.max(1, Math.min(365, Number(saved.usageDays))) : 30,
      usageUntil: Number.isFinite(saved.usageUntil) ? Number(saved.usageUntil) : 0,
    };
  } catch {
    return fallback;
  }
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

function splitCells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderBlocks(content: string) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) { rows.push(splitCells(lines[index])); index += 1; }
      const body = rows.filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));
      const [head, ...rest] = body;
      if (head) {
        blocks.push(<div className="assistantTableWrap" key={`w${index}`}><table className="assistantTable" key={`t${index}`}><thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex}>{renderInline(cell)}</th>)}</tr></thead><tbody>{rest.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}</tr>)}</tbody></table></div>);
      }
      continue;
    }
    if (!line.trim() || /^---+$/.test(line.trim())) { index += 1; continue; }
    blocks.push(<p key={`p${index}`}>{renderInline(line)}</p>);
    index += 1;
  }
  return blocks;
}

export function ProprietorAssistant() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [loadError, setLoadError] = useState("");
  const [stored, setStoredKey] = useState("");
  const [settings, setSettings] = useState<Stored>({ models: FALLBACK_MODELS, defaultModel: FALLBACK_MODELS[0].id, providerKey: "", providerUrl: DEFAULT_URL, providerId: "yeta", effort: "low", usagePercent: 100, perReplyCost: 1, usageDays: 30, usageUntil: 0, keys: {} });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [tab, setTab] = useState<"chats" | "models" | "usage">("chats");
  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyThread, setBusyThread] = useState("");
  const [notify, setNotify] = useState<"off" | "on" | "denied">("off");
  const [notice, setNotice] = useState("");
  const [approval, setApproval] = useState<{ token: string; summary: string } | null>(null);
  const [form, setForm] = useState({ id: "", label: "", url: DEFAULT_URL, key: "", provider: "yeta", effort: "low" as Effort });
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ state: "idle", message: "" });
  const [savedFlash, setSavedFlash] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [probe, setProbe] = useState<Record<string, "testing" | "works" | "failed" | "busy">>({});
  const endRef = useRef<HTMLDivElement | null>(null);
  const resumed = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const baseTitle = useRef("");
  const tabRef = useRef(tab);
  const activeRef = useRef(activeId);
  const notifyRef = useRef(notify);
  tabRef.current = tab; activeRef.current = activeId; notifyRef.current = notify;

  useEffect(() => {
    // A slow database must not leave the gate spinning forever; one retry, then a real message.
    const openWorkspace = async () => {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await fetch("/api/assistant", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(35000) });
        } catch {
          if (attempt >= 1) throw new Error("ASSISTANT_UNAVAILABLE");
          await new Promise((ready) => { window.setTimeout(ready, 1200); });
        }
      }
    };
    openWorkspace()
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok || !value?.ok) throw new Error(String(value?.code || "ASSISTANT_UNAVAILABLE"));
        const personId = String(value.person?.id || "signed-in-user");
        setConfig(value as AssistantConfig);
        const settingsKey = `wts-assistant-settings:${personId}`;
        const chatKey = `wts-assistant-chats:${personId}`;
        setStoredKey(settingsKey);
        const loaded = readStored(settingsKey, value as AssistantConfig);
        const shared = (value as { usage?: { percent?: number; cost?: number; days?: number; until?: number } }).usage;
        if (shared && typeof shared === "object") {
          if (typeof shared.percent === "number") loaded.usagePercent = shared.percent;
          if (typeof shared.cost === "number") loaded.perReplyCost = shared.cost;
          if (typeof shared.days === "number") loaded.usageDays = shared.days;
          if (typeof shared.until === "number") loaded.usageUntil = shared.until;
        }
        setSettings(loaded);
        try {
          const wanted = localStorage.getItem(`wts-assistant-notify:${personId}`);
          setNotify(wanted === "on" && (!("Notification" in window) || Notification.permission === "granted") ? "on" : wanted === "denied" ? "denied" : "off");
        } catch { setNotify("off"); }
        setForm({ id: "", label: "", url: loaded.providerUrl, key: loaded.providerKey, provider: loaded.providerId, effort: loaded.effort });
        let list: Thread[] = [];
        try {
          const raw = JSON.parse(localStorage.getItem(chatKey) || "[]");
          if (Array.isArray(raw)) list = raw.filter((item) => item && typeof item === "object").slice(0, 60);
        } catch { list = []; }
        if (!list.length) list = [{ id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() }];
        setThreads(list);
        const wantedChat = new URLSearchParams(window.location.search).get("chat");
        const backTo = list.find((item) => item.id === wantedChat);
        setActiveId(backTo ? backTo.id : list[0].id);
        if (wantedChat) window.history.replaceState(null, "", window.location.pathname);
      })
      .catch((error) => {
        const code = error instanceof Error ? error.message : "";
        if (process.env.NODE_ENV !== "production") {
          const mock: AssistantConfig = { configured: true, models: FALLBACK_MODELS, default_model: FALLBACK_MODELS[0].id, default_url: DEFAULT_URL, is_admin: true, person: { id: "preview", full_name: "Alabi Preview" } };
          setConfig(mock);
          const loaded = readStored("wts-assistant-settings:preview", mock);
          setSettings(loaded);
          setForm({ id: "", label: "", url: loaded.providerUrl, key: loaded.providerKey, provider: loaded.providerId, effort: loaded.effort });
          const fresh: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
          setThreads([fresh]); setActiveId(fresh.id);
          return;
        }
        setLoadError(code === "PROPRIETOR_ACCESS_REQUIRED"
          ? "ACCESS:This account does not have proprietor or developer access."
          : code === "ASSISTANT_UNAVAILABLE"
            ? "SLOW:The school records are slow right now."
            : "Your session could not be verified. Please sign in to the Staff Portal.");
      });
  }, []);

  useEffect(() => { if (stored) localStorage.setItem(stored, JSON.stringify(settings)); }, [settings, stored]);
  useEffect(() => {
    if (!config?.person?.id || !threads.length) return;
    localStorage.setItem(`wts-assistant-chats:${config.person.id}`, JSON.stringify(threads));
  }, [threads, config]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [activeId, threads]);
  // A visible count, so a slow answer never looks stuck.
  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const tick = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(tick);
  }, [busy]);
  useEffect(() => { baseTitle.current = baseTitle.current || document.title; }, []);
  // The page worker shows the "answer ready" notice, also from the background.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/assistant-sw.js").catch(() => { /* notices fall back to the page */ });
  }, []);
  useEffect(() => { if (!busy && !document.hidden) document.title = baseTitle.current; }, [tab, busy]);
  useEffect(() => {
    // Wait for the saved chats, so the restarted answer lands in a real thread.
    if (!config?.person?.id || !threads.length || resumed.current) return;
    resumed.current = true;
    let job: Job | null = null;
    try { job = JSON.parse(localStorage.getItem(`wts-assistant-job:${config.person.id}`) || "null"); } catch { job = null; }
    if (!job?.threadId || !Array.isArray(job.messages) || !job.messages.length) return;
    const thread = threads.find((item) => item.id === job.threadId);
    if (thread?.messages.slice(-1)[0]?.role !== "user") { try { localStorage.removeItem(`wts-assistant-job:${config.person.id}`); } catch { /* ignore */ } return; }
    // The saved thread can hold more history than the job record, so keep the longer one.
    const messages = thread && thread.messages.length > job.messages.length ? thread.messages : job.messages;
    setActiveId(job.threadId);
    setTab("chats");
    void run(job.threadId, messages, job.jobId, job.started);
    setNotice("Picking up the job you left running…");
  }, [config, threads.length]);
  useEffect(() => {
    const back = () => {
      if (!document.hidden && !busy) document.title = baseTitle.current;
      if (!document.hidden && !busy && config?.person?.id) {
        const key = `wts-assistant-job:${config.person.id}`;
        let job: Job | null = null;
        try { job = JSON.parse(localStorage.getItem(key) || "null"); } catch { job = null; }
        if (job?.threadId && Array.isArray(job.messages) && job.messages.length && job.jobId) {
          const thread = threads.find((item) => item.id === job.threadId);
          if (thread?.messages.slice(-1)[0]?.role === "user") {
            const messages = thread.messages.length > job.messages.length ? thread.messages : job.messages;
            setActiveId(job.threadId);
            setTab("chats");
            void run(job.threadId, messages, job.jobId, job.started);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [busy, config, threads]);

  const activeThread = threads.find((thread) => thread.id === activeId) || threads[0];
  const name = useMemo(() => config?.person?.full_name?.split(" ")[0] || "there", [config]);
  const activeModel = settings.models.find((model) => model.id === settings.defaultModel);

  function newChat() {
    const item: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
    setThreads((current) => [item, ...current]);
    setActiveId(item.id);
    setApproval(null); setNotice(""); setTab("chats"); setDrawer(false);
  }

  function updateThread(id: string, messages: Message[]) {
    const title = messages[0]?.role === "user" ? messages[0].content.slice(0, 46) : "New chat";
    setThreads((current) => {
      const known = current.some((thread) => thread.id === id);
      const next = known
        ? current.map((thread) => thread.id === id ? { ...thread, messages, title: thread.title === "New chat" ? title : thread.title, updatedAt: Date.now() } : thread)
        : [{ id, title, messages, updatedAt: Date.now() }, ...current];
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  function removeThread(id: string) {
    setThreads((current) => {
      const next = current.filter((thread) => thread.id !== id);
      if (!next.length) {
        const fresh: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function applyModels(next: Model[], defaultModel?: string) {
    setSettings((current) => ({ ...current, models: next, defaultModel: defaultModel && next.some((model) => model.id === defaultModel) ? defaultModel : next[0].id }));
    setSavedFlash(true); window.setTimeout(() => setSavedFlash(false), 1600);
  }

  function saveModel() {
    const id = form.id.trim() || settings.defaultModel;
    if (!id) { setTest({ state: "fail", message: "Enter the model ID from the provider." }); return; }
    const label = form.label.trim() || id;
    const url = form.url.trim() || DEFAULT_URL;
    const key = form.key.trim();
    const next = [...settings.models.filter((model) => model.id !== id), { id, label, description: "Added by you", url, providerId: form.provider }];
    const stored = key || keyFor(form.provider);
    if (!stored && !config?.configured) { setTest({ state: "fail", message: "Paste the API key for this provider." }); return; }
    setSettings((current) => ({ ...current, models: next, defaultModel: id, providerUrl: url, providerKey: stored, keys: stored ? { ...current.keys, [form.provider]: stored } : current.keys, providerId: form.provider, effort: form.effort }));
    setSavedFlash(true); window.setTimeout(() => setSavedFlash(false), 1600);
    setTest({ state: "idle", message: "" });
  }

  function addModel(id: string) {
    const url = form.url.trim() || settings.providerUrl || DEFAULT_URL;
    const providerId = form.provider;
    const key = form.key.trim() || keyFor(providerId);
    const next = [...settings.models.filter((model) => model.id !== id), { id, label: id, description: "Added by you", url, providerId }];
    setSettings((current) => ({ ...current, models: next, keys: key ? { ...current.keys, [providerId]: key } : current.keys }));
    setProbe((current) => { const copy = { ...current }; delete copy[id]; return copy; });
  }

  function removeModel(id: string) {
    if (settings.models.length < 2) return;
    const next = settings.models.filter((model) => model.id !== id);
    applyModels(next, settings.defaultModel === id ? next[0].id : settings.defaultModel);
  }

  function printDocument() {
    document.body.classList.add("printDoc");
    const clear = () => { document.body.classList.remove("printDoc"); window.removeEventListener("afterprint", clear); };
    window.addEventListener("afterprint", clear);
    window.print();
    window.setTimeout(clear, 4000);
  }

  /** The assistant serves the card itself, in the portal's design, and prints it. */
  function openCard(doc?: CardDoc, portal = false) {
    if (!doc?.student) { printDocument(); return; }
    const query = new URLSearchParams({ card: doc.student, class: doc.classKey, term: doc.term || "", session: doc.session || "", print: "1", chat: activeThread?.id || "" });
    const href = portal
      ? `${(config?.results_url || "https://wts-result-system.vercel.app").replace(/\/$/, "")}/portal_core.html?${query}`
      : `/api/assistant?${query}`;
    const win = window.open(href, "_blank");
    if (win) win.opener = null;
    else setNotice("Allow pop-ups to open the report card.");
  }

  /**
   * Saves the card into Downloads. The phone app cannot download a blob URL (its
   * download manager only takes http), so the link is the real endpoint; the app
   * hands that to its download manager, a browser saves it directly.
   */
  async function saveCard(doc?: CardDoc) {
    if (!doc?.student) return;
    const file = cardFile(doc);
    setNotice("Preparing the PDF…");
    try {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => link.remove(), 30000);
      setNotice(`Saving ${file.name} to Downloads. If nothing arrives, tap Open to print.`);
    } catch {
      setNotice("The card could not be saved. Tap Open to print instead.");
    }
  }

  /** The card as a real file link, so the phone saves it into Downloads itself. */
  function cardFile(doc: CardDoc) {
    const clean = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    const query = new URLSearchParams({ card: doc.student, class: doc.classKey, term: doc.term || "", session: doc.session || "", format: "pdf" });
    return {
      name: `report-card-${clean(doc.name || doc.student)}-${clean(doc.term || "")}.pdf`,
      url: `/api/assistant?${query}`,
    };
  }

  async function testModel(model: Model) {
    const id = model.id;
    const providerId = model.providerId || settings.providerId;
    const key = (form.id === id ? form.key.trim() : "") || keyFor(providerId);
    const url = model.url || settings.providerUrl || DEFAULT_URL;
    if (!key) { setTest({ state: "fail", message: "Paste the API key first." }); return; }
    setProbe((current) => ({ ...current, [id]: "testing" }));
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", model: id, provider_key: key, provider_url: url }) });
      const value = await response.json();
      setProbe((current) => ({ ...current, [id]: value?.ok ? "works" : value?.code === "ASSISTANT_MODEL_BUSY" || value?.code === "ASSISTANT_MODEL_RATE_LIMITED" ? "busy" : "failed" }));
    } catch { setProbe((current) => ({ ...current, [id]: "failed" })); }
  }

  function keyFor(providerId: string) {
    return settings.keys?.[providerId] || (settings.providerId === providerId ? settings.providerKey : "");
  }

  function useModel(model: Model) {
    const providerId = model.providerId || settings.providerId;
    const url = model.url || settings.providerUrl;
    // No key for that provider means the school server's own key is used.
    const key = keyFor(providerId);
    setSettings((current) => ({ ...current, defaultModel: model.id, providerId, providerUrl: url, providerKey: key }));
    setForm((current) => ({ ...current, id: model.id, provider: providerId, url, key: "" }));
    setSavedFlash(true); window.setTimeout(() => setSavedFlash(false), 1600);
  }

  function pushUsage(next: Stored) {
    fetch("/api/assistant", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "usage", usage: { percent: next.usagePercent, cost: next.perReplyCost, days: next.usageDays, until: next.usageUntil } }),
    }).catch(() => null);
  }

  function startAllowance() {
    const days = Math.max(1, Math.min(365, Number(settings.usageDays) || 30));
    const next = { ...settings, usagePercent: 100, usageDays: days, usageUntil: Date.now() + days * 86400000 };
    setSettings(next); pushUsage(next);
    setNotice(`Allowance reset to 100% and set to last ${days} day${days === 1 ? "" : "s"}.`);
  }

  function removeKey() {
    setSettings((current) => ({ ...current, providerKey: "" }));
    setForm((current) => ({ ...current, key: "" }));
    setTest({ state: "pass", message: "The stored key was removed from this device." });
  }

  async function runTest() {
    const id = form.id.trim() || settings.defaultModel;
    const key = form.key.trim() || settings.providerKey;
    const url = form.url.trim() || settings.providerUrl || DEFAULT_URL;
    if (!key) { setTest({ state: "fail", message: "Paste the API key first." }); return; }
    setTest({ state: "running", message: "Testing the connection…" });
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", model: id, provider_key: key, provider_url: url }) });
      const value = await response.json();
      if (value?.ok) setTest({ state: "pass", message: `Connected in ${value.ms} ms. The key and model work.` });
      else if (value?.code === "ASSISTANT_MODEL_UNAVAILABLE") { setTest({ state: "fail", message: ERRORS[value.code] }); await fetchModels(); }
      else setTest({ state: "fail", message: `${ERRORS[value?.code] || "Connection failed."}${saidText(value?.detail)}` });
    } catch {
      setTest({ state: "fail", message: "The test could not run. Check your connection." });
    }
  }

  async function fetchModels() {
    const key = form.key.trim() || keyFor(form.provider) || settings.providerKey;
    const url = form.url.trim() || settings.providerUrl || DEFAULT_URL;
    if (!key) { setTest({ state: "fail", message: "Paste the API key first." }); return; }
    setFetchingModels(true);
    setTest({ state: "idle", message: "" });
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "models", provider_key: key, provider_url: url }) });
      const value = await response.json();
      if (value?.ok && Array.isArray(value.models)) {
        setModelList(value.models);
        if (value.models.length && !value.models.includes(form.id.trim())) setForm((current) => ({ ...current, id: value.models[0] }));
        setTest(value.models.length ? { state: "pass", message: `${value.models.length} model${value.models.length === 1 ? "" : "s"} available to this key. Pick one below.` } : { state: "fail", message: "That key returned no text models." });
      } else {
        setTest({ state: "fail", message: value?.detail ? `${ERRORS[value.code] || "Could not list models."} ${value.detail}` : ERRORS[value?.code] || "Could not list models." });
      }
    } catch {
      setTest({ state: "fail", message: "The model list could not be fetched. Check your connection." });
    } finally { setFetchingModels(false); }
  }

  async function testSaved() {
    if (!settings.providerKey) { setTest({ state: "fail", message: "No key is saved on this device yet. Paste one and press Save model." }); return; }
    setTest({ state: "running", message: "" });
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", provider_key: settings.providerKey, provider_url: settings.providerUrl, model: settings.defaultModel }) });
      const value = await response.json();
      if (value?.ok) setTest({ state: "pass", message: `The saved key and address answered in ${value.ms} ms through ${hostOf(settings.providerUrl || DEFAULT_URL)}.` });
      else setTest({ state: "fail", message: `${ERRORS[value?.code] || "The saved setting failed."}${value?.detail ? ` ${String(value.detail).slice(0, 180)}` : ""}` });
    } catch { setTest({ state: "fail", message: "The test could not reach the school server. Check your connection." }); }
  }

  function changeUsage(field: "usagePercent" | "perReplyCost", raw: string) {
    const value = Number(raw);
    setSettings((current) => {
      const next = { ...current, [field]: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0 };
      pushUsage(next);
      return next;
    });
  }

  async function send(event?: FormEvent, prompt?: string) {
    event?.preventDefault();
    const content = (prompt || draft).trim();
    if (!content || busy || !activeThread) return;
    if (!config?.is_admin && settings.usagePercent <= 0) { setNotice("The allowance is empty. Reset it in Usage to continue."); setTab("usage"); return; }
    const updated = [...activeThread.messages, { role: "user", content } as Message];
    updateThread(activeThread.id, updated);
    setDraft("");
    await run(activeThread.id, updated);
  }

  function jobKey() {
    return config?.person?.id ? `wts-assistant-job:${config.person.id}` : "";
  }

  function waitVisibleOr(ms: number) {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVis);
        resolve();
      };
      const onVis = () => { if (!document.hidden) finish(); };
      const timer = window.setTimeout(finish, ms);
      document.addEventListener("visibilitychange", onVis);
    });
  }

  /** Starts the job on the server and polls for the answer, so minimizing never kills the work. */
  async function run(threadId: string, messages: Message[], existingJobId?: string, startedAt?: number) {
    const key = jobKey();
    const started = startedAt || Date.now();
    let jobId = existingJobId || "";
    if (key) localStorage.setItem(key, JSON.stringify({ threadId, messages, started, jobId: jobId || undefined } satisfies Job));
    let settled = false;
    setBusy(true); setBusyThread(threadId); setNotice("");
    const host = hostOf(settings.providerUrl || DEFAULT_URL);

    const deliver = (value: Record<string, unknown>) => {
      const answer = String(value.text || "Done.");
      const doc = value.document && typeof value.document === "object" ? value.document as CardDoc : undefined;
      updateThread(threadId, [...messages, { role: "assistant", content: answer, doc }]);
      const approvalObj = value.approval as { approval_token?: string; summary?: string } | undefined;
      if (approvalObj?.approval_token) setApproval({ token: approvalObj.approval_token, summary: approvalObj.summary || "Confirm this change." });
      // The server charges the proprietor's own answers and returns the new
      // balance, so a developer test never moves it.
      const charged = value.usage as { percent?: unknown } | undefined;
      if (!config?.is_admin && typeof charged?.percent === "number") {
        setSettings((current) => ({ ...current, usagePercent: Math.max(0, Math.min(100, charged.percent as number)) }));
      }
      settled = true;
      setNotice("");
      announce(threadId, doc ? `Report card ready${doc.name ? `: ${doc.name}` : ""}` : "Answer ready", answer);
    };

    try {
      if (!jobId) {
        let startValue: Record<string, unknown> | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await fetch("/api/assistant", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(25000),
              body: JSON.stringify({
                async: true,
                model: settings.defaultModel,
                messages,
                provider_key: config?.is_admin ? settings.providerKey : "",
                provider_url: config?.is_admin ? settings.providerUrl : "",
                effort: settings.effort,
              }),
            });
            startValue = await response.json();
            if (!response.ok || !startValue?.ok) {
              const code = String(startValue?.code || "ASSISTANT_REQUEST_FAILED");
              throw new Error(`${ERRORS[code] || "The request failed."}${saidText(startValue?.detail)}`);
            }
            break;
          } catch (caught) {
            const isNet = caught instanceof TypeError || (caught instanceof DOMException && caught.name === "TimeoutError");
            if (attempt === 0 && isNet) {
              await waitVisibleOr(1200);
              continue;
            }
            throw caught;
          }
        }
        if (startValue && typeof startValue.text === "string") {
          deliver(startValue);
          return;
        }
        jobId = String(startValue?.job_id || "");
        if (!jobId) throw new Error(ERRORS["ASSISTANT_REQUEST_FAILED"]);
        if (key) localStorage.setItem(key, JSON.stringify({ threadId, messages, started, jobId } satisfies Job));
      }

      let firstPoll = true;
      // The function itself stops at 60 s; a little more lets its last write land.
      while (Date.now() - started < 75000) {
        await waitVisibleOr(document.hidden ? 8000 : firstPoll ? 900 : 1600);
        firstPoll = false;
        let response: Response;
        try {
          response = await fetch(`/api/assistant?job=${encodeURIComponent(jobId)}`, {
            credentials: "same-origin",
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
          });
        } catch {
          // Minimizing the app or a brief network drop pauses polling cleanly without failing.
          continue;
        }
        const value = await response.json().catch(() => null) as Record<string, unknown> | null;
        if (response.status === 401 || response.status === 403) {
          const code = String(value?.code || "STAFF_SESSION_NOT_ACTIVE");
          throw new Error(ERRORS[code] || "Your sign-in expired. Reload the page and sign in again.");
        }
        if (!response.ok || !value) continue;
        if (value.ok === false) {
          const code = String(value.code || "ASSISTANT_REQUEST_FAILED");
          if (code === "ASSISTANT_JOB_NOT_FOUND") throw new Error("That request expired. Send it again.");
          throw new Error(ERRORS[code] || "The request failed.");
        }
        if (value.status === "running") continue;
        if (value.status === "done" || value.status === "error") {
          const payload = (value.result && typeof value.result === "object" ? value.result : {}) as Record<string, unknown>;
          if (!payload.ok) {
            const code = String(payload.code || "ASSISTANT_REQUEST_FAILED");
            throw new Error(`${ERRORS[code] || "The request failed."}${saidText(payload.detail)}`);
          }
          deliver(payload);
          return;
        }
      }
      throw new Error(`${host} did not answer in time, so the request was stopped. Try again.`);
    } catch (error) {
      settled = true;
      const failed = error instanceof Error && error.message && !error.message.startsWith("ASSISTANT_")
        ? error.message
        : `${ERRORS["ASSISTANT_REQUEST_FAILED"]} The server was ${host}.`;
      setNotice("The last answer failed. Send it again, or pick another model in Models.");
      updateThread(threadId, [...messages, { role: "assistant", content: failed, failed: true }]);
    } finally {
      if (key && settled) localStorage.removeItem(key);
      setBusy(false); setBusyThread("");
    }
  }

  /** Tells the proprietor outside the page when an answer lands while they are away. */
  function announce(threadId: string, title: string, body: string) {
    const away = document.hidden || tabRef.current !== "chats" || activeRef.current !== threadId;
    if (!away) return;
    document.title = `● ${title} · WTS Assistant`;
    if (notifyRef.current !== "on") return;
    try { navigator.vibrate?.([120, 70, 120]); } catch { /* ignore */ }
    if ("Notification" in window && Notification.permission !== "granted") return;
    const clean = body.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
    show(title, clean, threadId).catch(() => { /* the title and the buzz already told them */ });
  }

  /** A real phone notice, through the page worker first so it also shows when the app is in the background. */
  async function show(title: string, body: string, threadId: string) {
    const options: NotificationOptions = {
      body,
      tag: "wts-assistant",
      icon: "/images/logo.webp",
      data: { url: `/assistant?chat=${threadId}` },
    };
    const ready = "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration("/assistant-sw.js").catch(() => undefined)
      : undefined;
    if (ready) { await ready.showNotification(title, options); return; }
    const note = new Notification(title, options);
    note.onclick = () => { window.focus(); note.close(); };
  }

  async function toggleNotify() {
    if (notify === "on") {
      setNotify("off");
      if (config?.person?.id) localStorage.setItem(`wts-assistant-notify:${config.person.id}`, "off");
      return;
    }
    if (!("Notification" in window)) {
      setNotify("on");
      if (config?.person?.id) localStorage.setItem(`wts-assistant-notify:${config.person.id}`, "on");
      try {
        await show("Alerts are on", "You will be told here when an answer is ready.", activeRef.current || "");
        setNotice("Notifications are on. An answer that lands while you are away now shows a phone notice.");
      } catch {
        setNotice("Alerts are on. This browser has no pop-up notices, so the tab title flags the answer and the phone buzzes.");
      }
      return;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") { setNotify("denied"); setNotice("The browser blocked notifications. Allow them in the site settings."); return; }
    setNotify("on");
    if (config?.person?.id) localStorage.setItem(`wts-assistant-notify:${config.person.id}`, "on");
    try {
      await show("Alerts are on", "You will be told here when an answer is ready.", activeRef.current || "");
      setNotice("Notifications are on. An answer that lands while you are away now shows a phone notice.");
    } catch {
      setNotice("Alerts are on. The tab title flags the answer and the phone buzzes.");
    }
  }

  async function confirm() {
    if (!approval || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approval_token: approval.token }) });
      const value = await response.json();
      if (!response.ok || !value?.ok) throw new Error(String(value?.code || "CHANGE_FAILED"));
      if (activeThread) {
        const result = (value.completed?.result || {}) as { ok?: boolean; code?: string; error_detail?: string };
        const line = result.ok
          ? `Done. ${value.completed?.summary || approval.summary}`
          : `Not saved: ${result.code || "unknown error"}${result.error_detail ? ` — ${result.error_detail}` : ""}.`;
        updateThread(activeThread.id, [...activeThread.messages, { role: "assistant", content: line }]);
      }
      setApproval(null);
    } catch { setNotice("The confirmation failed. Refresh the record and try again."); }
    finally { setBusy(false); }
  }

  if (!config) {
    return <main className="assistantGate">
      <div className="assistantGateCard">
        <img src="/images/logo.webp" alt="" />
        <p className="assistantEyebrow">WAY TO SUCCESS</p>
        <h1>{loadError ? "Access check" : "Opening your workspace"}</h1>
        <p>{(loadError || "Checking your signed-in account…").replace(/^(ACCESS|SLOW):/, "")}</p>
        {loadError.startsWith("SLOW:") && <button type="button" onClick={() => window.location.reload()}>Try again</button>}
        {loadError && !loadError.startsWith("SLOW:") && <a href="/portal/sign-in?return_to=%2Fassistant">Sign in to the Staff Portal</a>}
        {loadError.startsWith("SLOW:") && <a href="/portal/sign-in?return_to=%2Fassistant">Sign in again instead</a>}
      </div>
    </main>;
  }

  return <main className="assistantShell">
    <aside className={`assistantSidebar ${drawer ? "open" : ""}`}>
      <div className="assistantBrand"><img src="/images/logo.webp" alt=""/><div><strong>Way to Success</strong><span>{config.is_admin ? "Developer workspace" : "Proprietor workspace"}</span></div></div>
      <button className="assistantNew" type="button" onClick={newChat}><span>＋</span> New chat</button>

      <nav className="assistantNav" aria-label="Workspace">
        <button type="button" className={tab === "chats" ? "selected" : ""} onClick={() => setTab("chats")}>Chats</button>
        {config.is_admin && <button type="button" className={tab === "models" ? "selected" : ""} onClick={() => { setTab("models"); setForm((current) => ({ ...current, id: current.id || settings.defaultModel, provider: settings.providerId, effort: settings.effort })); }}>Models</button>}
        {<button type="button" className={tab === "usage" ? "selected" : ""} onClick={() => setTab("usage")}>Usage</button>}
      </nav>
      <div className="assistantChatList">
        <p className="assistantListLabel">Your chats</p>
        {threads.map((thread) => <div key={thread.id} className={`assistantChatRow ${thread.id === activeId ? "active" : ""}`}>
          <button type="button" className="assistantChatOpen" onClick={() => { setActiveId(thread.id); setApproval(null); setTab("chats"); setDrawer(false); }}>{thread.id === busyThread && <i className="assistantWorkDot" aria-label="Working"/>}{thread.title || "New chat"}</button>
          <button type="button" className="assistantChatDelete" aria-label="Delete chat" onClick={() => removeThread(thread.id)}>×</button>
        </div>)}
      </div>
      <div className="assistantSidebarFoot">
        <span>Chats are separate for every account.</span>
        <a href="/workspace">Staff Portal</a>
      </div>
    </aside>
    {drawer && <button className="assistantScrim" type="button" aria-label="Close menu" onClick={() => setDrawer(false)}/>}

    <section className="assistantMain">
      <header className="assistantTopbar">
        <button className="assistantMenu" type="button" aria-label="Open chats" onClick={() => setDrawer((open) => !open)}>☰</button>
        <div className="assistantTitles">
          <p className="assistantEyebrow">PRIVATE ASSISTANT</p>
          <h1>{tab === "chats" ? `Good day, ${name}` : tab === "models" ? "Models" : "Usage"}</h1>
        </div>
      </header>

      {tab === "chats" && <>
        <div className="assistantConversation">
          {!activeThread?.messages.length && <div className="assistantWelcome">
            <span className="assistantOrb">✦</span>
            <p className="assistantEyebrow">YOUR SCHOOL'S VIRTUAL STAFF</p>
            <h2>Always here for the school.</h2>
            <p>Ask for figures, a pupil record, or a change to save — any hour, any day. Bring a rough idea for the school as well and we will think it through together.</p>
            <div className="assistantOnDuty">
              <div className="assistantOnDutyHead"><span className="assistantPulse"/>On duty now</div>
              <p>I never close, never rush you, and always check live records before I answer. Type below whenever you are ready.</p>
            </div>
          </div>}
          {activeThread?.messages.map((message, index) => {
            const doc = message.doc;
            return <article key={`${message.role}-${index}`} className={`assistantMessage ${message.role}${message.doc || message.document ? " printable" : ""}`}>
              <div className="assistantWho">{message.role === "user" ? "You" : "WTS"}</div>
              <div className={`assistantBubble${message.failed ? " failed" : ""}`}>{renderBlocks(message.content)}</div>
              {(message.doc || message.document) && <div className="assistantDocActions">
                {doc?.student
                  ? <button type="button" className="assistantDocPrint" onClick={() => saveCard(doc)}>Save report card</button>
                  : <button type="button" className="assistantDocPrint" onClick={() => openCard(doc)}>Print the report card</button>}
                {doc?.student && <button type="button" className="assistantDocLink" onClick={() => openCard(doc)}>Open to print</button>}
                {doc?.student && <button type="button" className="assistantDocLink" onClick={() => openCard(doc, true)}>Open in portal</button>}
              </div>}
            </article>;
          })}
          {busy && busyThread === activeThread?.id && <article className="assistantMessage assistant"><div className="assistantWho">WTS</div><div className="assistantBubble assistantThinking"><i/><i/><i/><span className="assistantWait">{elapsed < 5 ? "Working" : `Working · ${elapsed}s`}</span></div></article>}
          {busy && busyThread && busyThread !== activeThread?.id && <p className="assistantMuted assistantElsewhere">Still working in another chat. You can keep reading here.</p>}
          <div ref={endRef}/>
        </div>
        {approval && <div className="assistantApproval"><div><strong>Confirm this change</strong><span>{approval.summary}</span></div><div className="assistantApprovalActions"><button type="button" onClick={() => setApproval(null)}>Cancel</button><button type="button" onClick={confirm} disabled={busy}>Confirm</button></div></div>}
        {notice && <div className="assistantNotice" role="status">{notice}</div>}
        <form className="assistantComposer" onSubmit={send}>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message the assistant…" rows={1} aria-label="Message"/>
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send">↑</button>
          {!config.is_admin && <small>{`${settings.usagePercent.toFixed(0)}% allowance left`}</small>}
          <button type="button" className={`assistantBell${notify === "on" ? " on" : ""}`} onClick={toggleNotify} aria-pressed={notify === "on"} title="Tell me here when the answer is ready">{notify === "on" ? "🔔 Notify me" : "🔕 Notify me"}</button>
        </form>
      </>}

      {tab === "models" && <div className="assistantPane">
        <div className="assistantCard">
          <h2>Connection</h2>
          <p className="assistantMuted">The key is kept on this device for your account only and sent only when you ask something. It is never shown to other accounts.</p>
          <p className={`assistantMuted assistantSaved ${settings.providerKey ? "" : "empty"}`}>In use now: {settings.providerKey ? `key ending ${settings.providerKey.slice(-4)}` : "no key saved"} at {hostOf(settings.providerUrl || DEFAULT_URL)} · model {settings.defaultModel}</p>
          <div className="assistantPair">
            <label><span>Provider</span><select value={form.provider} onChange={(event) => {
              const provider = PROVIDERS.find((item) => item.id === event.target.value);
              setForm((current) => ({ ...current, provider: event.target.value, url: provider?.url || current.url, id: "", key: "" }));
              setModelList([]); setProbe({}); setTest({ state: "idle", message: "" });
            }}>{PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}</select></label>
            <label><span>Model</span><input list="assistantModelChoices" placeholder={config?.default_model || "deepseek-v4.1-flash"} value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })}/><datalist id="assistantModelChoices">{modelList.map((id) => <option key={id} value={id} />)}</datalist></label>
          </div>
          <div className="assistantPair">
            <label><span>Base URL (optional)</span><input type="url" inputMode="url" placeholder={config?.default_url || DEFAULT_URL} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })}/></label>
            <label><span>Effort</span><select value={form.effort} onChange={(event) => setForm({ ...form, effort: event.target.value as Effort })}>{EFFORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>
          <label><span>API key</span><div className="assistantKeyRow"><input type={showKey ? "text" : "password"} autoComplete="new-password" placeholder={settings.providerKey ? `stored …${settings.providerKey.slice(-4)}` : "sk-…"} value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })}/><button type="button" onClick={() => setShowKey((shown) => !shown)}>{showKey ? "Hide" : "Show"}</button></div>{settings.providerKey && <em>A key ending {settings.providerKey.slice(-4)} is stored. Leave empty to keep it.</em>}</label>
          <div className="assistantActions">
            <button type="button" className="assistantPrimary" onClick={saveModel}>Save</button>
            <button type="button" className="assistantGhost" onClick={fetchModels} disabled={fetchingModels}>{fetchingModels ? "Listing…" : "List models"}</button>
            <button type="button" className="assistantGhost" onClick={runTest} disabled={test.state === "running"}>{test.state === "running" ? "Testing…" : "Test route"}</button>
            {settings.providerKey && <button type="button" className="assistantRemove" onClick={removeKey}>Remove key</button>}
          </div>
          {test.state !== "idle" && <div className={`assistantTest ${test.state}`}>{test.message}</div>}
          {savedFlash && <div className="assistantTest pass">Saved. It is now the model in use.</div>}
        </div>
        <div className="assistantCard">
          <h2>Your models</h2>
          <p className="assistantMuted">Only the models you pick stay here. Use powers the assistant; Test checks that route. Green answered, amber is busy, red failed.</p>
          {!settings.models.length && <p className="assistantTest fail">No model saved yet. Add one below, or type a model above and press Save.</p>}
          <div className="assistantModelList">
            {settings.models.map((model) => {
              const state = probe[model.id];
              return <div key={model.id} className={`assistantModelRow ${state || ""}`}>
                <div className="assistantModelBody">
                  <b>{model.label}</b>
                  <small>{model.id} · {hostOf(model.url || settings.providerUrl || DEFAULT_URL)}{settings.defaultModel === model.id ? " · in use" : ""}{state === "works" ? " · works" : state === "busy" ? " · busy, try again" : state === "failed" ? " · failed" : ""}</small>
                </div>
                <button type="button" className="assistantModelPick" onClick={() => useModel(model)} disabled={settings.defaultModel === model.id}>{settings.defaultModel === model.id ? "In use" : "Use"}</button>
                <button type="button" className="assistantModelTest" onClick={() => testModel(model)} disabled={state === "testing"}>{state === "testing" ? "…" : "Test"}</button>
                {settings.models.length > 1 && <button type="button" className="assistantRemove" onClick={() => removeModel(model.id)}>Remove</button>}
              </div>;
            })}
          </div>
          <p className="assistantMuted">Current endpoint: {settings.providerUrl || DEFAULT_URL}</p>
        </div>
        <div className="assistantCard">
          <h2>Add a model from this key</h2>
          <p className="assistantMuted">List what {hostOf(form.url || settings.providerUrl || DEFAULT_URL)} reaches, then add the one you want. Nothing else is added.</p>
          <div className="assistantActions"><button type="button" className="assistantGhost" onClick={fetchModels} disabled={fetchingModels}>{fetchingModels ? "Listing…" : "List models"}</button></div>
          {!!modelList.length && <div className="assistantModelList">
            {modelList.filter((id) => !settings.models.some((model) => model.id === id && (model.providerId || settings.providerId) === form.provider)).map((id) => <div key={id} className="assistantModelRow">
              <div className="assistantModelBody"><b>{id}</b><small>{hostOf(form.url || settings.providerUrl || DEFAULT_URL)}</small></div>
              <button type="button" className="assistantModelPick" onClick={() => addModel(id)}>Add</button>
            </div>)}
            {modelList.every((id) => settings.models.some((model) => model.id === id && (model.providerId || settings.providerId) === form.provider)) && <p className="assistantMuted">Every model this key returned is already in your list.</p>}
          </div>}
        </div>
      </div>}

      {tab === "usage" && <div className="assistantPane">
        <div className="assistantCard">
          <h2>Usage balance</h2>
          {config.is_admin && <p className="assistantMuted">The balance counts down as the account answers. You set the level and the cost below.</p>}
          <div className="assistantMeter">
            <div className="assistantRing" style={{ ["--usage" as string]: `${settings.usagePercent}%` }}><span>{Math.round(settings.usagePercent)}%</span></div>
            <div><strong>{settings.usagePercent <= 0 ? "Empty" : "Remaining"}</strong><small>{settings.usagePercent <= 20 && settings.usagePercent > 0 ? "Running low" : config.is_admin ? "Manual balance for this account" : "Your balance"}</small></div>
          </div>
          {config.is_admin && <>
            <div className="assistantPair">
              <label><span>Balance (%)</span><input type="number" min="0" max="100" step="1" value={settings.usagePercent} onChange={(event) => changeUsage("usagePercent", event.target.value)} /></label>
              <label><span>Cost per answer (%)</span><input type="number" min="0" max="100" step="0.5" value={settings.perReplyCost} onChange={(event) => changeUsage("perReplyCost", event.target.value)} /></label>
            </div>
            <label><span>Lasts for (days)</span><input type="number" min="1" max="365" step="1" value={settings.usageDays} onChange={(event) => setSettings((current) => ({ ...current, usageDays: Math.max(1, Math.min(365, Number(event.target.value) || 1)) }))} /></label>
            <p className="assistantMuted">{settings.usageUntil ? `This allowance runs until ${new Date(settings.usageUntil).toLocaleDateString()} (${Math.max(0, Math.ceil((settings.usageUntil - Date.now()) / 86400000))} day(s) left).` : "No end date set yet. Start the allowance to date it."} It is shared. Developer chats are free; only the proprietor's answers use it.</p>
            <div className="assistantActions"><button type="button" className="assistantPrimary" onClick={startAllowance}>Start fresh at 100%</button><button type="button" className="assistantGhost" onClick={() => { const next = { ...settings, usagePercent: 100 }; setSettings(next); pushUsage(next); }}>Set balance to 100%</button></div>
          </>}
        </div>
      </div>}
    </section>

    <nav className="assistantTabbar" aria-label="Workspace">
      <button type="button" className={tab === "chats" ? "selected" : ""} onClick={() => setTab("chats")}>Chats</button>
      {config.is_admin && <button type="button" className={tab === "models" ? "selected" : ""} onClick={() => { setTab("models"); setForm((current) => ({ ...current, id: current.id || settings.defaultModel, provider: settings.providerId, effort: settings.effort })); }}>Models</button>}
      {<button type="button" className={tab === "usage" ? "selected" : ""} onClick={() => setTab("usage")}>Usage</button>}
    </nav>
  </main>;
}
