# WTS Workspace: Personalised Dashboard

## Purpose

WTS Staff Workspace is a read-only command centre for the signed-in staff member. It identifies the person, presents the current school session and term, summarises authorised responsibilities, and provides direct links to specialist services.

It is not a second Results, Attendance, Registry or Notifications application. Operational changes continue in the specialist module that owns the data.

## Personalisation rule

The dashboard is assembled from the active WTS identity, active employment record, active module grants and active class/subject scopes. A job title alone does not create a dashboard view or broaden a person’s data.

The server filters all summary data before returning it. Hidden cards are a presentation choice only; each specialist module must repeat its own server-side authorisation.

## Identity header

The identity header may show, when present in the authorised source:

- approved staff photograph;
- full name and staff number;
- official position and department;
- employment status;
- current school session and term;
- number of active class-teacher assignments;
- number of current subject assignments; and
- number of authorised module entries.

Missing values remain visible as honest states. For example, an unapproved photograph shows `No photograph has been approved.` and an absent assignment shows `No class-teacher assignment is currently active.`

## Role views

- A class teacher receives summaries only for active class scopes attached to that person and current context.
- A subject teacher receives only the assigned class/subject responsibilities, score progress and publication state that can be read from current data.
- An authorised administrator receives broader summaries only when an active administrative Result or platform grant permits them.
- An ordinary staff member does not receive school-wide counts or unrelated classes.

## Interaction boundary

Workspace controls are limited to navigation, refresh, sign-out and links into protected specialist modules. There are no score, attendance, Registry, permission, publication, notification or destructive controls in Workspace.

## Mobile-first behaviour

The authenticated layout uses a collapsible navigation drawer, a compact identity card, stacked cards, large touch targets, and no wide data tables. Desktop uses a persistent navigation rail and multi-column summary cards.

## Data honesty

The dashboard never creates records or fills gaps with sample values. If a source is not operational or a summary contract is unavailable, the UI states that plainly, for example:

- `Attendance reporting will appear after operational attendance data becomes available.`
- `No subject assignment has been recorded for this term.`
- `Notification summaries are not yet available.`

