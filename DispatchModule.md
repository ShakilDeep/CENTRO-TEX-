# Dispatch Module — User Stories

**Epic:** E2 — Dispatch Module
**Module:** 01

---

## ST-DISP-001: Dispatch creates a new sample record and dispatches the item to the user

**Labels:** `module::01-dispatch` `type::feature` `status::ready` `role::dispatch`

### User Story

As a Dispatch user, I want to create a sample record with factory and receiver information, so that the system has a record before the physical sample arrives and the receiving merchandiser is notified.

### Context

Dispatch clicks "Create Sample" for samples arriving from foreign buyers or factories. They enter the factory name (optional) and select the intended receiver (mandatory, generally a merchandiser). The system timestamps creation automatically.

### Data Model

| Field | Type | Source | Required |
|---|---|---|---|
| receiver (Merchant) | Dropdown | ERP Library | Mandatory |
| factory | Dropdown | ERP Library | Optional |
| created_at | Timestamp | System, auto | Auto |
| status | Enum | System, auto | Auto, defaults to "Pending Acceptance" |

### Acceptance Criteria

- [ ] Dispatch role can access "Create Sample"
- [ ] Form shows Factory (optional, ERP-sourced dropdown) and Merchant/receiver (mandatory, ERP-sourced dropdown)
- [ ] On submit, system creates a Sample record with status "Pending Acceptance" and an auto-generated `created_at` timestamp
- [ ] The assigned receiver is notified immediately
- [ ] The new record is queryable via Sample Lookup (E5) immediately after creation, even before acceptance

### API / Integration Notes

- Needs an ERP-sourced list for the Merchant and Factory dropdowns (mechanism not yet specified, see E8)
- Notification channel not specified in source doc, see Open Questions
- RBAC: Dispatch role only

### Dependencies

- Blocked by: **E0** (Sample entity schema, User/Role model)
- Blocked by: **E8** (confirmed ERP data source for dropdown population)

### Open Questions

- The doc separates "Sample Creation" from "Assignment" as two distinct actions; this issue covers Creation only. Confirm Assignment should be its own issue (ST-DISP-002) rather than the same form/transaction.
- Notification channel is unspecified: in-app, email, or push?
- "System timestamp will be there" — confirm whether `created_at` alone is sufficient or a separate `dispatch_date` is also needed (relevant later for Shipment Alerts in E3).

---

## ST-DISP-002: Reassign the sample to a different user/Merch

**Labels:** `module::01-dispatch` `type::feature` `status::ready` `role::dispatch`

### User Story

> ⚠️ **Note:** The body of this issue appears to be a duplicate of ST-DISP-001. The reassignment-specific user story, acceptance criteria, and data model have not yet been filled in. The content below is carried over from the source document and needs to be replaced with reassignment logic.

As a Dispatch user, I want to create a sample record with factory and receiver information, so that the system has a record before the physical sample arrives and the receiving merchandiser is notified.

### Context

Dispatch clicks "Create Sample" for samples arriving from foreign buyers or factories. They enter the factory name (optional) and select the intended receiver (mandatory, generally a merchandiser). The system timestamps creation automatically.

### Data Model

| Field | Type | Source | Required |
|---|---|---|---|
| receiver (Merchant) | Dropdown | ERP Library | Mandatory |
| factory | Dropdown | ERP Library | Optional |
| created_at | Timestamp | System, auto | Auto |
| status | Enum | System, auto | Auto, defaults to "Pending Acceptance" |

### Acceptance Criteria

- [ ] Dispatch role can access "Create Sample"
- [ ] Form shows Factory (optional, ERP-sourced dropdown) and Merchant/receiver (mandatory, ERP-sourced dropdown)
- [ ] On submit, system creates a Sample record with status "Pending Acceptance" and an auto-generated `created_at` timestamp
- [ ] The assigned receiver is notified immediately
- [ ] The new record is queryable via Sample Lookup (E5) immediately after creation, even before acceptance

### API / Integration Notes

- Needs an ERP-sourced list for the Merchant and Factory dropdowns (mechanism not yet specified, see E8)
- Notification channel not specified in source doc, see Open Questions
- RBAC: Dispatch role only

### Dependencies

- Blocked by: **E0** (Sample entity schema, User/Role model)
- Blocked by: **E8** (confirmed ERP data source for dropdown population)

### Open Questions

- The doc separates "Sample Creation" from "Assignment" as two distinct actions; this issue covers Creation only. Confirm Assignment should be its own issue (ST-DISP-002) rather than the same form/transaction.
- Notification channel is unspecified: in-app, email, or push?
- "System timestamp will be there" — confirm whether `created_at` alone is sufficient or a separate `dispatch_date` is also needed (relevant later for Shipment Alerts in E3).

---

> **Document Note:** ST-DISP-002 is a copy-paste duplicate of ST-DISP-001 in the source PDF. The reassignment-specific content (new receiver selection, audit trail, previous receiver notification, etc.) needs to be authored separately.
