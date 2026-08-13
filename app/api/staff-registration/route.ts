import { NextRequest } from "next/server";
import { portalOrigins } from "../../../data/portal-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function json(payload: Record<string, unknown>, status = 200) {
  return Response.json(payload, { status, headers: NO_STORE });
}

function requiredText(input: Record<string, unknown>, key: string, maxLength: number) {
  const value = input[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalText(input: Record<string, unknown>, key: string, maxLength: number) {
  const value = input[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ ok: false, code: "INVALID_REQUEST" }, 400);
  }
  const body = input as Record<string, unknown>;
  const fullName = requiredText(body, "fullName", 160);
  const email = requiredText(body, "email", 254);
  const phone = requiredText(body, "phone", 40);
  const whatsappNumber = optionalText(body, "whatsappNumber", 40);
  const address = optionalText(body, "address", 500);
  const emergencyContact = optionalText(body, "emergencyContact", 240);
  const photo = optionalText(body, "photo", 300000);

  if (fullName.length < 2) return json({ ok: false, code: "FULL_NAME_REQUIRED" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, code: "VALID_EMAIL_REQUIRED" }, 400);
  if (phone.length < 7) return json({ ok: false, code: "PHONE_REQUIRED" }, 400);
  if (whatsappNumber && whatsappNumber.length < 7) return json({ ok: false, code: "WHATSAPP_NUMBER_INVALID" }, 400);
  if (photo && !photo.startsWith("data:image/")) return json({ ok: false, code: "PHOTOGRAPH_INVALID" }, 400);

  const payload = { fullName, email, phone, whatsappNumber, address, emergencyContact, photo };

  try {
    const response = await fetch(new URL("/api/staff-registration", portalOrigins.centralRegistry + "/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ ok: false, code: "STAFF_REGISTRATION_FAILED" }));
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return json({ ok: false, code: "STAFF_REGISTRATION_FAILED" }, 502);
    }
    return json(result as Record<string, unknown>, response.status);
  } catch {
    return json({ ok: false, code: "STAFF_REGISTRATION_SERVICE_UNAVAILABLE" }, 502);
  }
}
