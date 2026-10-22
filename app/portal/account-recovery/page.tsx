"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type MessageTone = "error" | "success" | "info";

function friendlyMessage(code: string) {
  const messages: Record<string, string> = {
    SHARED_TEACHER_CODE_REQUIRED: "Enter your staff email and the shared WTS teacher code.",
    SHARED_TEACHER_CODE_INVALID: "That email and teacher code did not match an active teacher record.",
    PASSWORD_CONFIRMATION_REQUIRED: "Enter the new password twice, matching.",
    PASSWORD_REQUIREMENTS_NOT_MET: "Use at least 10 characters with uppercase, lowercase and a number.",
    RECOVERY_SERVICE_UNAVAILABLE: "The password service is unavailable. Please try again shortly.",
    RECOVERY_SERVICE_INVALID_RESPONSE: "The request could not be completed. Please try again.",
    RECOVERY_SERVICE_NOT_CONFIGURED: "Password management is not configured. Please contact authorised school management.",
    PASSWORD_RESET_FAILED: "The password could not be saved. Please contact authorised school management.",
    RECOVERY_TOKEN_INVALID: "This secure link is invalid. Use the teacher code instead.",
    RECOVERY_TOKEN_EXPIRED: "This secure link has expired. Use the teacher code instead.",
    RECOVERY_TOKEN_USED: "This secure link has already been used. Use the teacher code instead.",
  };
  return messages[code] || "The request could not be completed. Please try again.";
}

export default function AccountRecoveryPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [login, setLogin] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setReady(true);
  }, []);

  function showMessage(value: string, nextTone: MessageTone) {
    setMessage(value);
    setTone(nextTone);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      showMessage("The passwords do not match.", "error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const body = token
        ? { action: "complete", token, password, confirmPassword }
        : { action: "shared_code", email: login.trim(), code: code.trim(), password, confirmPassword };
      const response = await fetch("/api/account-recovery", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({ ok: false, code: "RECOVERY_SERVICE_INVALID_RESPONSE" }));
      if (!response.ok || result?.ok === false) {
        throw Object.assign(new Error(result?.code || "RECOVERY_SERVICE_UNAVAILABLE"), { code: result?.code });
      }
      setCompleted(true);
      setPassword("");
      setConfirmPassword("");
      showMessage("Your password has been saved. Return to the Staff Portal and sign in with your Staff Number.", "success");
    } catch (error) {
      const errorCode = error && typeof error === "object" && "code" in error ? String(error.code) : "RECOVERY_SERVICE_UNAVAILABLE";
      showMessage(friendlyMessage(errorCode), "error");
    } finally {
      setBusy(false);
    }
  }

  const tokenFlow = ready && Boolean(token);

  return (
    <main id="main-content" className="portalSignInPage portalEntryPage">
      <section className="portalSignInCard portalEntryCard" aria-labelledby="recovery-title">
        <Link className="portalBackLink" href="/portal/sign-in">← Back to Staff Portal</Link>
        <p className="eyebrow">STAFF PORTAL</p>
        <h1 id="recovery-title">{completed ? "Password saved." : "Forgot Password"}</h1>
        <p>
          {tokenFlow
            ? "Choose a new password to continue using the School Portal."
            : "Staff sign in normally with the password they already have. Use this page only when you have forgotten it: enter your staff email and the shared WTS teacher code, then choose a new password."}
        </p>
        {!ready ? <p className="portalEntryNotice">Preparing the secure form…</p> : null}

        {ready && !completed ? <form className="portalAuthForm" onSubmit={submit}>
          {!tokenFlow ? <label>Staff email
            <input autoComplete="email" type="email" required maxLength={254} value={login} onChange={(event) => setLogin(event.target.value)} placeholder="name@waytosuccessschools.com" />
          </label> : null}
          {!tokenFlow ? <label>Shared WTS teacher code
            <input autoComplete="off" spellCheck={false} type="text" required maxLength={64} value={code} onChange={(event) => setCode(event.target.value)} placeholder="WTS…" />
          </label> : null}
          <label>New password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showPassword ? "text" : "password"} required minLength={10} maxLength={512} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="portalPasswordToggle" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide password" : "Show password"}</button>
            </span>
          </label>
          <label>Confirm new password
            <span className="portalPasswordControl">
              <input autoComplete="new-password" type={showPassword ? "text" : "password"} required minLength={10} maxLength={512} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </span>
          </label>
          <p className="portalFormHelp">Use at least 10 characters with uppercase, lowercase and a number. Registry management holds the teacher code.</p>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Saving password…" : "Reset Password"}</button>
        </form> : null}

        <p className={"portalAuthMessage " + (message ? "isVisible " : "") + "portalAuthMessage--" + tone} role="status" aria-live="polite">{message}</p>
        <div className="portalEntryActions">
          <Link href="/portal/account-recovery">Forgot Password</Link>
          <Link href="/portal/register">New Staff Registration</Link>
          <Link href="/portal/help">Need Help Signing In?</Link>
        </div>
      </section>
    </main>
  );
}
