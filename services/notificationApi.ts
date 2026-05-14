import { apiRequest } from "./api";
import type { ApiCommentTargetType } from "./management/types";

export type ApiNotificationType =
  | "MORTALITY_ALERT"
  | "FEED_ALERT"
  | "VACCINE_DUE"
  | "FCR_ALERT"
  | "PENDING_ENTRY"
  | "SALES_READY"
  | "PAYMENT_DUE"
  | "GENERAL";

export type ApiNotificationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ApiNotification = {
  id: string;
  organizationId: string;
  farmId?: string | null;
  batchId?: string | null;
  type: ApiNotificationType;
  severity: ApiNotificationSeverity;
  title: string;
  message: string;
  /** Deep-link target type (same enum as comments) */
  targetType?: ApiCommentTargetType | string | null;
  targetId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  readById?: string | null;
  createdAt: string;
};

/** Response shape for GET /notifications — returns data array without pagination meta */
export type ApiNotificationListResponse = {
  data: ApiNotification[];
};

export type ListNotificationsParams = {
  /** Pass true to return only unread notifications (useful for badge counts) */
  unreadOnly?: boolean;
};

/**
 * GET /api/v1/notifications
 * Load alerts, reminders, and workflow notifications for the signed-in user.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR, FARMER
 */
export async function listNotifications(
  token: string,
  params: ListNotificationsParams = {},
) {
  return apiRequest<ApiNotificationListResponse>("/notifications", {
    method: "GET",
    token,
    query: params,
  });
}

/**
 * PATCH /api/v1/notifications/{notificationId}/read
 * Mark a single notification as read. Returns the updated notification record.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR, FARMER
 */
export async function markNotificationRead(
  token: string,
  notificationId: string,
) {
  return apiRequest<ApiNotification>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
  });
}
