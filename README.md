# CENTRO TEX 2.0 - Operations Dashboard


## Overview

CENTRO TEX 2.0 is a next-generation enterprise application built to handle high-throughput operations, sample tracking, RFID logistics, and secure organizational management. Designed with a decoupled architecture, it provides a lightning-fast React frontend backed by a robust, secure Node.js API ecosystem.

---

## Architecture & Code Standards

This project utilizes a modern **Monorepo Architecture**, physically separating the `frontend (web)` and `backend (api)` into their respective workspace directories while maintaining a unified repository structure.

### Technology Stack
*   **Frontend (`apps/web`)**
    *   **Core:** React 18 / Vite
    *   **Styling:** Tailwind CSS (Utility-first) / Framer Motion
    *   **Features:** Component-based UI, Client-side Routing, React Context API.
*   **Backend (`apps/api`)**
    *   **Core:** Node.js / Fastify (Ultra-fast web framework)
    *   **Database:** SQLite (Configured with WAL mode for concurrency)
    *   **ORM:** Prisma ORM for declarative schema management.
*   **Language:** Strict TypeScript is enforced across both environments to guarantee type safety, minimize runtime errors, and streamline developer experience.

### Code Standards
*   **RESTful APIs:** The backend adheres strictly to REST principles, utilizing standardized JSON responses, appropriate HTTP verbs, and versioned routing patterns (e.g., `/api/v1/`).
*   **Modular Design:** Code is broken down into specific operational domains (Auth, RFID, Dispatch, Storage, Samples) for both UI components and API controllers.
*   **Prisma Typing:** Frontend interfaces are strictly mapped to Prisma-generated database schema types to prevent data mismatch during rendering.

---

## 🛡️ Security Measures & Anti-Hack Precautions

CENTRO TEX is built from the ground up prioritizing enterprise-grade security against external threats, exploits, and brute-force attacks.

### 1. Identity & Access Management (Authentication)
*   **JSON Web Tokens (JWT):** The API utilizes `@fastify/jwt` for stateless, signed session management. Tokens are cryptographically verified on every protected request.
*   **Cryptographic Password Hashing:** User credentials are never stored in plaintext. They are salted and hashed using `bcrypt` (Blowfish cipher), rendering dictionary and rainbow-table attacks useless in the event of database exposure.
*   **Enterprise SSO:** Native plugin integrations for Microsoft Azure Active Directory (`passport-azure-ad`) support delegated zero-trust token verification.

### 2. Network & Application Hardening
*   **DDoS & Brute-Force Protection:** Native integration of `@fastify/rate-limit` throttles excessive requests spanning across the API, automatically locking out IPs attempting credential-stuffing or endpoint spam.
*   **CORS Policies:** Strict Cross-Origin Resource Sharing (`@fastify/cors`) rules block unauthorized domains or malicious scripts operating in foreign browsers from querying the internal API.

### 3. Database Integrity & Payload Security
*   **SQL Injection (SQLi) Prevention:** The platform utilizes the Prisma ORM. Prisma internally utilizes parameterized queries and prepared statements exclusively. It is fundamentally immune to classic SQL injection attacks as user input is never concatenated into raw SQL strings.
*   **Cross-Site Scripting (XSS) Mitigation:** The React framework inherently escapes and sanitizes variable outputs before altering the DOM structure, neutralizing injected JavaScript payloads sent by malicious actors.

---

## Installation & Running the Application

### Prerequisites (All Operating Systems)
Ensure your environment meets the following requirements before proceeding:
1.  **Node.js**: `v18.0.0` or higher.
2.  **npm**: Package manager (comes with Node).
3.  **Git**: For cloning the repository.

### 🪟 Windows Deployment

1. **Clone and Install:**
    Open PowerShell or Command Prompt.
    ```powershell
    git clone <repository-url>
    cd "CENTRO TEX 2.0"
    npm install
    cd apps/api && npm install
    cd ../web && npm install
    ```
2. **One-Click Boot:**
    Return to the root directory `CENTRO TEX 2.0`. We have included a PowerShell automation script that handles database initialization, Prisma generation, database seeding, and boots both servers simultaneously.
    ```powershell
    cd ../../
    .\start-dev.ps1
    ```

### 🍎 macOS & 🐧 Linux Deployment

1. **Clone and Install:**
    Open Terminal.
    ```bash
    git clone <repository-url>
    cd "CENTRO TEX 2.0"
    npm install
    cd apps/api && npm install
    cd ../web && npm install
    ```
2. **Database Initialization:**
    You must configure the SQLite database manually from the root directory.
    ```bash
    cd apps/api
    npx prisma generate
    npx prisma db push --accept-data-loss
    npx tsx prisma/seed.ts
    ```
3. **Booting the Servers:**
    To run the decoupled architecture, open two separate terminal windows.

    **Terminal Window 1 (API Server):**
    ```bash
    cd apps/api
    npm run dev
    ```

    **Terminal Window 2 (Web Client):**
    ```bash
    cd apps/web
    npm run dev
    ```

### 🌐 Accessing the Dashboards

Once your servers have initialized, you can access the platform locally in your browser:
*   🖥️ **Web Interface:** `http://localhost:5173`
*   ⚙️ **API Endpoint:** `http://localhost:3000`
