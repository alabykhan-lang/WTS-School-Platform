"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type RecoveryMode = "reset" | "activation";
type MessageTone = "error" | "success" | "info";

function friendlyMessage(code: string, mode: RecoveryMode) {
  const messages: Record<string, string> = {
    RECOVERY_EMAIL_REQUIRED: "Password recovery uses the official registered email address.",
    RECOVERY_EMAIL_DELIVERY_FAILED: "We could not send the secure link right now. Please try again later.",
    RECOVERY_EMAIL_NOT_CONFIGURED: "Recovery is temporarily unavailable. Please contact authorised school management.",
    RECOVERY_SERVICE_UNAVAILABLE: "Recovery is temporarily unavailable. Please try again later.",
    RECOVERY_SERVICE_INVALID_RESPONSE: "Recovery could not be completed. Please try again later.",
    PASSWORD_REQUIREMENTS_NOT_MET: "Use at least 10 characters with uppercase, lowercase and a number.",
    RECOVERY_TOKEN_INVALID: "This secure link is invalid. Request a new one.",
    RECOVERY_TOKEN_EXPIRED: "This secure link has expired. Request a new one.",
    RECOVERY_TOKEN_USED: "This secure link has already been used. Request a new one if needed.",
    PASSWORD_CONFIRMATION_REQUIRED: "Enter matching passwords.",
  };
  if (messages[code]) return messages[code];
  if (mode === "activation" && code === "ACCOUNT_NOT_ACTIVE") {
    return "This staff identity is not currently eligible for activation. Please contact authorised school management.";
  }
  return "The request could not be completed. Please try again.";
}

export default function AccountRecoveryPage() {
  const [mode, setMode] = useState<RecoveryMode>("reset");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requested, setRequested] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "activation" ? "activation" : "reset");
    setToken(params.get("token") || "");
    setReady(true);
  }, []);

  function showMessage(value: string, nextTone: MessageTone) {
    setMessage(value);
    setTone(nextTone);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setRequested(false);
    setMessage("");
    try {
      const response = await fetch("/api/account-recovery", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action: "request",
          purpose: mode === "activation" ? "activation" : "password_reset",
          login: login.trim(),
        }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({ ok: false, code: "RECOVERY_SERVICE_INVALID_RESPONSE" }));
      if (!response.ok || result?.ok === false) {
        throw Object.assign(new Error(result?.code || "RECOVERY_SERVICE_UNAVAILABLE"), { code: result?.code });
      }
      setRequested(true);
      showMessage(
        mode === "reset"
          ? "If an eligible account is on file, a secure password-reset link has been sent to its verified email address."
          : "If an eligible staff identity is on file, a secure activation link has been sent to its verified email address.",
        "success",
      );
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "RECOVERY_SERVICE_UNAVAILABLE";
      showMessage(friendlyMessage(code, mode), "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      showMessage("The passwords do not match.", "error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account-recovery", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "complete", token, password, confirmPassword }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({ ok: false, code: "RECOVERY_SERVICE_INVALID_RESPONSE" }));
      if (!response.ok || result?.ok === false) {
        throw Object.assign(new Error(result?.code || "RECOVERY_SERVICE_UNAVAILABLE"), { code: result?.code });
      }
      setCompleted(true);
      setPassword("");
      setConfirmPassword("");
      showMessage(
        mode === "reset"
          ? "Your password has been reset. Return to the Staff Portal and sign in."
          : "Your account is activated. Return to the Staff Portal and sign in.",
        "success",
      );
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "RECOVERY_SERVICE_UNAVAILABLE";
      showMessage(friendlyMessage(code, mode), "error");
    } finally {
      setBusy(false);
    }
  }

  const tokenFlow = ready && Boolean(token);
  const title = mode === "reset" ? "Forgot Password" : "Activate Existing Account";
  const description = mode === "reset"
    ? "Use your official registered email. We will send a single-use secure link when an eligible account is on file."
    : "Use your staff number or official registered email. We will send a single-use secure link when an eligible existing staff identity is on file.";

  return (
    <main id="main-content" className="portalSignInPage portalEntryPage">
      <section className="portalSignInCard portalEntryCard" aria-labelledby="recovery-title">
        <Link className="portalBackLink" href="/portal/sign-in">← Back to Staff Portal</Link>
        <p className="eyebrow">STAFF PORTAL</p>
        <h1 id="recovery-title">{completed ? "Access restored." : title}</h1>
        <p>{tokenFlow ? "Choose a new password to continue using the School Portal." : description}</p>
        {!ready ? <p className="portalEntryNotice">Preparing the secure form…</p> : null}

        {ready && !tokenFlow && !requested ? <form className="portalAuthForm" onSubmit={submitRequest}>
          <label>{mode === "reset" ? "Official registered email" : "Staff number or official registered email"}
            <input autoComplete={mode === "reset" ? "email" : "username"} type={mode === "reset" ? "email" : "text"} required maxLength={254} value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Sending secure link…" : mode === "reset" ? "Send reset link" : "Send activation link"}</button>
        </form> : null}

        {ready && !tokenFlow && requested ? <div className="portalEntryNotice portalEntryNotice--success">
          <strong>Check your verified email.</strong>
          <span>The message is single-use and expires. If the identity is pending approval, inactive or has no verified email, no activation link is sent.</span>
        </div> : null}

        {tokenFlow && !completed ? <form className="portalAuthForm" onSubmit={submitCompletion}>
          <label>New password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showPassword ? "text" : "password"} required minLength={10} maxLength={512} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <label>Confirm new password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} required minLength={10} maxLength={512} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <p className="portalFormHelp">Use at least 10 characters with uppercase, lowercase and a number.</p>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Saving password…" : mode === "reset" ? "Reset Password" : "Activate Account"}</button>
        </form> : null}

        <p className={"portalAuthMessage " + (message ? "isVisible " : "") + "portalAuthMessage--" + tone} role="status" aria-live="polite">{message}</p>
        <div className="portalEntryActions">
          <Link href="/portal/account-recovery?mode=reset">Forgot Password</Link>
          <Link href="/portal/account-recovery?mode=activation">Activate Existing Account</Link>
          <Link href="/portal/register">New Staff Registration</Link>
          <Link href="/portal/help">Need Help Signing In?</Link>
        </div>
      </section>
    </main>
  );
}
