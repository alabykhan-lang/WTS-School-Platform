/* Shows the "answer ready" notice from the assistant page itself. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/assistant";
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = tabs.find((client) => client.url.includes("/assistant"));
    if (open) {
      if (open.navigate) await open.navigate(url).catch(() => {});
      await open.focus().catch(() => {});
      return;
    }
    await self.clients.openWindow(url);
  })());
});
