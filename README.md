# CENTRO FLOW 2.0 - Operations Dashboard

## Overview

CENTRO FLOW 2.0 is a high-performance enterprise application built to manage complex sample tracking, RFID logistics, secure storage, and real-time organizational workflows. Designed with a decoupled **Fastify + React** monorepo architecture, it provides a premium UI experience backed by a robust, secure Node.js API ecosystem.

---

## 🆕 What's New

### Pull-Request Transfer Flow
*   Any user can now **request a sample** that is currently held by another user directly from the **Locator** page.
*   The current owner receives a live **"Received — Yes or No?"** handover popup (floating card, minimizable) and must explicitly confirm or decline the handover.
*   The request includes a mandatory **reason field** so context is always captured in the audit trail.
*   The Merchandiser page now shows separate notification badges and polling for both **incoming** and **outgoing** pending transfers.
*   New backend service methods: `pullRequestTransfer()` and `confirmHandover()` — both atomic Prisma transactions.
*   New API routes: `POST /transfers/pull-request/:sampleId`, `GET /transfers/outgoing-pending`, `POST /transfers/confirm-handover/:transferId`.

### RFID Hot-Swap Encoding
*   Encoding a sample with an RFID tag that is **already linked** to another sample no longer throws an error.
*   The system automatically **unlinks** the tag from the previous sample first, logs an `RFID_UNLINKED` movement entry for the old sample, then assigns it to the new one — all within a single atomic transaction.

### Status-Aware Action Buttons
*   Action buttons (Encode, Transfer, Store) across all pages are now gated by an `ACTIONABLE_STATUSES` constant.
*   Samples in terminal states (`DISPOSED`, `LOST`) no longer show interactive action controls, preventing invalid operations.
*   Transfers are now permitted from the `IN_TRANSIT_TO_DISPATCH` status in addition to `AT_DISPATCH`, `WITH_MERCHANDISER`, and `IN_STORAGE`.

### Floor Sample Image Upload (Admin)
*   The **New Floor Sample** form in the Admin (Floor Counter) page now supports attaching a **photo** to a sample at creation time.
*   Images are previewed inline before submission and can be removed before saving.
*   Stored as Base64 data URLs in the `photo_url` field, immediately visible in sample detail views.

---

## 🏗️ Architecture & Technical Stack

The project utilizes a modern **Monorepo Architecture**, physically separating the `frontend (web)` and `backend (api)` into their respective workspace directories.

### Technology Stack
*   **Frontend (`apps/web`)**
    *   **Core:** React 19 / Vite
    *   **State & Queries:** Zustand (State Management), TanStack React Query (SWR caching & mutations)
    *   **Auth:** Clerk / Custom JWT / Azure AD integration
    *   **Styling:** Tailwind CSS / Framer Motion (Glassmorphism & Micro-animations)
    *   **UI Components:** Lucide React, Recharts (Data Visualization), HTML5-QRCode
*   **Backend (`apps/api`)**
    *   **Core:** Node.js / Fastify 5 (Ultra-fast web framework)
    *   **Database:** SQLite (WAL mode enabled for high concurrency)
    *   **ORM:** Prisma ORM 5 for type-safe schema management
    *   **Security:** `@fastify/rate-limit`, `@fastify/jwt`, `bcrypt`, Azure AD Passport strategy
    *   **Types:** Strict TypeScript across the entire monorepo

---

## 🗃️ Domain Data Model

The system operates on a robust relational data model (managed via Prisma):

- **Users:** Role-Based Access Control (RBAC) supporting `MERCHANDISER`, `DISPATCH`, and `ADMIN` roles. Includes MFA and JWT refresh token tracking.
- **Samples:** The core entity tracking status (`IN_TRANSIT_TO_DISPATCH`, etc.), ownership, location, RFID links, and an optional `photo_url`.
- **SampleMovements:** An append-only audit trail logging every action, state change, RFID scan, and RFID unlink event (`RFID_UNLINKED`).
- **SampleTransfers:** Workflow management for requesting, accepting, rejecting, or confirming pull-request handovers.
- **RfidTags:** Manages the lifecycle of physical EPC tags (`AVAILABLE`, `ACTIVE`). Hot-swap safe — re-assigning a tag auto-unlinks it from its previous sample.
- **StorageLocations:** Hierarchical tracking (`Rack` → `Shelf` → `Bin`) with capacity management.
- **Factories:** ERP-sourced factory list used for sample origin selection in create forms.
- **Notifications:** In-app alerts for transfers, dispatches, pull requests, and system events.

