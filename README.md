# CENTRO FLOW 2.0 - Operations Dashboard

## Overview

CENTRO FLOW 2.0 is a high-performance enterprise application built to manage complex sample tracking, RFID logistics, secure storage, and real-time organizational workflows. Designed with a decoupled **Fastify + React** monorepo architecture, it provides a premium UI experience backed by a robust, secure Node.js API ecosystem.

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

## �️ Domain Data Model

The system operates on a robust relational data model (managed via Prisma):

- **Users:** Role-Based Access Control (RBAC) supporting `MERCHANDISER`, `DISPATCH`, and `ADMIN` roles. Includes MFA and JWT refresh token tracking.
- **Samples:** The core entity tracking status (`IN_TRANSIT_TO_DISPATCH`, etc.), ownership, location, and RFID links.
- **SampleMovements:** An append-only audit trail logging every action, state change, and RFID scan.
- **SampleTransfers:** Workflow management for requesting, accepting, or rejecting sample ownership transfers.
- **RfidTags:** Manages the lifecycle of physical EPC tags (`AVAILABLE`, `ACTIVE`).
- **StorageLocations:** Hierarchical tracking (`Rack` → `Shelf` → `Bin`) with capacity management.
- **Notifications:** In-app alerts for transfers, dispatches, and system events.

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

### 2. Transfer Ownership (Resolved Workflow)
*   Enables smooth transition of samples between Holders (e.g., Dispatch → Merchandiser).
*   **Supported Statuses:** Transfers are supported from **AT_DISPATCH**, **WITH_MERCHANDISER**, and **IN_STORAGE**.
*   **Dynamic RFID Verification:** If a sample has an RFID tag, a verification scan is enforced. If no tag exists, the system intelligently allows the transfer to bypass validation, preventing UI locks.

### 3. Active Storage Placement
*   Integrated "Suggest Location" logic based on Sample Type (Fit, Proto, Salesman, etc.).
*   Real-time bin capacity tracking prevents over-filling of physical rack locations.

### 4. Real-time Notifications
*   Users receive in-app alerts when transfers are requested, accepted, or when samples arrive at dispatch.

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
*   ⚙️ **API Gateway:** `http://localhost:3000`
