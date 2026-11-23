"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Model = { id: string; label: string; description: string };
type AssistantConfig = { configured: boolean; models: Model[]; default_model: string; person?: { full_name?: string } };

const starterPrompts = [
  "How many active students do we have in each class?",
  "Show me the current school dashboard.",
  "Find Fatai Waris and show his class and result status.",
  "Show SS3 students and their current results.",
];

export function ProprietorAssistant() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [approval, setApproval] = useState<{ token: string; summary: string } | null>(null);

  useEffect(() => {
    fetch("/api/assistant", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((value) => {
        if (!value?.ok) throw new Error(value?.code || "ASSISTANT_UNAVAILABLE");
        setConfig(value);
        setModel(value.default_model || value.models?.[0]?.id || "");
      })
      .catch((error) => setNotice(error instanceof Error && error.message === "PROPRIETOR_ACCESS_REQUIRED" ? "This assistant is reserved for the proprietor account." : "Sign in through the Staff Portal to use the assistant."));
  }, []);

  const name = useMemo(() => config?.person?.full_name?.split(" ")[0] || "Proprietor", [config]);

  async function send(event?: FormEvent, prompt?: string) {
    event?.preventDefault();
    const content = (prompt || draft).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user", content } as Message];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: next }) });
      const value = await response.json();
      if (!response.ok || !value?.ok) throw new Error(value?.code || "ASSISTANT_REQUEST_FAILED");
      setMessages((current) => [...current, { role: "assistant", content: value.text || "Done." }]);
      if (value.approval?.approval_token) setApproval({ token: value.approval.approval_token, summary: value.approval.summary || "Confirm this change." });
    } catch (error) {
      setNotice(error instanceof Error && error.message === "ASSISTANT_MODEL_GATEWAY_NOT_CONFIGURED" ? "The assistant is installed, but its model gateway key still needs to be configured." : "I could not complete that request. Please try again.");
    } finally { setBusy(false); }
  }

  async function confirm() {
    if (!approval || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approval_token: approval.token }) });
      const value = await response.json();
      if (!response.ok || !value?.ok) throw new Error(value?.code || "CHANGE_FAILED");
      setMessages((current) => [...current, { role: "assistant", content: `${approval.summary}\n\nThe change has been completed and recorded in the school system.` }]);
      setApproval(null);
    } catch { setNotice("The confirmation could not be completed. Nothing was changed."); }
    finally { setBusy(false); }
  }

  return <main className="assistantShell">
    <aside className="assistantRail">
      <div className="assistantBrand"><img src="/images/logo.webp" alt="Way to Success" /><div><strong>WTS</strong><span>Proprietor desk</span></div></div>
      <button className="assistantNew" type="button" onClick={() => { setMessages([]); setApproval(null); setNotice(""); }}>＋ New conversation</button>
      <div className="assistantRailSection"><small>CONNECTED SYSTEMS</small><span>● Central Registry</span><span>● Results</span><span>● Staff workspace</span></div>
      <div className="assistantRailFooter"><span>Private school workspace</span><a href="/workspace">Open Staff Portal</a></div>
    </aside>
    <section className="assistantMain">
      <header className="assistantTopbar"><div><p className="assistantEyebrow">WAY TO SUCCESS · PROPRIETOR ASSISTANT</p><h1>Good day, {name}</h1></div><div className="assistantModel"><label htmlFor="assistant-model">MODEL</label><select id="assistant-model" value={model} onChange={(event) => setModel(event.target.value)} disabled={!config?.models?.length}>{(config?.models || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></header>
      <div className="assistantConversation" aria-live="polite">
        {!messages.length && <div className="assistantWelcome"><div className="assistantOrb">✦</div><p className="assistantEyebrow">YOUR SCHOOL, AT A GLANCE</p><h2>What would you like to take care of?</h2><p className="assistantLead">Ask about students, results, staff, records, or school administration. I’ll use the live WTS systems and ask before making a change.</p><div className="assistantPrompts">{starterPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => send(undefined, prompt)}>{prompt}<span>↗</span></button>)}</div></div>}
        {messages.map((message, index) => <div className={`assistantMessage ${message.role}`} key={`${message.role}-${index}`}><div className="assistantAvatar">{message.role === "user" ? "You" : "WTS"}</div><div className="assistantBubble">{message.content.split("\n").map((line, lineIndex) => <p key={lineIndex}>{line || <>&nbsp;</>}</p>)}</div></div>)}
        {busy && <div className="assistantMessage assistant"><div className="assistantAvatar">WTS</div><div className="assistantBubble assistantThinking"><i></i><i></i><i></i></div></div>}
      </div>
      {approval && <div className="assistantApproval"><div><strong>Confirmation needed</strong><span>{approval.summary}</span></div><div className="assistantApprovalActions"><button type="button" onClick={() => setApproval(null)} disabled={busy}>Cancel</button><button type="button" onClick={confirm} disabled={busy}>Confirm change</button></div></div>}
      {notice && <div className="assistantNotice">{notice}</div>}
      <form className="assistantComposer" onSubmit={send}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything about Way to Success…" rows={1} aria-label="Message the proprietor assistant" /><button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">↑</button><small>Live school data · confirmation before changes</small></form>
    </section>
  </main>;
}
