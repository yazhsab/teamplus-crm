# Validation record

14 September 2026.

Passed:

- TypeScript static validation (`npx tsc --noEmit`).
- Production build through the Sites build script.
- Local SQLite migration: five tables and two indexes.
- Local production Worker API checks using a disposable synthetic identity.
- Anonymous request rejection and cross-origin write rejection.
- Required fields and negative monetary value rejection.
- Invalid stage-skip rejection.
- Artwork approval required before production.
- Scope changes in Design revoke previous artwork approval.
- Invalid calendar dates rejected.
- Scope/price lock after production begins.
- QC evidence required before ready-to-deliver.
- Delivery evidence required for delivery confirmation.
- Remaining balance prevents paid closure.
- Overpayment rejection; partial and final payment persistence.
- Stale payment retry rejection without double booking.
- Cross-identity access rejection.
- Task creation/completion and subsequent readback.
- Authenticated file upload and byte-for-byte download.
- Attachment-only file response and cross-identity file denial.

Not performed: browser interaction, mobile/desktop visual QA, print rendering QA, screen-reader or WCAG conformance audit, hosted integration testing, load testing, backup restore verification, and full production security review.

After the first private deployment, the optional WebMCP hooks were verified in the local preview: both tools registered with the intended schemas and annotations; job listing returned the saved records; a valid job ID opened the matching visible detail panel; additional read parameters and an unknown job ID were rejected, leaving the existing panel unchanged. This was a focused tool-contract check, not a general browser audit.
