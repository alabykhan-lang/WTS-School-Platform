# Public news publishing — future integration note

`data/news.ts` is a temporary local source for the public News & Events routes. It must later be replaced by an authorised, read-only publishing service from the WTS school-management platform; the public website must never write directly to the source.

That service should enforce role-based authorisation, draft and approval workflow, scheduled publication, expiry dates, pinned announcements, category management, approved image uploads and an audit history. A record must be publicly visible only when its status is `published`, its explicit `showPublicly` flag is true, and it has not expired. The explicit visibility flag remains required even when the author or publisher is currently employed or otherwise active.
