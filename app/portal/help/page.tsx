import Link from "next/link";

export default function StaffPortalHelpPage() {
  return (
    <main id="main-content" className="portalSignInPage portalEntryPage">
      <section className="portalSignInCard portalEntryCard" aria-labelledby="help-title">
        <Link className="portalBackLink" href="/portal/sign-in">← Back to Staff Portal</Link>
        <p className="eyebrow">STAFF PORTAL</p>
        <h1 id="help-title">Need Help Signing In?</h1>
        <p>Choose the path that matches your school account.</p>
        <div className="portalHelpList">
          <div><strong>Already use the School Portal?</strong><span>Sign in with your official registered email or staff number.</span></div>
          <div><strong>Forgot your password?</strong><span>Use Forgot Password with your Staff Number and the shared WTS teacher code.</span></div>
          <div><strong>Existing staff?</strong><span>Sign in with the password you already have — no activation step is needed. If the password is lost, use Forgot Password.</span></div>
          <div><strong>Newly employed?</strong><span>Use New Staff Registration. Management approval is required before access is available.</span></div>
          <div><strong>Registration received · Pending Management Approval</strong><span>Wait for management approval. Pending registrations cannot open school modules.</span></div>
        </div>
        <div className="portalEntryActions">
          <Link href="/portal/sign-in">Open Staff Portal</Link>
          <Link href="/portal/account-recovery">Forgot Password</Link>
          <Link href="/portal/register">New Staff Registration</Link>
        </div>
      </section>
    </main>
  );
}
