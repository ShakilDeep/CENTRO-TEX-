# Implementation Plan: CentroFlow Enhancements

This document outlines the step-by-step process to implement the feature enhancements and gap analysis defined in [simi_update.md](file:///f:/CENTRO%20TEX%202.0/simi_update.md).

## 🏢 Branding & Global Changes
- [x] **Rename Project**: Change all UI references from `CENTRO TEX 2.0` to `CentroFlow`.
- [x] **Update Logo**: Use the official Central logo in the navigation/sidebar.
- [x] **Update Terminology**:
    - [x] `Administration context` → `System Administration`
    - [x] `Manage hardware provisions...` → `Manage locations, users, and RFID tags`

---

## 🛠️ Step 1: Database & API Updates (Prisma)
- [x] **Update `Samples` Model** in `schema.prisma`:
    - [x] Add `entry_number`: String (Unique, e.g., ENT-2024-XXXX).
    - [x] Add `sender_origin`: String.
    - [x] Add `receiver_name`: String.
    - [x] Add `purpose`: String (ORDER_CONFIRMATION, STORAGE, EVALUATION, OTHER).
    - [x] Add `assigned_merchandiser_id`: String (Nullable).
    - [x] Add `rfid_status`: String (NOT_LINKED, LINKED) default `NOT_LINKED`.
- [x] **Generate Prisma Client**: Run `npx prisma generate`.
- [x] **Data Migration**: Run `npx prisma db push`.
- [x] **Update `sampleIdService.ts`**: Implement `generateEntryNumber()`.

---

## 🎨 Step 2: Dashboard & Entry Workflow (UI)
- [x] **Update "Create Sample" Modal**:
    - [x] Add Input: `Sender / Origin`.
    - [x] Add Input: `Receiver`.
    - [x] Add Read-only: `Entry Number`.
    - [x] Add Dropdown: `Purpose`.
- [x] **Implementation of "Next Step" Hint**:
    - [x] Show success toast: "Sample created successfully. Next: Encode RFID."
- [x] **New "Encode RFID" Feature**:
    - [x] Add `[Encode RFID]` button to table rows where `rfid_status == NOT_LINKED`.
    - [x] **Encoding Modal**:
        - [x] Display `Sample ID` and `Current Holder`.
        - [x] Add `[Generate RFID]` button (auto-fills ephemeral code).
        - [x] Add `[Write to Tag]` button (simulates RFID writing and updates status).
        - [x] Success notification: "RFID encoded successfully. Sample is now linked."

---

## 🚀 Step 3: Dispatch & Operations (UI)
- [x] **Table Enhancements**:
    - [x] Add Columns: `Sender`, `Receiver`, `Purpose`, `Assigned Merchandiser`.
- [x] **Action Modals**:
    - [x] **[Receive]**: Fields for `Sample ID`, `Sender`, `Timestamp`, `Assigned Holder`.
    - [x] **[Transfer]**: Fields for `Reason`, `New Holder`, `Notes`.
    - [x] **[Store]**: Location/Bin selection with `Timestamp`.
- [x] **Transfer Workflow logic**:
    - [x] Ensure `current_owner_id` updates automatically upon transfer acceptance.
    - [x] Log every action to `SampleMovements`.

---

## 🏗️ Step 4: Storage & Reports (UI)
- [x] **Storage View Page**:
    - [x] Add `Last Action Taken` and `Timestamp` to the stored samples list.
- [x] **Reports Page**:
    - [x] **Fix Alignment**: Ensure `Refresh` and `Export CSV` buttons are aligned.
    - [x] **Filters**: Add `Holder` and `Location` filters to the reporting table.

---

## 🧪 Step 5: Final Verification
- [x] **End-to-End Walkthrough**:
    1. Create Sample (Check Entry # and hints).
    2. Encode RFID (Verify status change).
    3. Receive at Dispatch.
    4. Move to Storage.
    5. Verify Report data and export.

---

> [!NOTE]
> All changes must maintain the premium design aesthetic (vibrant colors, smooth transitions, and glassmorphism where appropriate).
