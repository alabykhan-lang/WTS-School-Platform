import { school } from "./site-data";

export function FloatingWhatsApp() {
  return <a className="whatsAppButton" href={school.whatsappHref} target="_blank" rel="noreferrer" aria-label="Contact Way to Success Standard Schools on WhatsApp" title="Chat with us on WhatsApp"><svg aria-hidden="true" viewBox="0 0 32 32" focusable="false"><path d="M16 3.2a12.5 12.5 0 0 0-10.7 19L3.6 28l6-1.6A12.5 12.5 0 1 0 16 3.2Zm0 22.9c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.5.9.9-3.4-.3-.4a10.3 10.3 0 1 1 8.9 4.6Zm5.6-7.7c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2.1-.4 0-.5l-.9-2c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5 0 1.5 1.1 3 1.2 3.2 1.1 1.6 2.7 3 4.5 3.9.7.3 1.2.5 1.7.7.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3Z" fill="currentColor" /></svg><b>WhatsApp</b></a>;
}
