# Public staff directory data

The staff directory currently reads from `data/staff.ts`. This local source is deliberately limited to public-facing details: name, official role or group designation, public staff category, photograph, display order, active status and public-visibility permission.

It will later be replaced by a secure, read-only API from WTS Central Registry. That API must provide employment status, `showPublicly`, staff category, official role, profile photograph and display order. A public entry must be returned only when the staff member is actively employed **and** has an explicit `showPublicly: true` permission; employment status alone is not enough.
