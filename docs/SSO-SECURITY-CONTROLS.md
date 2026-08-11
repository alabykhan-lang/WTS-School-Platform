# SSO Security Controls

| Control | Implementation |
| --- | --- |
| Active WTS session | Authorization reads the host-only Workspace session and validates its server-side identity context. |
| Identity validation | Active person, staff registration, employment, identity account and active credential are checked before code issue and exchange. |
| Grant validation | An active, currently valid `results` grant is required at issue, exchange and every protected Result request. |
| PKCE | Browser-generated verifier with SHA-256 S256 challenge; the verifier is never sent to the authorization endpoint. |
| State and nonce | Random values are created per flow, stored transiently, hashed in the database and compared at callback/exchange. |
| Exact redirect | Results accepts only its configured `/portal_core.html` callback; Attendance accepts only its configured `/` callback. Current values are the Vercel origins in `data/portal-config.ts`. |
| Audience | Client ID `result_portal` and target audience `results` are fixed in the endpoint and database constraints. |
| Code lifetime | Authorization codes expire after five minutes and have a locked single-use consumption marker. |
| Code storage | Only a SHA-256 code hash is stored. Raw codes exist only for the redirect and immediate exchange. |
| Cookies | Result sessions use HttpOnly, Secure, SameSite=Lax, host-only cookies with no Domain attribute. |
| Server authorization | Protected Result APIs validate the session server-side; UI visibility is not trusted. |
| CSRF/origin | Result API requests accept only the exact Result origin when an Origin header is present; state protects the cross-origin handoff. |
| CORS | No wildcard credentialed CORS is configured. |
| Browser authority | No password, client secret, service key or reusable session secret is placed in browser storage or URLs. |
| Audit | Code issuance, Result session issuance, ordinary revocation and linked revocation are recorded in the existing registry audit table without credentials or hashes. |
| Revocation | Central WTS logout revokes linked Result sessions; identity, employment and grant changes fail closed on the next Result authorization check. |
| Data boundary | No student, score, trait, remark, fee, publication or report-card data is changed by the integration. |
