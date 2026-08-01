"use client";

import { FormEvent, useEffect, useState } from "react";
import type { StoredSession } from "./PortalWorkspaceClient";

type StaffAccount = {
  staff_id: string;
  full_name?: string | null;
  staff_number?: string | null;
  email?: string | null;
  designation?: string | null;
  department?: string | null;
  login_name?: string | null;
  account_status?: string | null;
  credential_status?: string | null;
  must_change_password?: boolean | null;
  failed_attempts?: number | null;
  locked_until?: string | null;
  last_login_at?: string | null;
  password_changed_at?: string | null;
};

type TemporaryCredential = {
  loginName: string;
  temporaryPassword: string;
  requestId?: string;
};

function identityError(code?: string) {
  const messages: Record<string, string> = {
    ADMIN_AUTH_OR_PERMISSION_FAILED: "Your identity-access session is not authorised for this action.",
    STAFF_SESSION_REQUIRED: "Your identity-access session is missing. Sign in again.",
    STAFF_SESSION_NOT_ACTIVE: "Your identity-access session has expired. Sign in again.",
    STAFF_IDENTITY_NOT_ACTIVE: "That staff identity is not active and cannot receive a reset.",
    IDENTITY_ACCOUNT_NOT_ACTIVE: "That identity account is not active and cannot receive a reset.",
    RESET_REASON_REQUIRED: "Enter a clear operational reason of at least eight characters.",
    IDENTITY_SERVICE_NOT_CONFIGURED: "The protected recovery service is not configured for this deployment.",
  };
  return messages[code || ""] || "The protected identity service could not complete the request.";
}

function formatDate(value?: string | null) {
  if (!value) return "None";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unavailable" : parsed.toLocaleString();
}

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "IDENTITY_SERVICE_UNAVAILABLE");
  return payload as Record<string, unknown>;
}

