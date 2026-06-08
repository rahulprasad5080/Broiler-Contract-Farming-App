# Client Changes Analysis: Frontend vs Backend Breakdown

This document categorizes the changes requested in the client specification PDF ([WingSoft_Farms.pdf](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/docs/WingSoft_Farms.pdf)) into **Frontend (UI/UX)**, **Backend (APIs & Database)**, or **Both (Requires Frontend & Backend updates)**.

---

## Summary Table of Changes

| Page / Section | Change Description | Category | Files/Areas Impacted |
| :--- | :--- | :--- | :--- |
| **Page 1: Bottom Navigation** | Change tab label "More" to "Settings" | **Frontend** | `components/ui/BottomTabs.tsx` / Routing |
| **Page 1: Profile Settings** | Add "Company Name" in profile tile | **Both** | Profile screen layout / User API response |
| **Page 1: Profile Settings** | Implement screens for Personal Info, Permissions, Bank | **Both** | Settings forms / Profile & Bank API |
| **Page 1: Category Master** | Update category groupings (Production, Farmer, Office) | **Both** | Forms / Seeders, DB Validation |
| **Page 2: Item Master** | Conditional items based on category selection | **Frontend** | Dropdowns, UI conditional logic |
| **Page 2: Users & Partners** | Manage Owners, Accounts, Supervisors, Farmers & Partners | **Both** | Create user/partner screen / DB CRUD APIs |
| **Page 3: Security** | Change Password, Change Pin, Biometric toggles | **Both** | UI toggles / Auth endpoints & hashing |
| **Page 3: Payout Rules** | Payout logic based on KG sold or Production Cost | **Both** | Configuration UI / Batch settlement formulas |
| **Page 3: Alerts** | Pending Entry, FCR, and Mortality warnings | **Both** | Toast notifications / Cron tasks, FCR logic |
| **Page 3: Financial Control** | Supervisor expense entry & approvals logic | **Both** | Expense buttons / Approval endpoints, Ledgers |
| **Page 4: Farm List** | Compact multi-farm layout + float button | **Frontend** | Farm list UI design |
| **Page 4: Add Farm** | Birds Capacity, Sq Ft, Location, GPS Map share | **Both** | Add Farm Form / Farm DB fields update |
| **Page 5: Batch List** | Compress layouts to save space | **Frontend** | Batch card styling |
| **Page 6: User & Partner List** | Compact minimalistic list layout | **Frontend** | List item styling |
| **Page 6: Pagination** | Limit payments/receipts list to 10 entries + paging | **Both** | Pagination buttons / SQL Limit/Offset |
| **Page 8: Inventory Allocation** | Bulk purchases allocated to batches (reduces stock) | **Both** | Allocation form / Inventory ledger & transactions |
| **Page 8: Expense Types** | Link Production/Farmer to batch; Office separate | **Both** | Add Expense form / Database columns & relations |
| **Page 8: Create Sale** | Rate + Calculated Total. Remove transport/commission | **Both** | Sale Form / DB model column updates |
| **Page 8: Expense Payment** | Cash/Bank ledger selector + Auto-approvals | **Both** | Expense form updates / Approval checks, DB updates |
| **Page 9: Entries Page** | Reorganize tiles (add allocation, remove others) | **Frontend** | Grid layout & routes modification |
| **Page 9: Investment Entry** | Remove type/payment status; Add Owner/method selection | **Both** | Form fields / Ledger insertion logic |
| **Page 9: Payments & Receipts** | Simplified forms, Ledger debit/credit integration | **Both** | Payment form & Float menu / Balance logic |

---

## Detailed Classification

### 1. Frontend Only Changes (UI & Styling)
These changes only require modifications in the React Native codebase (Expo routing, layouts, and styles) without altering how data is saved or processed on the server:
- **Bottom Navigation Tab Rename**: Changing "More" to "Settings" in the main tab bar.
- **Space Reduction/Minimalist View**: Compressing the visual spacing (padding/margins) in the Farm List, Batches List, Users, and Partners list screens to fit more information onto a single screen.
- **Dynamic Input Fields visibility**: Hiding the "Item" dropdown in the form when the selected Category is "Farmer" or "Office" (only showing it for "Production").
- **Static Pages**: Implementing pages for "Privacy Policy" and "About WingSoft Farms" under the Settings menu.

### 2. Both Frontend and Backend Changes (Requires UI & API/Database updates)
Almost all other changes require a coordinated update because they change the database schema, calculations logic, or business workflows:

* **Profile & Settings Expansion (Company, Bank Details)**:
  * *Frontend*: Edit form inputs for Bank Details and Personal Information.
  * *Backend*: Database table/columns to store bank details and user personal details.
* **Category & Item Master Configuration**:
  * *Frontend*: Dynamic dropdown menus displaying the exact items (e.g. Pre-Starter/Starter/Finisher for Feed; Toxol/Vash for Medicine).
  * *Backend*: Database seeders or tables to return these options based on the requested categories.
* **Inventory Allocation (The "Not Working" Part)**:
  * *Frontend*: Forms to purchase items in bulk (Office stock) and allocate specific quantities to a batch.
  * *Backend*: Inventory stock tracking logic. A bulk purchase increases office stock. An allocation decreases office stock, creates a production expense against the batch, and computes unit cost.
* **Payout Rules & Financial Controls**:
  * *Frontend*: Settings input to select rule type. Status tags for Farmer Expenses ("Pending Approval" vs "Approved").
  * *Backend*: Script to update settlement calculation formulas based on the selected payout rule. Expense approval endpoint; approved expense gets counted as a batch credit during settlement.
* **Payments & Receipts Menu Consolidation**:
  * *Frontend*: Separate payment entries and receipt entries. Show paid status selectors (Credit vs Paid, Bank/Cash).
  * *Backend*: Integration with dual-ledger accounting (Cash vs Bank ledger update upon save).
* **Create Sale simplifications**:
  * *Frontend*: Display only 1 rate field, auto-calculate total amount. Hide/remove transport charge, commission, deduction, and payment received.
  * *Backend*: Update Sales schema to make removed fields nullable or delete them, and add ledger updates.
* **List Pagination**:
  * *Frontend*: Next/Prev paging buttons on Payments and Receipts lists.
  * *Backend*: API pagination logic (`LIMIT 10 OFFSET X`) instead of dumping all records.
* **Add Farm Fields**:
  * *Frontend*: Input fields for Capacity, Sq Ft, Location details, GPS Map coordinate capture.
  * *Backend*: Modify Farm database schema to support these new fields.
