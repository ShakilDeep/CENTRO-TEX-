# CENTRO FLOW 2.0 - Operations Dashboard

## Overview

CENTRO FLOW 2.0 is a high-performance enterprise application built to manage complex sample tracking, RFID logistics, secure storage, and real-time organizational workflows. Designed with a decoupled **Fastify + React** architecture, it provides a premium UI experience backed by a robust, secure Node.js API ecosystem.

---

## 🏗️ Architecture & Technical Stack

The project utilizes a modern **Monorepo Architecture**, physically separating the `frontend (web)` and `backend (api)` into their respective workspace directories.

### Technology Stack
*   **Frontend (`apps/web`)**
    *   **Core:** React 18 / Vite
    *   **Auth:** **Clerk (Managed Enterprise Identity Provider)**
    *   **Styling:** Vanilla CSS / Framer Motion (Glassmorphism & Micro-animations)
    *   **Queries:** TanStack React Query (SWR caching & mutations)
*   **Backend (`apps/api`)**
    *   **Core:** Node.js / Fastify (Ultra-fast web framework)
    *   **Database:** SQLite (WAL mode enabled for high concurrency)
    *   **ORM:** Prisma ORM for type-safe schema management.
    *   **Types:** Strict TypeScript across the entire monorepo.

---

## 🛡️ Security & Authentication Model (Phase 1 Demo)

CENTRO FLOW 2.0 prioritizes a frictionless development and presentation experience while maintaining production-grade foundations.

### 1. Unified Identity (Clerk)
The frontend uses **Clerk** as the single source of truth for identity management. This provides out-of-the-box support for Enterprise SSO, 2FA, and secure session handling.

### 2. Backend Actor Model (Auto-Admin Injection)
For the current **Phase 1 Demo**, the backend `authenticate` middleware is configured in **Demo Mode**:
*   The API automatically identifies and injects an **Admin User** as the actor for all data operations.
*   This ensures that while the frontend displays real-world user flows, the backend operations successfully clear Foreign Key (FK) constraints without requiring a complex multi-tenant setup during local prototyping.

### 3. Database Security
*   **SQL Injection (SQLi) Prevention:** Prisma ORM uses parameterized queries and prepared statements exclusively, neutralizing classic SQL injection attacks.
*   **XSS Mitigation:** React's DOM rendering engine automatically sanitizes variable outputs, preventing malicious JavaScript execution.

---

## 🔄 Core Operational Workflows

### 1. Dispatch Receive (Decoupled RFID)
*   Samples can be received at Dispatch with or without an RFID tag.
*   **100% Validated Resolution:** We have decoupled the RFID encoding from the receive workflow, allowing samples to move through the pipeline even if the physical tags haven't been applied yet.

### 2. Transfer Ownership (Resolved Workflow)
*   Enables smooth transition of samples between Holders (e.g., Dispatch → Merchandiser).
*   **Supported Statuses:** Transfers are supported from **AT_DISPATCH**, **WITH_MERCHANDISER**, and **IN_STORAGE**.
*   **Dynamic RFID Verification:** If a sample has an RFID tag, a verification scan is enforced. If no tag exists, the system intelligently allows the transfer to bypass validation, preventing UI locks.

### 3. Active Storage Placement
*   Integrated "Suggest Location" logic based on Sample Type (Fit, Proto, Salesman, etc.).
*   Real-time bin capacity tracking prevents over-filling of physical rack locations.

---

## ✅ Verified Bug Resolutions

| Issue | Resolution | Component |
|---|---|---|
| **Action Failed: Failed to transfer sample** | Fixed status transition logic to allow transfers from `AT_DISPATCH`. | `apps/api/sampleLifecycleService.ts` |
| **Mandatory RFID Blocking Transfers** | Made `rfid_epc` optional in API schemas for untagged items. | `apps/api/middleware/validation.ts` |
| **Generic 'Action Failed' Toasts** | Updated frontend to correctly parse `.message` from API error responses. | `apps/web/src/pages/Dispatch.tsx` |

---

## 🚀 Installation & Setup

### Prerequisites
1.  **Node.js**: `v18.0.0` or higher.
2.  **npm / npx**: Standard package tools.
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
    npx prisma generate
    npx prisma db push --accept-data-loss
    npx tsx prisma/seed.ts
    ```
2. **Booting Servers (Two Terminals):**
    *   **Terminal 1 (API):** `cd apps/api && npm run dev`
    *   **Terminal 2 (Web):** `cd apps/web && npm run dev`

---

## 🌐 Endpoints
*   🖥️ **Web Dashboard:** `http://localhost:5173`
*   ⚙️ **API Gateway:** `http://localhost:3000`
