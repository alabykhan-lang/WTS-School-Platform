# WTS Workspace: Role Views

## Common view

Every authorised staff member receives the same high-level structure:

- identity header;
- current session and term;
- assigned-module count;
- responsibility summaries when present;
- module cards for active grants; and
- direct launch links to specialist services.

The common view is read-only.

## Class teacher

The class-teacher section appears only when an active `class_teacher` role and active class scope exist. It is limited to those class scopes, filtered by the current context when scope metadata supplies one.

Where real records exist, the class card shows:

- class name and context;
- active pupil, male and female counts;
- expected subjects and subjects with scores;
- incomplete subjects and pupils with missing required scores;
- report-card readiness;
- attendance status, absent pupils and repeated-absence alerts;
- incomplete Registry links;
- announcement availability; and
- Results, Attendance and Registry launch links.

If no active assignment exists, the dashboard says so and does not display another class as a substitute.

## Subject teacher

The subject-teacher section is limited to active subject scopes belonging to the signed-in person. Each assignment shows:

- class and subject;
- current session and term;
- pupil count;
- recorded and missing score counts where available;
- score-entry progress;
- submission status, or an explicit unavailable state;
- publication status where available; and
- a direct Results link.

The teacher’s own Attendance summary appears only when operational staff-attendance records exist.

## Administrator

The administrator section appears only when the server finds a current grant with an administrative permission such as an authorised platform/access-management permission or Result-management permission. It is never derived from `designation`, `staff_category` or a display label alone.

When authorised, the dashboard may show:

- active pupil and staff totals;
- class-by-class Result readiness;
- missing-score alerts;
- attendance overview, when operational;
- Registry completeness;
- publication counts; and
- direct module links.

Approval and publication actions remain in the specialist module.

## Empty states

Empty states are part of the contract. They are not replaced by zeroes unless the source explicitly returns a real zero. Examples include:

- `No current class or subject assignment is recorded.`
- `No subject assignment has been recorded for this term.`
- `Attendance reporting will appear after operational attendance data becomes available.`
- `No Registry issues were found.` only when the authorised source actually returns a verified zero.

