"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; failed?: boolean; document?: boolean };
type Model = { id: string; label: string; description?: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number };
type Person = { id?: string; full_name?: string };
type AssistantConfig = { configured: boolean; models: Model[]; default_model: string; default_url: string; is_admin: boolean; person?: Person };
type TestState = { state: "idle" | "running" | "pass" | "fail"; message: string };

const DEFAULT_URL = "https://api.deepseek.com";

function hostOf(value: string) {
  try { return new URL(value).host; } catch { return value; }
}
const FALLBACK_MODELS: Model[] = [
  { id: "deepseek-chat", label: "DeepSeek Chat", description: "Everyday school requests" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", description: "Longer reasoning tasks" },
];
const STARTERS = [
  "How many active students do we have in each class?",
  "Show the current school dashboard.",
  "Find a student and show their class and result status.",
  "Show today's staff on duty.",
];

const ERRORS: Record<string, string> = {
  ASSISTANT_MODEL_KEY_REJECTED: "The API key was rejected. Check the key in Models.",
  ASSISTANT_MODEL_NOT_FOUND: "The model name was not found. Check the model ID in Models.",
  ASSISTANT_MODEL_UNAVAILABLE: "This key cannot reach that model. Fetch the models the key supports and pick one.",
  ASSISTANT_MODEL_RATE_LIMITED: "The provider is limiting requests. Wait a moment and try again.",
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
  providerUrl: string;
  providerId: string;
  effort: Effort;
  usagePercent: number;
  perReplyCost: number;
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
    .map((item) => ({ id: String((item as Model).id || "").trim(), label: String((item as Model).label || "").trim(), description: String((item as Model).description || "") }))
    .filter((item) => item.id);
  return clean.length ? clean : fallback;
}

function readStored(key: string, config: AssistantConfig): Stored {
  const fallback: Stored = {
    models: config.models?.length ? config.models : FALLBACK_MODELS,
    defaultModel: config.default_model || FALLBACK_MODELS[0].id,
    providerKey: "",
    providerUrl: config.default_url || DEFAULT_URL,
    providerId: providerOf(config.default_url || DEFAULT_URL),
    effort: "low",
    usagePercent: 100,
    perReplyCost: 1,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null") as Partial<Stored> | null;
    if (!saved) return fallback;
    const models = sanitiseModels(saved.models, fallback.models);
    const defaultModel = models.some((model) => model.id === saved.defaultModel) ? String(saved.defaultModel) : models[0].id;
    return {
      models,
      defaultModel,
      providerKey: typeof saved.providerKey === "string" ? saved.providerKey : "",
      providerUrl: typeof saved.providerUrl === "string" && saved.providerUrl ? saved.providerUrl : fallback.providerUrl,
      providerId: typeof saved.providerId === "string" && PROVIDERS.some((provider) => provider.id === saved.providerId) ? saved.providerId : providerOf(saved.providerUrl || fallback.providerUrl),
      effort: saved.effort === "medium" || saved.effort === "high" ? saved.effort : "low",
      usagePercent: Number.isFinite(saved.usagePercent) ? Math.max(0, Math.min(100, Number(saved.usagePercent))) : 100,
      perReplyCost: Number.isFinite(saved.perReplyCost) ? Math.max(0, Math.min(100, Number(saved.perReplyCost))) : 1,
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
  const [settings, setSettings] = useState<Stored>({ models: FALLBACK_MODELS, defaultModel: FALLBACK_MODELS[0].id, providerKey: "", providerUrl: DEFAULT_URL, providerId: "yeta", effort: "low", usagePercent: 100, perReplyCost: 1 });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [tab, setTab] = useState<"chats" | "models" | "usage">("chats");
  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [approval, setApproval] = useState<{ token: string; summary: string } | null>(null);
  const [form, setForm] = useState({ id: "", label: "", url: DEFAULT_URL, key: "", provider: "yeta", effort: "low" as Effort });
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ state: "idle", message: "" });
  const [savedFlash, setSavedFlash] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/assistant", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok || !value?.ok) throw new Error(String(value?.code || "ASSISTANT_UNAVAILABLE"));
        const personId = String(value.person?.id || "signed-in-user");
        setConfig(value as AssistantConfig);
        const settingsKey = `wts-assistant-settings:${personId}`;
        const chatKey = `wts-assistant-chats:${personId}`;
        setStoredKey(settingsKey);
        const loaded = readStored(settingsKey, value as AssistantConfig);
        setSettings(loaded);
        setForm({ id: "", label: "", url: loaded.providerUrl, key: loaded.providerKey, provider: loaded.providerId, effort: loaded.effort });
        let list: Thread[] = [];
        try {
          const raw = JSON.parse(localStorage.getItem(chatKey) || "[]");
          if (Array.isArray(raw)) list = raw.filter((item) => item && typeof item === "object").slice(0, 60);
        } catch { list = []; }
        if (!list.length) list = [{ id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() }];
        setThreads(list);
        setActiveId(list[0].id);
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
        setLoadError(code === "PROPRIETOR_ACCESS_REQUIRED" ? "This account does not have proprietor or developer access." : "Your session could not be verified. Please sign in to the Staff Portal.");
      });
  }, []);

  useEffect(() => { if (stored) localStorage.setItem(stored, JSON.stringify(settings)); }, [settings, stored]);
  useEffect(() => {
    if (!config?.person?.id || !threads.length) return;
    localStorage.setItem(`wts-assistant-chats:${config.person.id}`, JSON.stringify(threads));
  }, [threads, config]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [activeId, threads]);

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
    setThreads((current) => current
      .map((thread) => thread.id === id
        ? { ...thread, messages, title: thread.title === "New chat" && messages[0]?.role === "user" ? messages[0].content.slice(0, 46) : thread.title, updatedAt: Date.now() }
        : thread)
      .sort((a, b) => b.updatedAt - a.updatedAt));
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
    const next = [...settings.models.filter((model) => model.id !== id), { id, label, description: "Added by you" }];
    if (!key && !settings.providerKey) { setTest({ state: "fail", message: "Paste the API key for this provider." }); return; }
    setSettings((current) => ({ ...current, models: next, defaultModel: id, providerUrl: url, providerKey: key || current.providerKey, providerId: form.provider, effort: form.effort }));
    setSavedFlash(true); window.setTimeout(() => setSavedFlash(false), 1600);
    setTest({ state: "idle", message: "" });
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
      else setTest({ state: "fail", message: value?.detail ? `${ERRORS[value.code] || "Connection failed."} ${value.detail}` : ERRORS[value?.code] || "Connection failed." });
    } catch {
      setTest({ state: "fail", message: "The test could not run. Check your connection." });
    }
  }

  async function fetchModels() {
    const key = form.key.trim() || settings.providerKey;
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
        setTest(value.models.length ? { state: "pass", message: `${value.models.length} model${value.models.length === 1 ? "" : "s"} available to this key. Pick one in Model ID.` } : { state: "fail", message: "That key returned no text models." });
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
    setSettings((current) => ({ ...current, [field]: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0 }));
  }

  async function send(event?: FormEvent, prompt?: string) {
    event?.preventDefault();
    const content = (prompt || draft).trim();
    if (!content || busy || !activeThread) return;
    if (settings.usagePercent <= 0) { setNotice("Usage balance is at 0%. Raise it in the Usage tab to continue."); setTab("usage"); return; }
    const threadId = activeThread.id;
    const host = hostOf(settings.providerUrl || DEFAULT_URL);
    const updated = [...activeThread.messages, { role: "user", content } as Message];
    updateThread(threadId, updated);
    setDraft(""); setBusy(true); setNotice("");
    const controller = new AbortController();
    const stop = window.setTimeout(() => controller.abort(), 100000);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.defaultModel,
          messages: updated,
          provider_key: config?.is_admin ? settings.providerKey : "",
          provider_url: config?.is_admin ? settings.providerUrl : "",
          effort: settings.effort,
        }),
      });
      const value = await response.json();
      if (!response.ok || !value?.ok) {
        const code = String(value?.code || "ASSISTANT_REQUEST_FAILED");
        const said = String(value?.detail || "").trim().slice(0, 180);
        throw new Error(`${ERRORS[code] || "The request failed."} The server was ${host}.${said ? ` It said: ${said}` : ""}`);
      }
      updateThread(threadId, [...updated, { role: "assistant", content: String(value.text || "Done."), document: value.document === true }]);
      if (value.approval?.approval_token) setApproval({ token: value.approval.approval_token, summary: value.approval.summary || "Confirm this change." });
      setSettings((current) => ({ ...current, usagePercent: Math.max(0, current.usagePercent - current.perReplyCost) }));
    } catch (error) {
      const failed = controller.signal.aborted
        ? `${host} did not answer within 100 seconds, so the request was stopped. Try again.`
        : error instanceof Error && error.message && !error.message.startsWith("ASSISTANT_")
          ? error.message
          : `${ERRORS["ASSISTANT_REQUEST_FAILED"]} The server was ${host}.`;
      setNotice(failed);
      updateThread(threadId, [...updated, { role: "assistant", content: failed, failed: true }]);
    } finally { window.clearTimeout(stop); setBusy(false); }
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
        <p>{loadError || "Checking your signed-in account…"}</p>
        {loadError && <a href="/portal/sign-in?return_to=%2Fassistant">Sign in to the Staff Portal</a>}
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
        {config.is_admin && <button type="button" className={tab === "usage" ? "selected" : ""} onClick={() => setTab("usage")}>Usage</button>}
      </nav>
      <div className="assistantChatList">
        <p className="assistantListLabel">Your chats</p>
        {threads.map((thread) => <div key={thread.id} className={`assistantChatRow ${thread.id === activeId ? "active" : ""}`}>
          <button type="button" className="assistantChatOpen" onClick={() => { setActiveId(thread.id); setApproval(null); setTab("chats"); setDrawer(false); }}>{thread.title || "New chat"}</button>
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
            <p className="assistantEyebrow">LIVE SCHOOL DATA · CONFIRMATION BEFORE CHANGES</p>
            <h2>What should we handle?</h2>
            <p>Ask about students, staff, classes, or results. I read live records and ask before saving a change.</p>
            <div className="assistantStarters">{STARTERS.map((prompt) => <button key={prompt} type="button" onClick={() => send(undefined, prompt)}><span>{prompt}</span><b>↗</b></button>)}</div>
          </div>}
          {activeThread?.messages.map((message, index) => <article key={`${message.role}-${index}`} className={`assistantMessage ${message.role}${message.document ? " printable" : ""}`}>
            <div className="assistantWho">{message.role === "user" ? "You" : "WTS"}</div>
            <div className={`assistantBubble${message.failed ? " failed" : ""}`}>{renderBlocks(message.content)}</div>
            {message.document && <button type="button" className="assistantDocPrint" onClick={printDocument}>Print this document</button>}
          </article>)}
          {busy && <article className="assistantMessage assistant"><div className="assistantWho">WTS</div><div className="assistantBubble assistantThinking"><i/><i/><i/></div></article>}
          <div ref={endRef}/>
        </div>
        {approval && <div className="assistantApproval"><div><strong>Confirm this change</strong><span>{approval.summary}</span></div><div className="assistantApprovalActions"><button type="button" onClick={() => setApproval(null)}>Cancel</button><button type="button" onClick={confirm} disabled={busy}>Confirm</button></div></div>}
        {notice && <div className="assistantNotice" role="status">{notice}</div>}
        <form className="assistantComposer" onSubmit={send}>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message the assistant…" rows={1} aria-label="Message"/>
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send">↑</button>
          <small>{settings.usagePercent.toFixed(0)}% usage left · answers use live school data</small>
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
              setForm((current) => ({ ...current, provider: event.target.value, url: provider?.url || current.url }));
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
          <h2>Available models</h2>
          <div className="assistantModelList">
            {settings.models.map((model) => <div key={model.id} className="assistantModelRow">
              <button type="button" className="assistantModelBody" onClick={() => setSettings((current) => ({ ...current, defaultModel: model.id }))}>
                <b>{model.label}</b>
                <small>{model.id}{model.id === settings.defaultModel ? " · in use" : ""}</small>
              </button>
              {settings.models.length > 1 && <button type="button" className="assistantRemove" onClick={() => removeModel(model.id)}>Remove</button>}
            </div>)}
          </div>
          <p className="assistantMuted">Current endpoint: {settings.providerUrl || DEFAULT_URL}</p>
        </div>
      </div>}

      {tab === "usage" && <div className="assistantPane">
        <div className="assistantCard">
          <h2>Usage balance</h2>
          <p className="assistantMuted">The balance counts down from the level you set. Each answer costs the amount below.</p>
          <div className="assistantMeter">
            <div className="assistantRing" style={{ ["--usage" as string]: `${settings.usagePercent}%` }}><span>{Math.round(settings.usagePercent)}%</span></div>
            <div><strong>{settings.usagePercent <= 0 ? "Empty" : "Remaining"}</strong><small>{settings.usagePercent <= 20 && settings.usagePercent > 0 ? "Running low" : "Manual balance for this account"}</small></div>
          </div>
          <div className="assistantPair">
            <label><span>Balance (%)</span><input type="number" min="0" max="100" step="1" value={settings.usagePercent} onChange={(event) => changeUsage("usagePercent", event.target.value)}/></label>
            <label><span>Cost per answer (%)</span><input type="number" min="0" max="100" step="0.5" value={settings.perReplyCost} onChange={(event) => changeUsage("perReplyCost", event.target.value)}/></label>
          </div>
          <div className="assistantActions"><button type="button" className="assistantPrimary" onClick={() => setSettings((current) => ({ ...current, usagePercent: 100 }))}>Reset to 100%</button></div>
        </div>
      </div>}
    </section>

    <nav className="assistantTabbar" aria-label="Workspace">
      <button type="button" className={tab === "chats" ? "selected" : ""} onClick={() => setTab("chats")}>Chats</button>
      {config.is_admin && <button type="button" className={tab === "models" ? "selected" : ""} onClick={() => { setTab("models"); setForm((current) => ({ ...current, id: current.id || settings.defaultModel, provider: settings.providerId, effort: settings.effort })); }}>Models</button>}
      {config.is_admin && <button type="button" className={tab === "usage" ? "selected" : ""} onClick={() => setTab("usage")}>Usage</button>}
    </nav>
  </main>;
}
