"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

type LoginResponse = {
  ok: boolean;
  code?: string;
  must_change_password?: boolean;
};

function friendlyError(code?: string) {
  const messages: Record<string, string> = {
    INVALID_LOGIN: "The staff number, official email or password was not accepted.",
    LOGIN_AND_PASSWORD_REQUIRED: "Enter your staff number or official email and password.",
    ACCOUNT_NOT_ACTIVE: "This staff account is not active. Please contact authorised school management.",
    ACCOUNT_TEMPORARILY_LOCKED: "This account is temporarily locked. Please contact authorised school management for recovery.",
    CENTRAL_REGISTRY_ACCESS_NOT_GRANTED: "This account does not currently have authorised Central Registry access.",
    PORTAL_ACCESS_NOT_GRANTED: "This account does not currently have access to the Staff Portal.",
    PORTAL_PERMISSION_SYNC_FAILED: "The account could not be matched to an active school access record. Please contact authorised school management.",
    STAFF_SESSION_NOT_ACTIVE: "Your session is no longer active. Please sign in again.",
    STAFF_SESSION_REQUIRED: "Your session is no longer active. Please sign in again.",
    INVALID_CURRENT_PASSWORD: "The current password was not accepted.",
    PASSWORD_REQUIREMENTS_NOT_MET: "Use at least 10 characters with uppercase, lowercase and a number.",
    IDENTITY_SERVICE_UNAVAILABLE: "The identity service is temporarily unavailable. Please try again later.",
  };
  return messages[code || ""] || "The protected service could not complete that request.";
}

async function workspaceSessionRequest<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/workspace-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ action, ...body }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ ok: false, code: "IDENTITY_SERVICE_UNAVAILABLE" }));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.code || "REQUEST_FAILED");
  return payload as T;
}

function safeWorkspaceReturnTo(value: string | null) {
  if (!value) return "/workspace";
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || parsed.pathname !== "/api/sso/authorize") return "/workspace";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/workspace";
  }
}

export function PortalSignIn() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingChange, setPendingChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success" | "info">("error");
  const [busy, setBusy] = useState(false);
  const [returnTo, setReturnTo] = useState("/workspace");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReturnTo(safeWorkspaceReturnTo(query.get("return_to")));
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageTone("error");
    try {
      const result = await workspaceSessionRequest<LoginResponse>("login", { login: login.trim(), password });
      if (result.must_change_password) {
        setPendingChange(true);
        setMessage("This is a first-time or reset credential. Choose your new password before continuing.");
        setMessageTone("info");
        return;
      }
      window.location.assign(returnTo);
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : undefined));
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("The new passwords do not match.");
      setMessageTone("error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await workspaceSessionRequest("change_password", { login: login.trim(), current_password: password, new_password: newPassword });
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPendingChange(false);
      setMessage("Password changed. Sign in again with your new password.");
      setMessageTone("success");
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : undefined));
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="portalSignInPage portalEntryPage">
      <section className="portalSignInCard portalEntryCard" aria-labelledby="portal-sign-in-title">
        <div className="portalEntryBrand"><img src="/images/logo.webp" alt="Way to Success Standard Schools logo" /><span><strong>Way to Success Standard Schools</strong><small>Staff Portal</small></span></div>
        <p className="eyebrow">STAFF PORTAL</p>
        <h1 id="portal-sign-in-title">Welcome back.</h1>
        <p>Sign in with your school account. Your portal will show only the current information and services authorised for you.</p>
        {!pendingChange ? <form className="portalAuthForm" onSubmit={submitLogin}>
          <label>Staff number or official registered email
            <input autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>
          <label>Password
            <span className="portalPasswordControl">
              <input autoComplete="current-password" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Checking access…" : "Open Staff Portal"}</button>
        </form> : <form className="portalAuthForm" onSubmit={submitPasswordChange}>
          <label>New password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showNewPassword} onClick={() => setShowNewPassword((value) => !value)}>{showNewPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <label>Confirm new password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Updating password…" : "Create new password"}</button>
        </form>}
        <p className={"portalAuthMessage " + (message ? "isVisible " : "") + "portalAuthMessage--" + messageTone} role="status" aria-live="polite">{message}</p>
        <div className="portalEntryActions" aria-label="Account help">
          <Link href="/portal/account-recovery?mode=reset">Forgot Password</Link>
          <Link href="/portal/account-recovery?mode=activation">Activate Existing Account</Link>
          <Link href="/portal/register">New Staff Registration</Link>
          <Link href="/portal/help">Need Help Signing In?</Link>
        </div>
        <ul className="portalAuthNotes">
          <li>Use the same school account for the Staff Portal and its authorised systems.</li>
          <li>Account recovery and activation use the verified details already held by the school.</li>
        </ul>
      </section>
    </main>
  );
}
