/**
 * services/index.ts
 *
 * Master barrel export for the entire API layer.
 *
 * Import from this file in screens and components:
 *   import { login, listBatches, fetchDashboard } from "@/services";
 *
 * Route coverage: 79 routes (77 Swagger + 2 support)
 *
 * ─────────────────────────────────────────────────────────────
 *  Section               File
 * ─────────────────────────────────────────────────────────────
 *  Auth (9)              authApi.ts
 *  Dashboard (2)         dashboardApi.ts
 *  Notifications (2)     notificationApi.ts
 *  Users (6)             management/usersApi.ts
 *  Farms (4)             management/farmsApi.ts
 *  Master Data (6+2)     management/masterDataApi.ts
 *  Batches (20)          management/batchesApi.ts + expensesApi.ts
 *  Inventory (2)         management/inventoryApi.ts
 *  Finance (5)           management/financeApi.ts
 *  Reports (9)           reportApi.ts
 *  Settings (2)          settingsApi.ts
 *  Subscriptions (4)     subscriptionApi.ts
 *  Support (2)           supportApi.ts
 *  Shared types          management/types.ts, authTypes.ts
 *  Utilities             management/pagination.ts, apiFeedback.ts
 * ─────────────────────────────────────────────────────────────
 */

// ── Core API client (axios instance, ApiError, apiRequest, apiRawRequest) ──
export {
  apiRequest,
  apiRawRequest,
  ApiError,
  API_BASE_URL,
  API_ROOT_URL,
} from "./api";

// ── Auth types (AuthSession, AuthTokens, ApiUser, ApiRole, ApiPermissionMatrix) ──
export type {
  ApiRole,
  ApiUserStatus,
  ApiPermissionMatrix,
  ApiUser,
  AuthTokens,
  AuthSession,
} from "./authTypes";

// ── Auth API — /auth/* (9 routes) ──
export {
  login,
  loginWithPin,
  registerOwner,
  refreshAuth,
  fetchMe,
  logout,
  changePassword,
  setServerPin,
  updateServerBiometric,
  updateFcmToken,
} from "./authApi";
export type {
  LoginResponse,
  RefreshResponse,
  RegisterOwnerRequest,
  ChangePasswordRequest,
  LoginPinRequest,
  SetPinRequest,
  UpdateBiometricRequest,
  UpdateFcmTokenRequest,
} from "./authApi";

// ── Auth session helpers (SecureStore persistence) ──
export {
  loadStoredSession,
  getStoredSession,
  persistStoredSession,
  clearStoredSession,
  subscribeToStoredSession,
} from "./authSession";

// ── Auth security helpers (PIN, biometric) ──
export {
  saveQuickPin,
  hasQuickPin,
  verifyQuickPin,
  setBiometricEnabled,
  isBiometricEnabled,
  hasAnyQuickAuth,
  getBiometricAvailability,
  authenticateWithBiometrics,
  clearQuickAuth,
  getPreferredQuickLoginRoute,
} from "./authSecurity";
export type { BiometricAvailability } from "./authSecurity";

// ── Auth validation helpers ──
export * from "./authValidation";

// ── Dashboard — /dashboard, /dashboard/financial (2 routes) ──
export {
  fetchDashboard,
  fetchFinancialDashboard,
} from "./dashboardApi";
export type {
  ApiDashboardSummary,
  ApiDashboardBatch,
  ApiDashboardAlert,
  ApiFinancialDashboard,
  ApiFinancialDashboardTransaction,
  ApiPaymentStatusSummary,
} from "./dashboardApi";

// ── Notifications — /notifications (2 routes) ──
export {
  listNotifications,
  markNotificationRead,
} from "./notificationApi";
export type {
  ApiNotification,
  ApiNotificationListResponse,
  ApiNotificationType,
  ApiNotificationSeverity,
  ListNotificationsParams,
} from "./notificationApi";

// ── Management (Users, Farms, Batches, Master Data, Expenses, Inventory, Finance) ──
// This single re-export covers all 43 management routes + shared types + utilities.
export * from "./managementApi";

// ── Reports — /reports/* (9 routes) ──
export {
  fetchOverviewReport,
  fetchFarmSummary,
  fetchBatchSummary,
  fetchExpenseReport,
  fetchInventoryReport,
  fetchProfitabilityReport,
  fetchSettlementReport,
  downloadBatchExcelReport,
  downloadBatchPdfReport,
} from "./reportApi";
export type {
  ApiOverviewReport,
  ApiFarmSummary,
  ApiBatchSummary,
  ApiExpenseReportRow,
  ApiInventoryReportRow,
  ApiProfitabilityReportRow,
  ApiSettlementReportRow,
} from "./reportApi";

// ── Settings — /settings/organization (2 routes) ──
export {
  fetchOrganizationSettings,
  updateOrganizationSettings,
} from "./settingsApi";
export type {
  ApiOrganizationSettings,
  UpdateOrganizationSettingsRequest,
} from "./settingsApi";

// ── Subscriptions — /subscriptions/* (4 routes) ──
export {
  listSubscriptionPlans,
  fetchCurrentSubscription,
  requestSubscription,
  submitSubscriptionPayment,
} from "./subscriptionApi";
export type {
  ApiSubscriptionPlan,
  ApiSubscription,
  ApiSubscriptionPayment,
  ApiSubscriptionStatus,
  ApiPaymentStatus,
  CreateSubscriptionRequest,
  SubmitSubscriptionPaymentRequest,
} from "./subscriptionApi";

// ── Support — /health, /docs (2 routes) ──
export {
  fetchHealth,
  fetchDocsHtml,
} from "./supportApi";
export type { ApiHealthResponse } from "./supportApi";

// ── Feedback / Toast utilities ──
export {
  getRequestErrorMessage,
  showRequestErrorToast,
  showSuccessToast,
} from "./apiFeedback";

// ── Route guards & role helpers ──
export {
  getRoleRouteGroup,
  getDashboardRoute,
  isRouteAllowedForRole,
  getRouteRequiredPermission,
  canAccessRoute,
} from "./routeGuards";
export type { AppRole } from "./routeGuards";

// ── Permission visibility rules ──
export {
  BOTTOM_TAB_PERMISSIONS,
  OWNER_MANAGE_PERMISSION_REQUIREMENTS,
  TASK_PERMISSION_REQUIREMENTS,
  canShowForPermissions,
  getVisibleBottomTabNames,
} from "./permissionRules";
export type {
  AppPermission,
  PermissionRequirement,
} from "./permissionRules";

// ── Date utilities ──
export * from "./dateUtils";
