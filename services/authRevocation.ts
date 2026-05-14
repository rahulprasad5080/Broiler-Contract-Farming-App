import type { ApiUser } from "./authTypes";

export const REVOKED_USER_MESSAGE =
  "Your account is no longer active. Please contact your administrator.";

export class RevokedUserError extends Error {
  constructor(message = REVOKED_USER_MESSAGE) {
    super(message);
    this.name = "RevokedUserError";
  }
}

const REVOKED_STATUS_TERMS = [
  "revoked",
  "disabled",
  "deactivated",
  "inactive",
  "suspended",
  "blocked",
];

type RevocationErrorShape = {
  status?: number;
  message?: string;
  payload?: unknown;
};

type SessionUserStatus = Pick<ApiUser, "status"> | null | undefined;

function collectText(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectText(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectText(item),
    );
  }

  return [];
}

function includesRevokedTerm(value: string) {
  const normalized = value.toLowerCase();
  return REVOKED_STATUS_TERMS.some((term) => normalized.includes(term));
}

export function isRevokedUser(user: SessionUserStatus) {
  return user?.status === "DISABLED";
}

export function assertUserCanKeepSession<T extends SessionUserStatus>(user: T) {
  if (isRevokedUser(user)) {
    throw new RevokedUserError();
  }

  return user;
}

export function isRevokedUserError(error: unknown) {
  return (
    error instanceof RevokedUserError ||
    (Boolean(error) &&
      typeof error === "object" &&
      (error as { name?: unknown }).name === "RevokedUserError")
  );
}

export function isRevokedAuthFailure(error: RevocationErrorShape) {
  if (error.status !== 401 && error.status !== 403) {
    return false;
  }

  const messages = [
    ...(error.message ? [error.message] : []),
    ...collectText(error.payload),
  ];

  return messages.some(includesRevokedTerm);
}
