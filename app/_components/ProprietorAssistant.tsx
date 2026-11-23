"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Model = { id: string; label: string; description: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number };
type AssistantConfig = { configured: boolean; models: Model[]; default_model: string; is_admin: boolean; person?: { id?: string; full_name?: string } };
type LocalSettings = { models: Model[]; defaultModel: string; providerKey: string; providerUrl: string; usagePercent: number; perReplyCost: number };

const initialModels = [
  { id: "deepseek-chat", label: "DeepSeek Chat", description: "Quick everyday requests" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", description: "Longer reasoning tasks" },
];
const starters = ["How many active students do we have in each class?", "Show the current school dashboard.", "Find Fatai Waris and show his class and result status.", "Show SS3 students and their current results."];

function readSettings(key: string, fallback: AssistantConfig): LocalSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return {
      models: Array.isArray(saved?.models) && saved.models.length ? saved.models : fallback.models?.length ? fallback.models : initialModels,
      defaultModel: saved?.defaultModel || fallback.default_model || initialModels[0].id,
      providerKey: typeof saved?.providerKey === "string" ? saved.providerKey : "",
      providerUrl: typeof saved?.providerUrl === "string" ? saved.providerUrl : "https://api.deepseek.com/chat/completions",
      usagePercent: Number.isFinite(saved?.usagePercent) ? Math.max(0, Math.min(100, saved.usagePercent)) : 100,
      perReplyCost: Number.isFinite(saved?.perReplyCost) ? Math.max(0, Math.min(100, saved.perReplyCost)) : 1,
    };
  } catch {
    return { models: fallback.models?.length ? fallback.models : initialModels, defaultModel: fallback.default_model || initialModels[0].id, providerKey: "", providerUrl: "https://api.deepseek.com/chat/completions", usagePercent: 100, perReplyCost: 1 };
  }
}

