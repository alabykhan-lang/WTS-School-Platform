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
          <div><strong>Forgot your password?</strong><span>Use Forgot Password and follow the secure email link.</span></div>
          <div><strong>Existing staff, not activated?</strong><span>Use Activate Existing Account. If employment is pending or inactive, contact authorised management.</span></div>
          <div><strong>Newly employed?</strong><span>Use New Staff Registration. Management approval is required before access is available.</span></div>
          <div><strong>Registration pending?</strong><span>Wait for management approval. Pending registrations cannot open school modules.</span></div>
        </div>
        <div className="portalEntryActions">
          <Link href="/portal/sign-in">Open Staff Portal</Link>
          <Link href="/portal/account-recovery?mode=reset">Forgot Password</Link>
          <Link href="/portal/account-recovery?mode=activation">Activate Existing Account</Link>
          <Link href="/portal/register">New Staff Registration</Link>
        </div>
      </section>
    </main>
  );
}
