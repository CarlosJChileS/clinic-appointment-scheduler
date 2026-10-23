# Dermatology Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline clinic booking, linked clinical encounters, dermatology tracking and consent handling, and remove mobile overflow.

**Architecture:** Additive TypeORM tables and optional fields retain existing SQLite records. Nest endpoints validate and protect clinical data; Angular adds the corresponding booking, encounter, follow-up, dermatology, and consent workflows. Keep the existing public and workspace applications and correct their responsive layout.

**Tech Stack:** Angular 22, NestJS 12, TypeORM 0.3 with better-sqlite3, Vitest (existing web dependency) and Node test runner for API behavior.

**Spec:** `docs/superpowers/specs/2026-10-23-dermatology-workflows-design.md`

## Global Constraints

- Clinical photos require an active, signed clinical-photo consent and doctor access.
- Procedure-consent records are separate from clinical-photo consent and public-case consent.
- A public case is visible only with an active signed publication authorization.
- Linked appointment and clinical-record writes are atomic and validate patient ownership.
- Clinical entries are authored by the clinician; never generate diagnoses or treatment doses.
- New database fields/tables are additive and old photo paths remain readable as unclassified.
- Follow-up work stays inside the application; no external reminders are sent.
- At mobile widths, no page-level horizontal overflow is introduced.

## Review Focus

- Appointment points to a different patient or already-linked appointment → API rejects before writing; Task 1.
- Existing record with a follow-up date and no explicit status → appears pending; Task 1.
- A revoked or absent publication document while legacy `consent` is true → case is not public; Task 1.
- Missing procedure consent or revoked clinical-photo consent → image/procedure operations cannot silently proceed; Task 1.
- Long names, empty lists and 320–390 px viewport → controls remain reachable with local scrolling only; Task 2.

---

### Task 1: Clinical workflow persistence and API

**Files:**
- Modify: `apps/api/src/entities.ts` — additive fields and dermatology/consent entities.
- Modify: `apps/api/src/app.module.ts` — TypeORM entity registration.
- Modify: `apps/api/src/app.controller.ts` — validation, transactions, authenticated file APIs and publication filtering.
- Create: `apps/api/src/workflows.spec.ts` — real SQLite workflow/validation tests.
- Modify: `apps/api/package.json` and root scripts only if needed to run the API tests with installed tooling.

**Interfaces:**
- Consumes: current Appointment, ClinicalRecord, ClinicalPhotoConsent and PublicCase models.
- Produces: Appointment `tipo_consulta_otro`; ClinicalRecord `seguimiento_estado`; a transactional `POST /api/appointments/:id/record` accepting clinical-record fields and returning `{ record, appointment }`; CRUD under `/api/records/:id/treatments` and `/api/records/:id/procedures`; tagged upload/delete under `/api/records/:id/photos`; procedure-consent register/list/confirm tied to a procedure; a signed publication-consent upload/revoke flow tied to a case.
- A treatment stores clinician-entered product, concentration, presentation, quantity, route, frequency, duration and instructions. A procedure stores kind, date, site, details and procedure state. A biopsy stores request state, result text/date and communication date, recipient and channel.
- A clinical photo stores private path, view, anatomical site and capture date. A procedure consent stores signatory/representative, procedure, discussion date, benefits/risks/alternatives, opportunity for questions, understanding confirmation, the signed-file path, signer identity and on-day confirmation.
- A publication consent stores a separate signer, signed file and revocation timestamp. The public cases endpoint returns only cases with a non-revoked signed publication-consent row.
- Standard photo views: `Panorámica`, `Comparación`, `Detalle`; prior paths render as `Sin clasificar`.
- Procedure statuses: `Planificado`, `Realizado`, `Cancelado`.
- Biopsy statuses: `No solicitada`, `Solicitada`, `Resultado disponible`, `Comunicada`; communication requires a date, recipient and channel.

- [ ] Write tests for custom appointment types, atomic linked encounter writes, follow-up defaults/status, procedure/biopsy transitions, active-consent photo writes, and publication filtering.
- [ ] Run the focused API test and confirm each test fails for the missing behavior.
- [ ] Add entities, validation, transaction boundary and access-controlled endpoints.
- [ ] Run focused API tests and verify legacy data stays readable.
- [ ] Fix the public landing page's viewport overflow in its responsive CSS and run the API build.
- [ ] Verify a real SQLite rollback when a linked encounter fails validation, and verify doctor-only file access.
- [ ] Commit the backend task.

### Task 2: Booking, encounter, follow-up and mobile UI

**Files:**
- Modify: `apps/web/src/app/workspace.page.ts` — inline patient creation, custom type detail, appointment selector/link, follow-up queue, treatment/biopsy/photo comparison/procedure-consent workflows and publication-consent upload.
- Modify: `apps/web/src/styles.scss` — responsive workflow layouts, local table scrolling and touch targets.
- Create: `apps/web/src/app/workspace.page.spec.ts` — behavior tests for workflow helpers/components using existing Vitest.
- Modify: `apps/api/src/app.controller.spec.ts` only if the landing style fix is extracted to a testable function.

**Interfaces:**
- Consumes: Task 1 API contracts and enums exactly as listed above.
- Produces: usable responsive flows at 320, 375/390, 768 and desktop widths; contextual follow-up filters and “mark complete”; historical-photo comparison labels; explicit published-case consent evidence.

- [ ] Write failing UI tests for inline patient selection, `Otro` detail validation, linking encounter from a booking, follow-up list transitions and image comparison metadata.
- [ ] Run focused web tests and verify expected failures.
- [ ] Add reactive forms, route navigation and API handlers for each flow.
- [ ] Correct internal mobile overflow and retain accessible controls.
- [ ] Run focused web tests, full web test suite and full repository build.
- [ ] Commit the UI task.

### Task 3: Whole-branch review and final verification

**Files:**
- Review all changed source, tests and workflow documentation.

- [ ] Review the diff for API authorization gaps, sensitive consent mixing, orphaned files, mobile overflow and migration regressions.
- [ ] Fix every Critical and Important finding, then perform a scoped re-review.
- [ ] Run the full repository build and all tests after the final edit.
- [ ] Verify `git status` and report remaining limitations accurately.

## Spec coverage

| Spec requirement | Plan task |
|---|---|
| Inline patient creation, `Otro` detail, atomic appointment/record link | 1 + 2 |
| Follow-up queue with pending/completed states | 1 + 2 |
| Structured treatments and biopsy/procedure results | 1 + 2 |
| Tagged photos and historical comparisons | 1 + 2 |
| Separate procedure, clinical-photo and publication consent | 1 + 2 |
| Public and workspace responsive fixes | 2 |
| Ecuador privacy/legal limits documented | Design spec + Task 3 review |
