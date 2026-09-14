# TeamPlus CRM + ERP: product blueprint and provider review

Prepared 14 September 2026. This document separates source evidence, product recommendations, the working first version, and implementation still required. The project is not yet a production ERP.

## 1. Recommendation

Build a **job-centred operating system for TeamPlus**. A customer relationship should connect enquiries, requirements, quotation revisions, accepted scope, artwork versions, production instructions, purchases, installation, invoices, and payment allocations. The job is the common reference across departments; commercial documents and fulfilment records retain their own identities and lifecycles.

Keep TeamPlus's charcoal and orange brand, with restrained status colors, readable work surfaces, and a prominent next action. Measure success through fewer missed follow-ups, faster quote turnaround, fewer unapproved production runs, and better job profitability. Dashboard appearance alone does not establish product quality.

Use Supabase as the initial backend to minimize setup and operating work. The custom-build direction best fits the user's request to create from scratch and control the experience. Before committing a large implementation budget, benchmark the hardest manufacturing and finance scenarios against ERPNext. It already documents quotation and manufacturing concepts; its exact fit and customization cost for TeamPlus still need a real scenario demonstration. [ERPNext quotations](https://docs.frappe.io/erpnext/quotation), [ERPNext manufacturing](https://docs.frappe.io/erpnext/manufacturing).

## 2. What was reviewed

| Source | Reviewed evidence | Implication |
|---|---|---|
| `Rytzu (1)(1).pdf`, all six pages | DealConverter company brochure; CRM, WhatsApp, field sales, automation and access-control claims | Useful CRM and communication requirements; insufficient evidence for manufacturing or finance fit |
| `Teamplus Crm.pdf`, one page | Modules, seven roles, responsive web requirement, dark/orange palette and lead-to-payment sequence | Primary supplied product brief; requires detailed behaviour and acceptance criteria |
| `Teamplus Crm.png` | Dark dashboard, customer list, funnel, communications, follow-ups, financial metrics and quick actions | Strong business identity and a useful overview; several interaction and data-definition gaps |
| `WhatsApp Image 2026-09-11 at 22.18.40.jpeg` | Dashboard, mobile mockup, customer timeline, project stages and quote-to-order concept | Broader journey coverage; static presentation is not proof of working functionality |
| `www.teampluz.com` | Creative branding, design, websites, marketing and physical display/signage offerings | Support service projects alongside manufactured and installed products |
| `product.teampluz.com` | Promotional tents, umbrellas, merchandise, LED signage, tables and display stands | Requirements must represent product variants, materials, finishing and quantities |
| `teamplus.in` and `www.teamplus.in` | Could not retrieve usable content through the browsing service | No conclusions drawn about this site's content or capabilities |