export function ProprietorAssistant() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [settings, setSettings] = useState<LocalSettings>({ models: initialModels, defaultModel: initialModels[0].id, providerKey: "", providerUrl: "https://api.deepseek.com/chat/completions", usagePercent: 100, perReplyCost: 1 });
  const [storageKey, setStorageKey] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [tab, setTab] = useState<"chats" | "models" | "usage">("chats");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [approval, setApproval] = useState<{ token: string; summary: string } | null>(null);
  const [newModelId, setNewModelId] = useState("");
  const [newModelLabel, setNewModelLabel] = useState("");

  useEffect(() => {
    fetch("/api/assistant", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      const value = await response.json();
      if (!response.ok || !value?.ok) throw new Error(value?.code || "ASSISTANT_UNAVAILABLE");
      setConfig(value);
      const personId = String(value.person?.id || "signed-in-user");
      const localSettingsKey = `wts-assistant-settings:${personId}`;
      const chatKey = `wts-assistant-chats:${personId}`;
      setStorageKey(localSettingsKey);
      const loadedSettings = readSettings(localSettingsKey, value);
      setSettings(loadedSettings);
      try {
        const storedThreads = JSON.parse(localStorage.getItem(chatKey) || "[]");
        if (Array.isArray(storedThreads) && storedThreads.length) { setThreads(storedThreads); setActiveId(storedThreads[0].id); }
        else {
          const fresh = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
          setThreads([fresh]); setActiveId(fresh.id);
        }
      } catch {
        const fresh = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
        setThreads([fresh]); setActiveId(fresh.id);
      }
    }).catch((error) => {
      const code = error instanceof Error ? error.message : "";
      setNotice(code === "PROPRIETOR_ACCESS_REQUIRED" ? "This account does not have proprietor or developer access." : "Your session could not be verified. Please sign in to the Staff Portal.");
    });
  }, []);

  useEffect(() => {
    if (!config?.person?.id || !threads.length) return;
    localStorage.setItem(`wts-assistant-chats:${config.person.id}`, JSON.stringify(threads));
  }, [threads, config]);
  useEffect(() => { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(settings)); }, [settings, storageKey]);

  const activeThread = threads.find((thread) => thread.id === activeId) || threads[0];
  const name = useMemo(() => config?.person?.full_name?.split(" ")[0] || "there", [config]);

  function newChat() {
    const item = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
    setThreads((current) => [item, ...current]); setActiveId(item.id); setApproval(null); setNotice(""); setTab("chats");
  }

  function updateThread(id: string, messages: Message[]) {
    setThreads((current) => current.map((thread) => thread.id === id ? { ...thread, messages, title: thread.title === "New chat" && messages[0]?.role === "user" ? messages[0].content.slice(0, 40) : thread.title, updatedAt: Date.now() } : thread).sort((a, b) => b.updatedAt - a.updatedAt));
  }

  async function send(event?: FormEvent, prompt?: string) {
    event?.preventDefault();
    const content = (prompt || draft).trim();
    if (!content || busy || !activeThread) return;
    const updated = [...activeThread.messages, { role: "user", content } as Message];
    updateThread(activeThread.id, updated); setDraft(""); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: settings.defaultModel, messages: updated, provider_key: config?.is_admin ? settings.providerKey : "", provider_url: config?.is_admin ? settings.providerUrl : "" }) });
      const value = await response.json();
      if (!response.ok || !value?.ok) throw new Error(value?.code || "ASSISTANT_REQUEST_FAILED");
      updateThread(activeThread.id, [...updated, { role: "assistant", content: value.text || "Done." }]);
      if (value.approval?.approval_token) setApproval({ token: value.approval.approval_token, summary: value.approval.summary || "Confirm this change." });
      setSettings((s) => ({ ...s, usagePercent: Math.max(0, s.usagePercent - s.perReplyCost) }));
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setNotice(code === "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED" ? "Add a model API key in the Models tab." : code === "ASSISTANT_MODEL_REQUEST_FAILED" ? "The model could not answer. Check the selected model and API key in Models." : code === "ASSISTANT_ADMIN_REQUIRED" ? "Model keys can only be used from the developer account." : "The request failed. Check your connection and model settings, then try again.");
    } finally { setBusy(false); }
  }

  async function confirm() {
    if (!approval || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approval_token: approval.token }) });
      const value = await response.json();
      if (!response.ok || !value?.ok) throw new Error(value?.code || "CHANGE_FAILED");
      if (activeThread) updateThread(activeThread.id, [...activeThread.messages, { role: "assistant", content: `${approval.summary}\n\nThe system returned: ${value.completed?.result?.code || "completed"}.` }]);
      setApproval(null);
    } catch { setNotice("The confirmation failed. Please refresh the record before trying again."); }
    finally { setBusy(false); }
  }

  function saveModel() {
    const id = newModelId.trim(); if (!id) return;
    const item = { id, label: newModelLabel.trim() || id, description: "Manually configured model" };
    setSettings((current) => ({ ...current, models: [...current.models.filter((model) => model.id !== item.id), item], defaultModel: item.id }));
    setNewModelId(""); setNewModelLabel("");
  }

  if (!config) return <main className="assistantSignIn"><img src="/images/logo.webp" alt=""/><h1>Sign in to continue</h1><p>{notice || "Checking your WTS account…"}</p><a href="/portal/sign-in?return_to=%2Fassistant">Sign in to the Staff Portal</a></main>;

  return <main className="assistantShell">
    <aside className="assistantRail">
      <div className="assistantBrand"><img src="/images/logo.webp" alt="Way to Success"/><div><strong>WTS</strong><span>School assistant</span></div></div>
      <nav className="assistantTabs" aria-label="Workspace tabs"><button className={tab === "chats" ? "selected" : ""} onClick={() => setTab("chats")}>▤ <span>Chats</span></button><button className={tab === "models" ? "selected" : ""} onClick={() => setTab("models")}>✧ <span>Models</span></button><button className={tab === "usage" ? "selected" : ""} onClick={() => setTab("usage")}>◔ <span>Usage</span></button></nav>
      <button className="assistantNew" type="button" onClick={newChat}>＋ New chat</button>
      {tab === "chats" && <div className="assistantThreadList"><small>YOUR CHATS</small>{threads.map((thread) => <button className={activeId === thread.id ? "active" : ""} key={thread.id} onClick={() => { setActiveId(thread.id); setApproval(null); }}>{thread.title}</button>)}</div>}
      <div className="assistantRailFooter"><span>{config.is_admin ? "Developer workspace · private chats" : "Proprietor workspace · private chats"}</span><a href="/workspace">Staff Portal</a></div>
    </aside>
    <section className={`assistantMain ${config.is_admin ? "isDeveloper" : ""}`}>
      <header className="assistantTopbar"><div><p className="assistantEyebrow">WAY TO SUCCESS · PRIVATE ASSISTANT</p><h1>{tab === "chats" ? `Good day, ${name}` : tab === "models" ? "Model settings" : "Usage controls"}</h1></div>{tab === "chats" && <div className="assistantModel"><label htmlFor="assistant-model">MODEL</label><select id="assistant-model" value={settings.defaultModel} onChange={(event) => setSettings((s) => ({ ...s, defaultModel: event.target.value }))}>{settings.models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button className="assistantPrint" onClick={() => window.print()} type="button">Print</button></div>}</header>
      {tab === "chats" ? <>
        <div className="assistantConversation" aria-live="polite">
          {!activeThread?.messages.length && <div className="assistantWelcome"><div className="assistantOrb">✦</div><p className="assistantEyebrow">CONNECTED TO WTS SYSTEMS</p><h2>What would you like to take care of?</h2><p className="assistantLead">Ask about school records, students, staff, and results. I’ll check live information and ask before making a change.</p><div className="assistantPrompts">{starters.map((prompt) => <button key={prompt} type="button" onClick={() => send(undefined, prompt)}>{prompt}<span>↗</span></button>)}</div></div>}
          {activeThread?.messages.map((message, index) => <div className={`assistantMessage ${message.role}`} key={`${message.role}-${index}`}><div className="assistantAvatar">{message.role === "user" ? "You" : "WTS"}</div><div className="assistantBubble">{message.content.split("\n").map((line, lineIndex) => <p key={lineIndex}>{line || <>&nbsp;</>}</p>)}</div></div>)}
          {busy && <div className="assistantMessage assistant"><div className="assistantAvatar">WTS</div><div className="assistantBubble assistantThinking"><i/><i/><i/></div></div>}
        </div>
        {approval && <div className="assistantApproval"><div><strong>Confirm this change</strong><span>{approval.summary}</span></div><div className="assistantApprovalActions"><button type="button" onClick={() => setApproval(null)}>Cancel</button><button type="button" onClick={confirm} disabled={busy}>Confirm</button></div></div>}
        {notice && <div className="assistantNotice">{notice}</div>}
        <form className="assistantComposer" onSubmit={send}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything about Way to Success…" rows={1} aria-label="Message the assistant"/><button type="submit" disabled={busy || !draft.trim()} aria-label="Send">↑</button><small>Private to your signed-in account · confirmation before changes</small></form>
      </> : tab === "models" ? <div className="assistantSettingsPane"><p>Choose a model or add one from its provider. API keys are kept in this signed-in browser profile and sent only for your requests.</p><label>Default model<select value={settings.defaultModel} onChange={(event) => setSettings((s) => ({ ...s, defaultModel: event.target.value }))}>{settings.models.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.id}</option>)}</select></label><label>Provider API key<input type="password" autoComplete="new-password" placeholder="Paste a provider API key" value={settings.providerKey} onChange={(event) => setSettings((s) => ({ ...s, providerKey: event.target.value }))}/></label><div className="assistantModelAdd"><input placeholder="Model ID (for example deepseek-chat)" value={newModelId} onChange={(event) => setNewModelId(event.target.value)}/><input placeholder="Display name" value={newModelLabel} onChange={(event) => setNewModelLabel(event.target.value)}/><button type="button" onClick={saveModel}>Add model</button></div><div className="assistantConfiguredModels">{settings.models.map((item) => <div key={item.id}><span><b>{item.label}</b><small>{item.id}</small></span>{settings.models.length > 1 && <button type="button" onClick={() => setSettings((s) => { const models = s.models.filter((model) => model.id !== item.id); return { ...s, models, defaultModel: s.defaultModel === item.id ? models[0].id : s.defaultModel }; })}>Remove</button>}</div>)}</div><div className="assistantSettingsNote">{config.is_admin ? "Developer controls are private to your WTS account. The proprietor’s chat history and model settings use a separate account space." : "Model keys and custom model management are available only to the developer account."}</div></div> : <div className="assistantSettingsPane"><p>Set the starting balance and how much each assistant reply uses. This meter follows the limits you choose.</p><div className="assistantUsageMeter"><div className="assistantUsageCircle" style={{ "--usage": `${settings.usagePercent}%` } as React.CSSProperties}><span>{Math.round(settings.usagePercent)}%</span></div><div><strong>Remaining usage</strong><small>Manual balance for this account</small></div></div><label>Remaining percentage<input type="number" min="0" max="100" step="1" value={settings.usagePercent} onChange={(event) => setSettings((s) => ({ ...s, usagePercent: Math.max(0, Math.min(100, Number(event.target.value))) }))}/></label><label>Usage deducted per successful reply (%)<input type="number" min="0" max="100" step="0.1" value={settings.perReplyCost} onChange={(event) => setSettings((s) => ({ ...s, perReplyCost: Math.max(0, Math.min(100, Number(event.target.value))) }))}/></label><button className="assistantResetUsage" type="button" onClick={() => setSettings((s) => ({ ...s, usagePercent: 100 }))}>Reset balance to 100%</button></div>}
    </section>
  </main>;
}
