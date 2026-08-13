"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type RegistrationForm = {
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  emergencyContact: string;
  photo: string;
};

type MessageTone = "error" | "success" | "info";

async function compressPhoto(file: File) {
  if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) throw new Error("PHOTOGRAPH_INVALID");
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      URL.revokeObjectURL(url);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("PHOTOGRAPH_INVALID"));
    };
    element.src = url;
  });
  const max = 560;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PHOTOGRAPH_INVALID");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.76;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 180000 && quality > 0.42) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > 220000) throw new Error("PHOTOGRAPH_INVALID");
  return data;
}

function friendlyMessage(code: string) {
  const messages: Record<string, string> = {
    FULL_NAME_REQUIRED: "Enter your full name.",
    VALID_EMAIL_REQUIRED: "Enter a valid email address.",
    PHONE_REQUIRED: "Enter a phone number.",
    WHATSAPP_NUMBER_INVALID: "Check the WhatsApp number.",
    PHOTOGRAPH_INVALID: "Choose a smaller, valid photograph.",
    STAFF_REGISTRATION_ALREADY_ON_FILE: "A registration or staff identity is already on file for these details. Do not register again.",
    STAFF_REGISTRATION_SERVICE_UNAVAILABLE: "Registration is temporarily unavailable. Please try again later.",
    STAFF_REGISTRATION_FAILED: "Registration could not be submitted. Please try again.",
  };
  return messages[code] || "Registration could not be submitted. Please try again.";
}

export default function StaffRegistrationPage() {
  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    address: "",
    emergencyContact: "",
    photo: "",
  });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");

  function updateField(field: keyof RegistrationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setMessage("");
    try {
      updateField("photo", await compressPhoto(file));
      setTone("success");
      setMessage("Photograph ready.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "PHOTOGRAPH_INVALID";
      setTone("error");
      setMessage(friendlyMessage(code));
    } finally {
      setPhotoBusy(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/staff-registration", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({ ok: false, code: "STAFF_REGISTRATION_FAILED" }));
      if (!response.ok || result?.ok === false) {
        throw Object.assign(new Error(result?.code || "STAFF_REGISTRATION_FAILED"), { code: result?.code });
      }
      setSubmitted(true);
      setTone("success");
      setMessage("Registration received.");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "STAFF_REGISTRATION_FAILED";
      setTone("error");
      setMessage(friendlyMessage(code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="portalSignInPage portalEntryPage">
      <section className="portalSignInCard portalEntryCard portalRegistrationCard" aria-labelledby="registration-title">
        <Link className="portalBackLink" href="/portal/sign-in">← Back to Staff Portal</Link>
        <p className="eyebrow">STAFF PORTAL</p>
        <h1 id="registration-title">{submitted ? "Registration received." : "New Staff Registration"}</h1>
        {!submitted ? <p>Share the approved staff details below. Management reviews every registration before an identity or portal access is activated.</p> : <p>Your registration is on file as <strong>Pending Management Approval</strong>. No password, assignment or module access has been created.</p>}

        {!submitted ? <form className="portalAuthForm portalRegistrationForm" onSubmit={submit}>
          <label>Full Name<input name="fullName" autoComplete="name" required maxLength={160} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
          <label>Phone Number<input name="phone" type="tel" autoComplete="tel" required maxLength={40} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
          <label>WhatsApp Number<input name="whatsappNumber" type="tel" autoComplete="tel" maxLength={40} value={form.whatsappNumber} onChange={(event) => updateField("whatsappNumber", event.target.value)} /></label>
          <label className="portalFieldWide">Address<textarea name="address" rows={3} maxLength={500} value={form.address} onChange={(event) => updateField("address", event.target.value)} /></label>
          <label className="portalFieldWide">Emergency Contact<input name="emergencyContact" maxLength={240} placeholder="Name and phone number" value={form.emergencyContact} onChange={(event) => updateField("emergencyContact", event.target.value)} /></label>
          <label className="portalFieldWide">Photograph<input type="file" accept="image/*" capture="environment" onChange={choosePhoto} /></label>
          {form.photo ? <div className="portalPhotoPreviewWrap portalFieldWide"><img className="portalPhotoPreview" src={form.photo} alt="Selected staff photograph preview" /><button className="portalSecondaryButton" type="button" onClick={() => updateField("photo", "")}>Remove photograph</button></div> : null}
          <p className="portalFormHelp portalFieldWide">{photoBusy ? "Preparing photograph…" : "The photograph is resized before submission. Documents and passwords are not requested."}</p>
          <button className="primaryButton portalFieldWide" disabled={busy || photoBusy} type="submit">{busy ? "Submitting securely…" : "Submit Registration"}</button>
        </form> : null}

        <p className={"portalAuthMessage " + (message ? "isVisible " : "") + "portalAuthMessage--" + tone} role="status" aria-live="polite">{message}</p>
        <div className="portalEntryActions">
          <Link href="/portal/account-recovery?mode=reset">Forgot Password</Link>
          <Link href="/portal/account-recovery?mode=activation">Activate Existing Account</Link>
          <Link href="/portal/help">Need Help Signing In?</Link>
        </div>
      </section>
    </main>
  );
}