---

## 🛡️ Security & Authentication Model

CENTRO FLOW 2.0 prioritizes both frictionless user experience and production-grade security.

### 1. Multi-Strategy Authentication
The backend supports multiple authentication strategies:
*   **Azure AD (SSO):** Enterprise single sign-on integration.
*   **Local JWT:** Custom JWT with refresh token rotation and family tracking for device management.
*   **MFA (TOTP):** Multi-factor authentication support for elevated security.

### 2. Role-Based Access Control (RBAC)
Middleware enforces strict role checks (Admin, Dispatch, Merchandiser) before allowing access to specific API routes and frontend views.

### 3. Database Security
*   **SQL Injection (SQLi) Prevention:** Prisma ORM uses parameterized queries and prepared statements exclusively.
*   **Audit Triggers:** SQLite pragmas and triggers automatically maintain audit logs for data integrity.

---

## 🔄 Core Operational Workflows

### 1. Dispatch Receive (Decoupled RFID)
*   Samples can be received at Dispatch with or without an RFID tag.
*   **100% Validated Resolution:** We have decoupled the RFID encoding from the receive workflow, allowing samples to move through the pipeline even if the physical tags haven't been applied yet.

### 2. Transfer Ownership
*   Enables smooth transition of samples between holders (e.g., Dispatch → Merchandiser).
*   **Supported Statuses:** Transfers are permitted from **IN_TRANSIT_TO_DISPATCH**, **AT_DISPATCH**, **WITH_MERCHANDISER**, and **IN_STORAGE**.
*   **Dynamic RFID Verification:** If a sample has an RFID tag, a verification scan is enforced. If no tag exists, the transfer bypasses RFID validation automatically.

### 3. Pull-Request Handover
*   From the **Locator** page, any user can send a pull request to the current owner of a `WITH_MERCHANDISER` sample.
*   The owner sees a floating **"Received — Yes or No?"** popup with a minimize toggle, then confirms or declines.
*   Declining keeps the sample with the original owner; confirming atomically reassigns ownership and updates status.

### 4. RFID Encoding & Hot-Swap
*   Encode an RFID tag onto any sample directly from Dispatch or Admin pages.
*   **Hot-swap support:** If the scanned EPC is already linked to another sample, the system automatically re-assigns it — logging a full audit trail on both samples — without manual intervention.

### 5. Active Storage Placement
*   Integrated "Suggest Location" logic based on Sample Type (Fit, Proto, Salesman, etc.).
*   Real-time bin capacity tracking prevents over-filling of physical rack locations.

### 6. Real-time Notifications
*   Users receive in-app alerts when transfers are requested, accepted, pull requests are raised, or when samples arrive at dispatch.
*   Merchandiser page polls every 10 seconds for both incoming and outgoing pending transfer counts, surfaced as notification badges.

---

## 🚀 Installation & Setup

### Prerequisites
1.  **Node.js**: `v18.0.0` or higher (v20+ recommended).
2.  **npm**: Standard package tools.
3.  **Git**: For repository cloning.

### 🪟 Windows Deployment

1. **Install Dependencies:**
    Open PowerShell in the root directory:
    ```powershell
    # Install API dependencies
    cd apps/api; npm install
    # Install Web dependencies
    cd ../web; npm install
    ```
2. **One-Click Boot:**
    Use the included PowerShell automation script from the root directory. It handles database initialization, Prisma generation, seeding, and boots both servers simultaneously.
    ```powershell
    cd ../../
    .\start-dev.ps1
    ```

### 🍎 macOS & 🐧 Linux Deployment

1. **Manual Initialization:**
    ```bash
    cd apps/api
    npm install
    npx prisma generate
    npx prisma db push --accept-data-loss
    npx tsx prisma/seed.ts
    ```
2. **Booting Servers (Two Terminals):**
    *   **Terminal 1 (API):** `cd apps/api && npm run dev`
    *   **Terminal 2 (Web):** `cd apps/web && npm install && npm run dev`

---

## 🌐 Endpoints
*   🖥️ **Web Dashboard:** `http://localhost:5173`
*   ⚙️ **API Gateway:** `http://localhost` (port 80; run the API elevated on Windows if binding fails)