export function IdentityAccessPanel({ session }: { session: StoredSession }) {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [temporary, setTemporary] = useState<TemporaryCredential | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadAccounts(query = search) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/identity/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_code: session.clientCode, client_secret: session.clientSecret, search: query }),
        cache: "no-store",
      });
      const payload = await readResponse(response);
      const nextAccounts = Array.isArray(payload.accounts) ? payload.accounts as StaffAccount[] : [];
      setAccounts(nextAccounts);
      if (selectedStaffId && !nextAccounts.some((account) => account.staff_id === selectedStaffId)) setSelectedStaffId("");
    } catch (error) {
      setAccounts([]);
      setMessage(identityError(error instanceof Error ? error.message : undefined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts("");
    // The opaque session is intentionally the only dependency for this protected read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.clientCode, session.clientSecret]);

  async function searchAccounts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAccounts(search);
  }

  async function issueReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStaffId) {
      setMessage("Select an active staff identity first.");
      return;
    }
    if (reason.trim().length < 8) {
      setMessage(identityError("RESET_REASON_REQUIRED"));
      return;
    }
    setBusy(true);
    setMessage("");
    setTemporary(null);
    setCopied(false);
    try {
      const response = await fetch("/api/identity/reset-staff-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_code: session.clientCode,
          client_secret: session.clientSecret,
          staff_id: selectedStaffId,
          reason: reason.trim(),
        }),
        cache: "no-store",
      });
      const payload = await readResponse(response);
      if (typeof payload.login_name !== "string" || typeof payload.temporary_password !== "string") {
        throw new Error("IDENTITY_SERVICE_UNAVAILABLE");
      }
      setTemporary({
        loginName: payload.login_name,
        temporaryPassword: payload.temporary_password,
        requestId: typeof payload.request_id === "string" ? payload.request_id : undefined,
      });
      setReason("");
      setMessage("A one-time temporary credential was issued. It is shown only in this browser session and must be replaced at first login.");
      await loadAccounts(search);
    } catch (error) {
      setMessage(identityError(error instanceof Error ? error.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function copyTemporaryPassword() {
    if (!temporary) return;
    try {
      await navigator.clipboard.writeText(temporary.temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const selectedAccount = accounts.find((account) => account.staff_id === selectedStaffId);

  return <div className="identityAccessPanel">
    <div className="identityAccessToolbar">
      <form onSubmit={searchAccounts} className="identityAccessSearch">
        <label>Find a real staff identity<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, staff number or official email" /></label>
        <button className="ghostButton" type="submit" disabled={loading}>{loading ? "Loading…" : "Search"}</button>
      </form>
      <p>Only the existing Central Registry staff-account records are returned. Password hashes and temporary passwords are never included in this list.</p>
    </div>

    <div className="identityAccessRows" aria-live="polite">
      {loading ? <p className="workspaceLiveEmpty">Loading current staff identity records…</p> : null}
      {!loading && !accounts.length ? <p className="workspaceLiveEmpty">No matching staff identity records were returned.</p> : null}
      {accounts.map((account) => {
        const isActive = account.account_status === "active" && account.credential_status !== "suspended";
        return <article className={`identityAccessRow ${selectedStaffId === account.staff_id ? "isSelected" : ""}`} key={account.staff_id}>
          <div className="identityAccessRowMain">
            <p className="eyebrow">{account.staff_number || "Staff number not supplied"}</p>
            <h3>{account.full_name || "Unnamed staff identity"}</h3>
            <p>{account.email || "Official email not supplied"}{account.designation ? ` · ${account.designation}` : ""}</p>
          </div>
          <dl className="identityAccessFacts">
            <div><dt>Account</dt><dd>{account.account_status || "Unavailable"}</dd></div>
            <div><dt>Credential</dt><dd>{account.credential_status || "Unavailable"}</dd></div>
            <div><dt>Password state</dt><dd>{account.must_change_password ? "Change required" : "Active"}</dd></div>
            <div><dt>Failed attempts</dt><dd>{account.failed_attempts ?? "Unavailable"}</dd></div>
            <div><dt>Lock until</dt><dd>{formatDate(account.locked_until)}</dd></div>
          </dl>
          <button className="ghostButton identitySelectButton" type="button" disabled={!isActive} onClick={() => setSelectedStaffId(account.staff_id)}>{isActive ? (selectedStaffId === account.staff_id ? "Selected" : "Select for reset") : "Not eligible"}</button>
        </article>;
      })}
    </div>

    <form className="identityResetForm" onSubmit={issueReset}>
      <div><p className="eyebrow">ISSUE ONE-TIME TEMPORARY CREDENTIAL</p><h3>{selectedAccount?.full_name || "Select an active staff identity"}</h3><p>Resetting clears failed attempts and an expired lock, preserves the identity and grants, invalidates existing opaque sessions for the target and forces a new password at next login.</p></div>
      <label>Reason for this reset<textarea required minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: owner-approved recovery after confirmed staff access request" /></label>
      <button className="primaryButton" type="submit" disabled={busy || !selectedStaffId}>{busy ? "Issuing securely…" : "Issue temporary credential"}</button>
    </form>

    {temporary ? <section className="identityTemporaryCredential" aria-labelledby="temporary-credential-heading">
      <p className="eyebrow">DISPLAYED ONCE</p>
      <h3 id="temporary-credential-heading">Deliver this credential through an approved private channel.</h3>
      <p>It is not emailed, logged, stored in this page after dismissal or written to audit metadata. The staff member must change it immediately after signing in.</p>
      <dl><div><dt>Sign-in name</dt><dd><code>{temporary.loginName}</code></dd></div><div><dt>Temporary password</dt><dd><code>{temporary.temporaryPassword}</code></dd></div></dl>
      <div className="identityTemporaryActions"><button className="ghostButton" type="button" onClick={() => void copyTemporaryPassword()}>{copied ? "Copied" : "Copy temporary password"}</button><button className="ghostButton" type="button" onClick={() => { setTemporary(null); setCopied(false); }}>Dismiss one-time display</button></div>
      {temporary.requestId ? <small>Audit request recorded: {temporary.requestId}</small> : null}
    </section> : null}

    <p className="portalAuthMessage portalAuthMessage--info isVisible" role="status">{message}</p>
  </div>;
}
