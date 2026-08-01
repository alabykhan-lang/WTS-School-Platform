// This is the existing public Supabase endpoint and publishable key used by
// the Central Registry. It has no service-role capability. Every operation
// below is authorised again inside a guarded Central Registry RPC.
export const centralIdentityConfig = {
  url: "https://wuftzyeajmsxdrbwaawl.supabase.co",
  publishableKey: "sb_publishable_7AKtP6jh9xg8CdrK8F53xA_q4yZskPJ",
} as const;

export const centralIdentitySessionStorageKey = "wts_school_platform_staff_session";
