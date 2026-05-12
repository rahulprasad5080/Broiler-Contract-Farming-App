import { apiRequest } from "./api";
import type { ApiCommentTargetType, ListResponse } from "./management/types";

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
  targetType?: ApiCommentTargetType | string | null;
  targetId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  readById?: string | null;
  createdAt: string;
};

export type ListNotificationsParams = {
  unreadOnly?: boolean;
};

export async function listNotifications(
  token: string,
  params: ListNotificationsParams = {},
) {
  return apiRequest<ListResponse<ApiNotification>>("/notifications", {
    method: "GET",
    token,
    query: params,
  });
}

export async function markNotificationRead(
  token: string,
  notificationId: string,
) {
  return apiRequest<ApiNotification>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
  });
}
