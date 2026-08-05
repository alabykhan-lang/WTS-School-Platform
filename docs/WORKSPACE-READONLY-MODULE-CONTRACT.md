# WTS Workspace: Read-only Module Contract

## Scope

This contract belongs to the School Platform Workspace boundary. It is a summary-read contract only. It does not replace or alter the operational contracts of Central Registry, Result, Attendance or Notification.

## Request path

`GET /api/workspace`

The route:

1. rejects disallowed origins;
2. reads the host-only Workspace session cookie;
3. calls the existing protected `school_staff_workspace_read_session_api` identity/grant read;
4. calls `school_staff_workspace_read_summary_api` with the same server-held session identifiers;
5. returns `no-store` JSON; and
6. clears the Workspace cookie when the server says the identity session is no longer active.

The summary RPC validates `staff_self_service` centrally before reading any summary data. Its public wrapper is executable only by the server-side runtime role; the internal `wts_internal` function is not exposed to client roles.

## Response shape

The response preserves the existing workspace identity fields and adds:

```json
{
  "ok": true,
  "summary": {
    "person": {},
    "academic_context": {
      "session": "...",
      "term": "...",
      "source": "school_default"
    },
    "class_teacher": {
      "available": false,
      "assignments": [],
      "message": "..."
    },
    "subject_teacher": {
      "available": false,
      "assignments": [],
      "message": "..."
    },
    "subject_assignments": [],
    "staff_attendance": {},
    "administrator_dashboard": null,
    "module_summaries": {}
  }
}
```

Class summaries can include pupil totals, gender counts where recorded, score coverage, missing-score counts, report-card readiness, attendance availability, Registry completeness and announcement availability. Subject summaries can include pupil count, recorded score count, missing-score count, submission availability and publication state.

## Context rule

The Workspace uses the school’s current session and term as its starting context. It does not overwrite a specialist module’s explicitly selected context and does not become a second Result term authority. The summary contract reports only the context it actually used.

## Write prohibition

Workspace must never perform:

- score or Result writes;
- attendance writes;
- Registry edits;
- grant or permission changes;
- publication or approval;
- notification sending; or
- destructive operations.

The SQL migration adds read-only summary functions and does not add sample records, alter specialist models, or update operational rows.

## Availability semantics

`available: false` means the source is not connected or has no operational data for the requested summary. It is not permission to infer or invent a value. A module card may be shown only when the user has a real active module grant; a module status does not grant access.

