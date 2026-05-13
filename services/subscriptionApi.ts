import { apiRequest } from "./api";

export type ApiSubscriptionStatus =
  | "ACTIVE"
  | "TRIAL"
  | "GRACE"
  | "EXPIRED"
  | "PENDING_APPROVAL"
  | "CANCELLED";

export type ApiPaymentStatus = "EXPIRED" | "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type ApiSubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  amountInr: number;
  durationDays: number;
  maxFarms: number | null;
  maxUsers: number | null;
  description?: string | null;
  isActive: boolean;
};

export type ApiSubscriptionPayment = {
  id: string;
  organizationId: string;
  subscriptionId: string;
  amountInr: number;
  status: ApiPaymentStatus;
  referenceNumber?: string | null;
  payerName?: string | null;
  payerPhone?: string | null;
  proofUrl?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSubscription = {
  id: string;
  organizationId: string;
  planId: string;
  planCode: string;
  planName: string;
  status: ApiSubscriptionStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  amountInr: number;
  upiDeepLink?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  payments: ApiSubscriptionPayment[];
};

export type CreateSubscriptionRequest = {
  planCode: string;
};

export type SubmitSubscriptionPaymentRequest = {
  subscriptionId: string;
  referenceNumber?: string;
  payerName?: string;
  payerPhone?: string;
  proofUrl?: string;
};

export async function listSubscriptionPlans(token: string) {
  return apiRequest<ApiSubscriptionPlan[]>("/subscriptions/plans", {
    method: "GET",
    token,
  });
}

export async function fetchCurrentSubscription(token: string) {
  return apiRequest<ApiSubscription | null>("/subscriptions/current", {
    method: "GET",
    token,
  });
}

export async function requestSubscription(token: string, payload: CreateSubscriptionRequest) {
  return apiRequest<ApiSubscription>("/subscriptions/requests", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function submitSubscriptionPayment(
  token: string,
  payload: SubmitSubscriptionPaymentRequest,
) {
  return apiRequest<ApiSubscriptionPayment>("/subscriptions/payments", {
    method: "POST",
    token,
    body: payload,
  });
}
