"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type RecoveryResult = {
  login_name?: string;
  temporary_password?: string;
  must_change_password?: boolean;
  request_id?: string;
};

export function BootstrapRecoveryClient() {
  const [secret, setSecret] = useState("");
  const [reason, setReason] = useState("Owner-requested recovery for the confirmed WTS super administrator account.");
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/identity/bootstrap-recovery", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-wts-bootstrap-secret": secret,
        },
        body: JSON.stringify({ reason }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.code || "BOOTSTRAP_RECOVERY_FAILED");
      setSecret("");
      setResult(payload);
      setMessage("The one-time credential was returned once. Deliver it through an approved private channel, then sign in and change it immediately.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "BOOTSTRAP_RECOVERY_ALREADY_CONSUMED"
        ? "This one-time bootstrap has already been consumed. Use the normal WTS password-recovery process."
        : "Recovery is unavailable or was not authorised. Contact the system owner without sending a password or secret here.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="portalSignInPage">
      <section className="portalSignInCard" aria-labelledby="bootstrap-recovery-title">
        <Link className="portalBackLink" href="/portal/sign-in">← Back to WTS Staff Login</Link>
        <p className="eyebrow">PROTECTED OPERATOR ROUTE</p>
        <h1 id="bootstrap-recovery-title">One-time account recovery.</h1>
        <p>This route is restricted to the confirmed existing WTS super administrator account. It does not create an account, change grants, or expose a password in logs.</p>
        <form className="portalAuthForm" onSubmit={submit}>
          <label>Private bootstrap secret<input autoComplete="off" type="password" required value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
          <label>Recovery reason<textarea required minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <button className="primaryButton" disabled={busy} type="submit">{busy ? "Preparing recovery…" : "Prepare one-time recovery"}</button>
        </form>
        <p className="portalAuthMessage portalAuthMessage--info isVisible" role="status">{message || "Use only from a private operator device. Never paste a password or secret into support chat."}</p>
        {result ? <section className="identityTemporaryCredential" aria-live="polite">
          <p className="eyebrow">DISPLAYED ONCE</p>
          <h2>Private delivery required.</h2>
          <p>The credential below is not stored by this page. Keep it private, use it once, and complete the compulsory password change at WTS Staff Login.</p>
          <dl>
            <div><dt>Login</dt><dd><code>{result.login_name}</code></dd></div>
            <div><dt>Temporary credential</dt><dd><code>{result.temporary_password}</code></dd></div>
          </dl>
          <small>Request ID: {result.request_id || "recorded"}. The temporary credential must not be committed, emailed insecurely, or placed in a ticket.</small>
        </section> : null}
      </section>
    </main>
  );
}
