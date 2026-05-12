# API Integration Map

Source: `docs/newapi.docx`, generated backend contract dated 12 May 2026.

All `/api/v1` routes are centralized through `services/api.ts` and feature bearer auth, refresh-token retry, normalized `ApiError`, query serialization, binary export support, and network/5xx retry. Types and reusable methods live in `services/authApi.ts`, `services/dashboardApi.ts`, `services/management/*`, `services/notificationApi.ts`, `services/reportApi.ts`, `services/settingsApi.ts`, `services/subscriptionApi.ts`, and `services/supportApi.ts`.

| Screen / module | Endpoint | Method | Payload | Response usage | UI action |
|---|---:|---|---|---|---|
| Profile security | `/auth/biometric` | POST | `{ enabled }` | Updated `ApiUser` biometric flag | Toggle biometric login |
| Profile security | `/auth/change-password` | POST | `{ currentPassword, newPassword }` | Success message toast | Submit password form |
| Login | `/auth/login` | POST | `{ phone, password }` | User, permissions, tokens | Password sign-in |
| Quick login | `/auth/login-pin` | POST | `{ phone, pin }` | User, permissions, tokens | PIN unlock |
| Profile logout | `/auth/logout` | POST | `{ refreshToken }` | Success message, local session clear | Logout |
| App bootstrap / profile | `/auth/me` | GET | None | Hydrates user, role, permissions | Launch/refresh session |
| App bootstrap | `/auth/refresh` | POST | `{ refreshToken }` | Rotated token pair and user | Silent re-auth / 401 retry |
| Owner onboarding | `/auth/register-owner` | POST | `RegisterOwnerRequest` | New owner session | Register organization |
| Profile security | `/auth/set-pin` | POST | `{ currentPassword, pin }` | Success message | Save quick PIN |
| Dashboards | `/dashboard` | GET | None | Operational KPI cards, alerts, active batches | Load home dashboard |
| Finance dashboard | `/dashboard/financial` | GET | None | Financial summary and transactions | Load owner/accounts finance widgets |
| User management | `/users` | GET | `page, limit, search` | Paginated users | Search/filter staff |
| User management | `/users` | POST | `CreateUserRequest` | Created `ApiUser` | Add user |
| User management | `/users/{userId}` | GET | `userId` | User detail | Open edit user |
| User management | `/users/{userId}` | PUT | `UpdateUserRequest` | Updated `ApiUser` | Save user changes |
| User management | `/users/{userId}/reset-password` | POST | `{ newPassword, mustChangePassword? }` | Success message | Admin reset password |
| User management | `/users/{userId}/status` | PATCH | `{ status }` | Updated `ApiUser` | Activate/disable user |
| Farm management | `/farms` | GET | `page, limit, search` | Paginated farms | Farm list/search |
| Farm management | `/farms` | POST | `CreateFarmRequest` | Created `ApiFarm` | Add farm |
| Farm detail | `/farms/{farmId}` | GET | `farmId` | Farm detail and assignments | Open farm detail |
| Farm management | `/farms/{farmId}` | PUT | `UpdateFarmRequest` | Updated `ApiFarm` | Save farm |
| Catalog | `/master-data/catalog-items` | GET | `page, limit, search, type` | Feed/medicine/chick options | Dropdowns and catalog list |
| Catalog | `/master-data/catalog-items` | POST | `CreateCatalogItemRequest` | Created item | Add catalog item |
| Catalog | `/master-data/catalog-items/{itemId}` | PUT | `UpdateCatalogItemRequest` | Updated item | Edit catalog item |
| Traders | `/master-data/traders` | GET | `page, limit, search` | Trader options/list | Sales trader dropdown |
| Traders | `/master-data/traders` | POST | `CreateTraderRequest` | Created trader | Add trader |
| Traders | `/master-data/traders/{traderId}` | PUT | `UpdateTraderRequest` | Updated trader | Edit trader |
| Batch management | `/batches` | GET | `page, limit, search, farmId, status` | Paginated batches | Batch list/search/filter |
| Batch management | `/batches` | POST | `CreateBatchRequest` | Created `ApiBatch` | Create batch |
| Batch detail / review | `/batches/{batchId}` | GET | `batchId` | Batch detail and summary | Open batch |
| Batch management | `/batches/{batchId}` | PUT | `UpdateBatchRequest` | Updated batch | Edit batch |
| Comments | `/batches/{batchId}/comments` | GET | `batchId` | Batch comments | Load comment thread |
| Comments / review | `/batches/{batchId}/comments` | POST | `CreateCommentRequest` | Created comment | Add correction/comment |
| Legacy costs | `/batches/{batchId}/costs` | GET | `batchId` | Legacy expense rows | Backward-compatible cost list |
| Legacy costs | `/batches/{batchId}/costs` | POST | `CreateBatchCostRequest` | Created legacy cost | Backward-compatible cost entry |
| Daily entry | `/batches/{batchId}/daily-logs` | GET | `batchId` | Daily log rows | Load daily log history |
| Daily entry | `/batches/{batchId}/daily-logs` | POST | `CreateDailyLogRequest` | Created log | Submit daily entry |
| Supervisor review | `/batches/{batchId}/daily-logs/{dailyLogId}` | PUT | `UpdateDailyLogRequest` | Corrected log | Save correction |
| Expenses / inventory | `/batches/{batchId}/expenses` | GET | `batchId, ledger?` | Company/farmer expense rows | Expense ledger filter |
| Expenses / inventory | `/batches/{batchId}/expenses` | POST | `CreateBatchExpenseRequest` | Created expense | Add expense |
| Expenses | `/batches/{batchId}/expenses/{expenseId}` | PUT | `UpdateBatchExpenseRequest` | Updated expense | Edit expense/payment status |
| Expenses approval | `/batches/{batchId}/expenses/{expenseId}/approval` | PATCH | `{ approvalStatus, rejectedReason? }` | Approved/rejected expense | Approve farmer expense |
| P&L | `/batches/{batchId}/pnl` | GET | `batchId` | Company/farmer P&L | Show batch profitability |
| Sales | `/batches/{batchId}/sales` | GET | `batchId` | Sales rows | Load sales history |
| Sales | `/batches/{batchId}/sales` | POST | `CreateSaleRequest` | Draft sale | Add sale |
| Sales finalization | `/batches/{batchId}/sales/{saleId}/finalize` | PATCH | `FinalizeSaleRequest` | Confirmed sale | Finalize sale |
| Settlement | `/batches/{batchId}/settlement` | GET | `batchId` | Settlement detail | Load payout |
| Settlement | `/batches/{batchId}/settlement` | POST | `CreateBatchSettlementRequest` | Draft/final settlement | Create payout |
| Batch management | `/batches/{batchId}/status` | PATCH | `{ status, actualCloseDate? }` | Updated batch status | Close/cancel/status change |
| Treatments | `/batches/{batchId}/treatments` | GET | `batchId` | Treatment rows | Load treatment history |
| Treatments | `/batches/{batchId}/treatments` | POST | `CreateTreatmentRequest` | Created treatment | Submit treatment |
| Inventory allocation | `/inventory/allocate` | POST | `AllocateInventoryRequest` | Ledger movement | Allocate stock to batch |
| Inventory ledger | `/inventory/ledger` | GET | `catalogItemId?, batchId?` | Stock movement rows | Filter inventory ledger |
| Finance entries | `/finance/entries` | GET | `page, limit, search` | Investment/income/expense rows | Load finance entries |
| Finance entries | `/finance/entries` | POST | `CreateFinanceEntryRequest` | Created finance entry | Add finance entry |
| Payments | `/finance/payments` | GET | `page, limit, search` | Payment rows | Load payments |
| Payments | `/finance/payments` | POST | `CreateFinancePaymentRequest` | Created payment | Record payment |
| Purchases | `/finance/purchases` | GET | `page, limit, search` | Purchase rows | Load purchases |
| Purchases | `/finance/purchases` | POST | `CreateFinancePurchaseRequest` | Created purchase | Add purchase |
| Purchases | `/finance/purchases/{purchaseId}` | PUT | `UpdateFinancePurchaseRequest` | Updated purchase | Edit purchase |
| Notifications | `/notifications` | GET | `unreadOnly?` | Notification list/count | Header badge and inbox |
| Notifications | `/notifications/{notificationId}/read` | PATCH | `notificationId` | Updated notification | Mark as read |
| Reports export | `/reports/batches/{batchId}/export/excel` | GET | `batchId` | Binary Excel response | Download Excel |
| Reports export | `/reports/batches/{batchId}/export/pdf` | GET | `batchId` | Binary PDF response | Download PDF |
| Reports | `/reports/batches/{batchId}/summary` | GET | `batchId` | Batch KPI/finance summary | Select batch |
| Reports | `/reports/expenses` | GET | None | Expense report rows | Expense register tab |
| Reports | `/reports/farms/{farmId}/summary` | GET | `farmId` | Farm KPI/finance summary | Select farm |
| Reports | `/reports/inventory` | GET | None | Stock snapshot rows | Inventory report tab |
| Reports | `/reports/overview` | GET | None | Consolidated KPIs | Reports overview |
| Reports | `/reports/profitability` | GET | None | Profitability rows | Profitability tab |
| Reports | `/reports/settlements` | GET | None | Settlement rows | Settlement report tab |
| Organization settings | `/settings/organization` | GET | None | Settings blocks | Load settings |
| Organization settings | `/settings/organization` | PUT | `UpdateOrganizationSettingsRequest` | Updated settings | Save thresholds/rules |
| Subscription | `/subscriptions/current` | GET | None | Current subscription/payments | Billing status card |
| Subscription payment | `/subscriptions/payments` | POST | `SubmitSubscriptionPaymentRequest` | Submitted payment | Confirm UPI payment |
| Subscription | `/subscriptions/plans` | GET | None | Plan options | Plan picker |
| Subscription | `/subscriptions/requests` | POST | `{ planCode }` | Subscription + UPI link | Request selected plan |
| Developer diagnostics | `/docs` | GET | None | Swagger HTML | QA/developer reference |
| Health diagnostics | `/health` | GET | None | Service health JSON | API reachability check |

