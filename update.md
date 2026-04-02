# CentroFlow Feedback

---

## 1. Functionality

### 1.1 Dashboard Page

- **RFID Encode:**
  - This should be on the dashboard page. This should be suggested after the sample is created on the dashboard page after the Create Sample step.

- **Sample Row Details / Expansion:**
  - Expanded row should show: Type, Buyer / Buyer Group, Main Details (e.g., Men's Cotton Shirt), Sample & RFID code.
  - Sample ID & RFID code **should not be emphasized**; other details should be highlighted.

- **Filter Button:**
  - Currently it **does not work** — must be functional.

- **Action Column:**
  - Currently, **"View Details" only appears when hovering over a row**.
  - **Expected:** "View Details" should be **visible by default** for all rows.

- **Next-Step Guidance:**
  - After creating a sample, a subtle hint should guide the user:

  > "Sample created successfully. Next: Encode RFID."

---

### 1.2 Dispatch Page

- **RFID Encoding** is not needed on this page.

- **Transfer / Store Actions:**
  - Currently **do not work at all**.
  - Buttons/options **only visible for samples with status "At Dispatch."**
  - **Expected:** Transfer and Store should be functional for **all samples**, including those with status **"In Storage."**

- **Sample Row Expansion:**
  - Clicking a sample row **does not expand**.
  - **Expected:** Clicking a row should expand it to show detailed information:
    - Type / Category (e.g., Men's Cotton Shirt)
    - Buyer / Buyer Group
    - Sample Details
    - Sample & RFID code
  - **Emphasis Note:** Sample ID and RFID code should **not be highlighted**, while Type, Buyer, Buyer Group, and main details should be **more prominent**, since users rarely search by ID or RFID.

- **Refresh and Filter Button:**
  - Currently **does not work** — must be functional.

---

### 1.3 General

- Refresh button does not work on any page.

---

## 2. UI / Branding / Color

### 2.1 Dispatch Page

- **Page Name:** Should be **"Dispatch"** only; remove "Dispatch Queue."

- **Status Color & Text:**
  - Statuses currently inconsistent: e.g., "At Dispatch" shows **orange initially**, then green on click; "Pending Transfer Approval" text splits awkwardly.
  - **Expected:** Maintain a **consistent color scheme** for all statuses (At Dispatch, Pending Transfer Approval, In Transit, In Storage, etc.).

- **Highlighting / Details:**
  - Main sample details (Type, Buyer, Category) should be **more prominent** than Sample ID or RFID code.

- **Expanded Row Display:**
  - Expanded row should include the same detailed info as the Dashboard (Type, Buyer, Category, Sample Details).

---

### 2.2 Dashboard Page

- **Header / Section Text:**
  - Replace "My Samples" / "Manage your active samples and track their life cycles" with a **short, punchy title**:
    - **Option 1:** Sample Center
    - **Option 2:** Samples Hub

- **Sample Row Highlighting:**
  - Emphasize Type, Buyer / Buyer Group, and Main Details.
  - De-emphasize Sample ID and RFID code.

---

### 2.3 General Branding

- **Logo:** Use **CentroFlow official logo** (from Centro).
- **Color Coordination:** Ensure **consistent color scheme** across all pages and statuses.