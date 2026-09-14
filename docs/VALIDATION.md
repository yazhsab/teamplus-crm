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

Optional WebMCP read/open hooks were added with feature detection and cleanup. No supported validation context was available; these hooks are unverified and are not relied on for the application's normal workflow.