The public descriptions support a mixed creative-services and promotional-products business. They do not reveal internal staffing, transaction volumes, accounting practices or production capacity. Those remain assumptions to validate. [TeamPluz agency](https://www.teampluz.com/), [TeamPluz products](https://product.teampluz.com/).

## 3. Provider review

### Rytzu / DealConverter

The brochure explicitly promotes lead/contact management, lead distribution, deal tracking, tasks, reminders, custom fields, reporting, email integration and role-based access. It also promotes WhatsApp lead capture, two-way chats, shared inboxes, message tracking, automated replies and campaigns. Its field-sales material includes work assignment, visits, routes, geofencing, expenses and tracking.

**Useful ideas to carry forward:** shared inbox ownership; communications linked to customer records; a required next action on open opportunities; source attribution; configurable sales stages; mobile access; scoped permissions.

**Not established by the supplied brochure:** quote line items and revision history; dimensions-based pricing; bill of materials; stock reservation and valuation; purchase/receipt controls; artwork version approval; production routing; subcontracting; quality rejection/rework; partial delivery; customer proof of acceptance; invoice/receipt allocation; ledger integrity; backup and restore guarantees; API contracts; data export completeness; pricing or implementation deliverables.

“Not established” does not mean the vendor cannot supply a feature. It means the document cannot substantiate it. The company history, customer count and support claims are vendor statements, not independently verified findings.

A meaningful vendor demonstration should use one TeamPlus scenario: a customer requests two signage sizes and fifty printed umbrellas, negotiates a quote revision, pays an advance, changes artwork, partially receives the order, and pays the balance after installation. Require the vendor to show traceability through each step and then export the records and attachments.

### TeamPlus brief and image concepts

**Keep:** brand identity, customer continuity, global search, familiar department labels, role-aware access, follow-up ownership, quote-to-order continuity, and the customer timeline.

**Improve:**

- Reduce competing gradients and highly saturated status blocks. Orange identifies the principal action; stage colors support recognition.
- Group navigation into customer/sales work, execution, and business administration. Show frequent actions in the record where they are needed.
- Define metrics precisely. “Sales” might mean accepted orders, invoiced amounts or cash received; those must be separate metrics.
- Avoid positive green arrows for growing overdue balances or other negative outcomes. Comparisons need a real baseline and matching time periods.
- Prioritize exceptions: missing artwork approval, late production, stock shortage, delivery blockage and overdue balance.
- Use detail panels to keep users in their queue. Give each transition its own evidence and permission requirements.
- Add loading, empty, validation, conflict and failure states; the supplied images do not show them.
- Remove promotional banners and repeated branding from the work area. Use the space for operational decisions.
- Make the customer timeline a cross-document history, with revision, actor and timestamp, rather than a sequence of unstructured chat messages.

## 4. Product architecture and business model

Support three job types behind a consistent customer experience:

| Job type | Typical route | Important differences |
|---|---|---|
| Creative/digital service | Brief → estimate → acceptance → design/work → review → delivery → billing | Milestones, revision allowance, retainers, time costs; no mandatory material reservation |
| Custom print/promotional product | Enquiry → costed quote → order → artwork approval → materials → production → QC → dispatch | Quantity, printing process, product variants, spoilage, batch and supplier data |
| Signage/installation | Survey → measurement → costed quote → order → artwork → fabrication → QC → installation → sign-off | Dimensions, electrical specifications, site readiness, crew, travel, installation evidence and warranty |

Do not force every service engagement through a manufacturing route. Split complex orders into jobs or work packages while preserving one customer order and its approved commercial terms.

### Core records and relationships

- **Organization / membership / role:** workspace boundary and server-enforced permissions.
- **Customer / contact / site:** stable customer IDs, multiple contacts, billing and installation addresses. A name is a display field, not an identity key.
- **Opportunity / requirement:** source, owner, expected value, deadline, scope, qualification, next action and lost reason.
- **Quote / revision / lines:** immutable issued versions; item or service specifications, units, quantities, dimensions, prices, discounts, charges, tax classification and terms.
- **Sales order / order lines:** snapshot of accepted quotation and acceptance evidence.
- **Job / work package / routing:** linked order lines, department handoffs, deadlines, resource plan, blockers and progress.
- **Artwork / version / approval:** binary object, checksum, filename, creator, version, comments and customer decision.
- **Product / variant / material / BOM:** unit-aware specifications and estimated inputs.
- **Purchase order / receipt / stock movement:** procurement, receipts, reservation, issue, return, adjustment and valuation.
- **Delivery / installation / proof:** partial quantities, site, crew, evidence and customer acknowledgement.
- **Invoice / credit note / payment / allocation:** financial documents and reconciled allocations; never infer an accounting ledger from a project balance field.
- **Task / communication / activity / attachment:** linked to relevant business records.

One accepted quotation can create several order lines and jobs. A job can have many artwork versions, materials, production tasks and deliveries. A payment can be allocated across invoices. Reports should follow these relationships instead of copying the same monetary amount into several modules.

## 5. Module requirements and acceptance criteria

| Module | Required product behaviour | Acceptance example |
|---|---|---|
| Customers | Contacts, sites, history, duplicate handling, communication preferences | One customer opens with all active jobs and unpaid invoices |
| Leads | Source, ownership, pipeline, next action, lost reason, duplicate prevention | Repeated delivery of the same inbound lead does not create duplicates |
| Communications | Assigned shared inbox, linked messages, internal notes, delivery/failure state | Staff can see who owns a conversation and whether a message actually sent |
| Quotations | Itemised costing, revisions, expiry, discount approvals, customer acceptance | Accepting revision 3 never creates an order from revision 2 |
| Orders/jobs | Accepted-scope snapshot, dependencies, owner, delivery commitment, change order | Post-approval scope changes require a visible change order |
| Design | Versions, comments, revision rounds, production-ready assets, recorded approval | Replacing approved artwork revokes readiness until the replacement is approved |
| Production | Work queue, material readiness, routing, capacity, planned vs actual effort | A job blocked for material cannot silently appear ready for fabrication |
| Quality | Job-specific checklist, inspection evidence, pass/fail, rework path | A failed inspection creates rework and prevents dispatch |
| Delivery | Dispatch and installation views, partial fulfilment, site readiness, proof | Twenty of fifty units can be delivered without closing the remaining thirty |
| Inventory | Units and conversions, receipts/issues, reservations, returns, reorder rules | Reservation reduces available stock without changing physical stock |
| Purchasing | Vendors, requests, approvals, purchase orders, goods receipt, discrepancies | Receiving short quantity preserves the unreceived balance |
| Finance | Invoices, advances, receipts, allocations, credit notes, reconciliation | A payment retry cannot produce a second receipt |
| Tasks | Owner, due time, completion, reminders and linked record | An overdue next action is visible to the responsible person |
| Files | Private access, version metadata, download audit and large-file handling | Staff outside a job's scope cannot download its files by guessing a URL |
| Reports | Metric definitions, date basis, drill-down, estimated vs actual values | Report totals reconcile to their underlying records |
| Administration | Organization settings, permission matrix, audit access, integration state | Changing a client-side role cannot grant server permissions |

## 6. UI/UX system

### Navigation and surfaces

Use a charcoal sidebar, an unobtrusive header, global search, and a task-oriented content area. The overview begins with a small number of defined metrics and next actions. Sales uses a pipeline board; production uses stage queues; finance uses amount-focused tables. Avoid forcing every module into the same dashboard layout.

Open record details in a side panel for quick review and edits. Longer operations, such as a multi-line quotation or installation plan, deserve a full page with a persistent save state. Back navigation must preserve filtering, sorting and scroll position.

### Visual language

- Base background around `#101113`; working panels around `#181A1D`; subtle neutral borders.
- TeamPlus orange around `#FF6A00` for primary actions and selected navigation. Use softer orange text where contrast requires it.
- Main working text generally 14–16 px or larger; 12 px for secondary metadata. Respect zoom and font preferences.
- Consistent 4/8 px spacing system, 8–10 px radii, thin icon strokes and restrained motion.
- Numbers use consistent Indian currency grouping. Clearly show whether values include taxes.
- Status always includes a word or icon; color alone must not carry meaning.
- Label controls, preserve keyboard focus, support dialogs and drawers with escape/focus management, and offer usable mobile controls.

Target WCAG 2.2 AA during implementation and audit, including keyboard operation, visible focus, contrast, error communication and usable target sizes. The current build has not undergone an accessibility conformance audit. [W3C WCAG reference](https://www.w3.org/WAI/WCAG22/quickref/).

### Role-specific start pages

| Role | First useful view | Financial access recommendation |
|---|---|---|
| Owner / Admin | Overdue commitments, pipeline, job margin and collections | Full business scope, subject to finance controls |
| Sales | My leads, today's actions, expiring quotes | Prices and approved discounts; costs only if allowed |
| Designer | Briefs, review queue, latest artwork and approvals | No default access to salaries or financial ledgers |
| Production | Ready jobs, material blockers, deadline and QC queue | Relevant material/production cost if permitted |
| Accounts | Advances, invoice exceptions, allocations and reconciliation | Finance scope; no need to edit artwork approvals |
| Delivery | Assigned jobs, site contacts, dispatch and installation checklists | Limited collection instructions when required |

## 7. Recommended stack for a quick, affordable launch

**Choose Supabase for TeamPlus's initial production backend.** The user's priority is a quick, usable, inexpensive product. Start with React/TypeScript and Supabase PostgreSQL, Auth, private Storage and a small set of server-side workflow functions. A separate NestJS service, Redis and microservices are unnecessary for the first release.

Keep the existing React interface. Next.js is acceptable if retaining it saves time; a React/Vite static frontend is also sufficient for an internal CRM without public SEO needs. Do not rewrite working UI merely to change frameworks.

| Layer | Initial choice | Responsibility |
|---|---|---|
| Interface | React + TypeScript, existing Tailwind/Shadcn primitives | Responsive TeamPlus workspace and validated forms |
| Relational database | Supabase PostgreSQL | Customers, quote revisions/lines, orders, jobs, payments and tasks with foreign keys and transactions |
| Staff identity | Supabase Auth | Individual sign-in; application membership and permission tables define access |
| Authorization | PostgreSQL row-level security plus server-side action checks | Organization scope, staff permissions, file access and permitted transitions |
| Files | Private Supabase Storage buckets | Artwork and approval evidence; authorized access instead of public object URLs |
| Business actions | Next.js route handlers or Supabase Edge Functions; PostgreSQL functions for atomic changes | Approve a quotation, convert an order, book a receipt, advance production and verify webhook events |
| Notifications | Database-backed scheduled tasks initially | Add a dedicated queue only when retry volume or long-running work requires it |
| Frontend hosting | Existing deployment during review; static hosting or a small managed web runtime for rollout | Keep the application separate from the backend service subscription |

Keep finance and inventory operations atomic. Three independent browser writes are not a substitute for a transaction. Never expose Supabase secret/service-role credentials in the browser. Row-level security must be enabled and tested on exposed tables; authentication alone does not implement TeamPlus's staff permissions. [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Edge Functions](https://supabase.com/docs/guides/functions).

### Cost and alternatives

Prices checked on 14 September 2026; USD, before taxes, add-ons and excess usage.

| Option | Current entry cost | Assessment for TeamPlus |
|---|---|---|
| Supabase | Free for development; Pro starts at $25/month with the first project/Micro compute covered by included credit | Recommended balance of relational data, bundled identity/storage, development speed and operating effort |
| Firebase with Firestore | Free allowances, then usage-based billing | Viable, but the document model needs careful planning for related CRM/ERP records and reports |
| Firebase SQL Connect | PostgreSQL via Cloud SQL; separate database and usage pricing | A valid relational alternative, especially for an existing Firebase/Google team; it is incorrect to describe all Firebase options as NoSQL |
| PocketBase | Open-source software; hosting and maintenance are separate | Useful for smaller experiments, but its own docs caution against production-critical use before 1.0; not my choice for the core ERP |

Supabase Free includes a 500 MB database and 1 GB file storage, and may pause after a week of inactivity. Pro includes 8 GB database disk, 100 GB file storage and daily database backups retained for seven days. One small project starts at $25/month; larger compute, additional projects, overages and optional features increase cost. Use Free while developing and Pro when the business begins depending on it. [Supabase pricing](https://supabase.com/pricing).

Supabase database backups do not include Storage object bytes. Plan artwork/file backup separately before business rollout. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

Firebase prices Firestore by usage beyond its allowances. Its SQL Connect documentation describes a managed PostgreSQL service, so Firebase can also serve relational applications; the comparison is about development fit and total cost, not feasibility. [Firebase pricing](https://firebase.google.com/pricing), [Firebase SQL Connect](https://firebase.google.com/docs/sql-connect). PocketBase documents its own production-readiness limitations. [PocketBase documentation](https://pocketbase.io/docs/).

A practical initial budget is the **$25/month Supabase Pro base plus frontend hosting, email, domain, WhatsApp and any excess usage**. It is not a complete all-inclusive cost estimate. Artwork downloads and messaging volume are important variables. Avoid premature extra services and paid add-ons.

### Fast release sequence

1. Connect a TeamPlus-owned Supabase project and configure individual staff sign-in.
2. Create normalized customers, memberships, jobs, activities and tasks with tested RLS policies.
3. Replace the preview's D1/R2 persistence and platform identity adapters; keep the React components and validated workflow behaviour.
4. Add itemized quote revisions, acceptance and payment records before real commercial use.
5. Pilot customer → enquiry → quote → job → delivery → collection with a small team.
6. Add inventory, purchasing, capacity planning and accounting integration after the core workflow is dependable.

Aim for a narrow usable release first. An indicative 2–4 week pilot target can be considered with one or two experienced engineers, available account access and fixed MVP scope; it is a planning estimate, not a commitment for the complete ERP.

### Current connection status

Supabase has **not** been provisioned or connected in this session. No Supabase tool or project credentials are available. The current private review build still uses D1/R2 and Sites sign-in. This document sets the recommended next implementation path; it does not claim the database or identity migration has happened.

### When to add a separate backend

A dedicated NestJS service or queue can be introduced later for extensive integrations, long-running jobs, complex scheduling or independent service ownership. Keep domain logic organized now so it can move without rewriting the UI. Defer that infrastructure until a measured requirement justifies it.

## 8. Working first version in this workspace

The implemented first version is a private, owner-scoped workflow application with illustrative data. It is suitable for product review and testing, not staff rollout or accounting reliance.

Implemented:

- Dark/orange application shell with grouped navigation, responsive layouts, search and detail panels.
- Overview calculated from the saved job records; no invented period-over-period growth percentages.
- Create/edit enquiries with requirements, source, owner, estimated value/cost, priority and delivery target.
- Sales pipeline, customer summaries, project lists, artwork queue, production board, delivery list and collections register.
- Saved stage progression: new lead → qualified → quotation → confirmed → design → production → quality check → ready → delivered → paid.
- Server-validated artwork approval and QC evidence, delivery confirmation and payment bounds.
- Pricing/scope lock after production starts; stale-version protection for competing job edits and payments.
- Job timeline notes and events, persisted tasks, job attachments and authenticated file downloads.
- Estimated margin/business-line reports and CSV export with spreadsheet formula neutralization.
- Sign-in, identity-scoped record/file access, same-origin write checks and durable D1/R2 storage.

Current runtime: React/TypeScript, the Sites-compatible Vinext starter, Cloudflare Workers, D1 and R2. The starter currently pins a beta Vinext release. This is an implementation constraint of this preview, not a recommendation to use a beta framework or the current D1 payload model for TeamPlus's production ERP.

The preview stores a job payload per row to make the first workflow reviewable. The production model should normalize customers, quote lines, orders, approvals, payments and stock movements. The owner-private preview does not implement shared organization membership; different identities receive isolated workspaces.

## 9. Explicit limitations and remaining implementation

- **CRM:** no normalized customer/contact/site master, deduplication, lead import, lost/cancelled state or real inbound lead integration yet.
- **Quotations:** project estimates only. No itemized pricing, tax calculations, issued quote revisions, acceptance links or sending. The printed estimate explicitly says it is a draft.
- **Roles:** no multi-user staff accounts or configurable role enforcement yet. Owner-private sign-in is implemented; role selectors are not used to pretend authorization exists.
- **Operations:** the preview has one linear route. Conditional routes, parallel work packages, capacity scheduling, change orders, rework and partial deliveries remain.
- **Inventory/procurement:** no actual stock ledger, BOM consumption, purchase orders, receipts, reservations or supplier workflow.
- **Finance:** collections are attached to jobs. No statutory invoices, credit notes, bank reconciliation, tax filing, general ledger or certified financial reporting. Monetary entry is currently whole INR; production finance needs minor units/decimal arithmetic and defined rounding.
- **Communications:** internal notes only. WhatsApp, email, calls, campaign delivery and reminders are not connected. No message is sent by this build.
- **Files:** private upload/download is implemented with a 10 MB limit. Structured artwork versions, annotations, malware scanning, document previews and retention policies remain.
- **AI:** no generated lead scores or automated customer replies. Future AI can summarize history and suggest actions, with grounded references and human review for external actions.
- **Reliability:** production backup/restore verification, disaster recovery, observability, pagination/large data tests, rate limits, migration rehearsals and retention controls remain.
- **QA:** API and workflow checks have been run. Browser interaction, mobile visual, print output and accessibility audits have not been performed. Optional WebMCP hooks are feature-detected; no supported validation context was available to verify them.

## 10. Production controls to design before rollout

1. Enforce organization and record permissions on every read, write, export, search and attachment request. Include negative permission tests.
2. Require quotation and artwork version IDs at approval, preserve accepted snapshots, and explicitly invalidate readiness after relevant changes.
3. Separate state machines for opportunity, quote, job, delivery, invoice and payment. Do not use one generic status field as the financial system.
4. Use transactions, unique constraints, version checks and idempotency keys for money, stock and inbound integrations.
5. Record actor, timestamp, transition, reference and before/after values for sensitive changes. Restrict audit mutation and export.
6. Model stock movements as append-only business events with controlled reversals and reconciliation, not editable quantity totals.
7. Select the accounting source of truth with TeamPlus's accountant. Map tax/document fields and rounding to verified current requirements before issuing real documents.
8. Use staged file uploads, scanning, validated ownership and controlled downloads; large binary processing belongs in workers.
9. Keep operational alerts actionable. A failed integration should remain visible with a safe retry path rather than claim success.
10. Define recovery targets and prove them with a restore drill before relying on the system for daily operations.

## 11. Delivery plan

Indicative sequencing below is an engineering planning estimate, not a committed deadline or vendor quotation. It assumes a dedicated product/operations owner, two experienced engineers, part-time design/QA and timely access to reference data. Staffing, integrations and data quality can materially change duration.

| Phase | Indicative duration | Exit condition |
|---|---|---|
| Discovery and workflow validation | 1–2 weeks | Representative jobs, field definitions, exception paths and permission matrix agreed |
| CRM and commercial foundation | 3–5 weeks | Customer IDs, lead capture, quote revisions, acceptance, order creation and migration tested |
| Artwork and fulfilment | 3–5 weeks | Version approvals, production routing, QC, partial delivery and installation demonstrated |
| Purchasing, stock and job costing | 3–5 weeks | Procurement and stock movements reconcile to actual material usage |
| Finance integration and controlled pilot | 3–5 weeks | Invoices/payments reconcile, permissions and restore tests pass, pilot users complete real cases |

Some tasks can overlap, but operational dependencies remain. Prioritize completion of one real order lifecycle before expanding dashboards or adding advanced automation.

### Pilot success measures

Establish a baseline first. Suggested measures: median first-response time; median quote turnaround; open leads without a next action; percentage of production starts with approved artwork; on-time delivery rate; rework percentage; estimated-versus-actual job margin; and unallocated/overdue receipts. Agree numerical targets only after observing TeamPlus's current workflow.

### Required acceptance scenarios

- New and repeat customers; duplicate inbound lead delivery.
- Revised quotation with changed quantities and discount approval.
- Service-only job that skips manufacturing.
- Approved artwork replaced by a new version.
- Material shortage, subcontracting and rejected QC.
- Partial dispatch and second installation visit.
- Advance payment, split payments, overpayment, refund and credit note.
- Two users updating the same record concurrently.
- Restricted user searching or downloading another department's records.
- Message delivery failure and idempotent retry.
- Import reconciliation and database/file restoration.

## 12. Operational details still to confirm

These are discovery inputs for the next phase, not obstacles to reviewing the current build:

- Legal entity name and preferred display spelling: TeamPlus / Teampluz.
- Number of branches, employees, roles, customers, active jobs and daily transactions.
- Current accounting software and whether it remains the financial source of truth.
- Current quotation templates, product/rate sheets, standard materials and costing rules.
- In-house versus outsourced printing, fabrication, installation and procurement.
- Payment terms, credit limits, discount authority and approval thresholds.
- WhatsApp Business ownership and existing email providers.
- Most frequent units, dimensions, variants, taxes and installation requirements.
- Data migration sources and file volumes.
- Preferred hosting ownership, deployment region, budget, recovery requirements and maintenance team.

Start the next implementation phase with one anonymized but realistic completed job, including its quote revisions, artwork, material costs, invoice and receipts. That provides a stronger specification than another dashboard mockup.
