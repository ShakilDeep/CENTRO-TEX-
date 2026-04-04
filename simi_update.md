**CentroFlow PRD -- Gap Analysis & Feature Enhancements (25/03/2026)**

**CRITICAL USER JOURNEY NOTE**

The three key actions --- **Create Sample, Encode RFID, and Receive /
Transfer / Store** --- form the **main user journey**. The placement of
these three steps must be **intuitive and clean** for the user.

i\) **Dashboard** shows the first two steps (**Create Sample** and
**Encode RFID**) for reception/entry users. **Create Sample** should
appear first and **Encode RFID** next --- this sequence must be clearly
visible on the dashboard page.

ii\) **Dispatch Page** handles **Receive / Transfer / Store** for
reception and operational roles.

**Dashboard Page**

**Gap 1: Registration Data Fields (✅ IMPLEMENTED)**

-   **Add fields to Create Sample:**

    -   Sender / Origin

    -   Receiver

    -   Entry Number (auto-generated, read-only)

    -   Purpose (order confirmation / storage / evaluation / other --
        dropdown recommended)

**Critical:** Status should be system-driven and update automatically
based on actions (Receive, Transfer, Store) to reduce manual errors.

**Next-Step Hint:** After creating a sample, show a subtle prompt or
highlight:

"Sample created successfully. Next: Encode RFID."

**Gap 2: RFID Workflow (✅ IMPLEMENTED)**

-   **Add Encode RFID step:**

    -   Status per sample: RFID not linked / linked

    -   Button: \[Encode RFID\] → opens encoding modal

    -   Modal fields: Sample ID, Current Holder, Generated RFID Code
        (auto), Optional Notes

    -   Actions: \[Generate RFID\], \[Write to Tag\], \[Cancel\]

    -   Pop-ups:

        -   Success → "RFID encoded successfully. Sample is now linked."

        -   Failure → "Encoding failed. Retry or check tag placement."

    -   Automatic read-after-write verification ensures correct encoding

    -   Dashboard status updates to RFID linked after success

    -   Next-step guidance: "Next: Receive / Transfer / Store in
        Dispatch page"

**User Journey Placement**

-   **Sequence:**

    1.  \[Create Sample\] -- first step (includes hint for Encode RFID)

    2.  \[Encode RFID\] -- second step, clearly highlighted

-   Ensures **intuitive workflow for reception/entry users**

**Dispatch Page (formerly Dispatch Queue)**

**Gap 1: Table lacks operational fields (✅ IMPLEMENTED)**

-   **Add columns:**

    -   Sender

    -   Receiver

    -   Purpose

    -   Assigned Merchandiser

**Critical Feature --- Transfer Workflow (✅ IMPLEMENTED)**

-   **Add workflow for sample transfers:**

    1.  **Request Transfer** -- initiated by current holder

    2.  **Approve / Decline** -- action by authorized user

    3.  **Reason Logging** -- capture reason for transfer

    4.  **Ownership Change** -- automatically update current holder

    5.  **Notifications** -- notify relevant users of transfer status

**Note:** Ensures operational control over transfers directly from
Dispatch page and aligns with the user journey.

**Quick Action Buttons & Modals**

-   **Buttons:** \[Receive\] \[Transfer\] \[Store\]

-   **Modals:**

    -   **Receive:** Sample ID, Sender, Timestamp, Assigned Holder

    -   **Transfer:** Current Holder, New Holder, Reason, Optional
        Notes, Timestamp

    -   **Store:** Location / Bin assignment, Timestamp

**Behavior:**

-   Buttons are accessible from table rows for fast operations

-   Modals validate required fields before confirming action

-   Status updates automatically based on system action

**Storage / Inventory Page (✅ IMPLEMENTED)**

**Gap 1: Missing action visibility (✅ IMPLEMENTED)**

-   **Add to list view:**

    -   Last Action Taken (e.g., Stored, Audited, Moved)

    -   Timestamp of Last Action Taken

**Gap 2: Stored samples table enhancements**

-   **Add fields to existing table (All Stored Samples Database):**

    -   **Purpose**

    -   **Last Action Taken**

    -   **Timestamp**

**Note:** Provides a comprehensive view of sample status, ownership, and
movement without a separate detail page.

**Reports Page**

**Gap 1: Alignment and Filter Issues (✅ IMPLEMENTED)**

-   **Fixes needed:**

    -   Align \[Refresh\] and \[Export CSV\] buttons properly at the top.

    -   Add **Holder** (Merchandiser/User) filter.

    -   Add **Location** filter to search for samples per location.

**Note:** Purpose filter not needed at this stage

**Admin Panel (✅ IMPLEMENTED)**


**Gap 1: Terminology**

-   Fix text:

    -   "Administration context" → "System Administration"

    -   "Manage hardware provisions..." → "Manage locations, users, and
        RFID tags"

**Note:** Other grouping or validations are not needed at this stage

**General Feedback (✅ IMPLEMENTED)**


-   **Naming & Logo:**

    -   Name: CentroFlow (Probaho is for internal use only)

    -   Logo: Use Central's official logo