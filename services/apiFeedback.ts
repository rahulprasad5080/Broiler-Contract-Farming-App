import Toast from "react-native-toast-message";
import { ApiError } from "./api";

type ToastPosition = "top" | "bottom";

type ErrorToastOptions = {
  title?: string;
  fallbackMessage?: string;
  position?: ToastPosition;
};

export type RequestErrorInfo = {
  title: string;
  message: string;
  status?: number;
  isAuthExpired: boolean;
  isPermissionDenied: boolean;
  isNetworkError: boolean;
  isServerError: boolean;
};

function getApiErrorMessage(error: ApiError, fallbackMessage: string) {
  const message = error.message.trim();
  if (message) return message;

  if (error.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error.status === 0) {
    return "Unable to reach the server. Check your internet connection and try again.";
  }

  if (error.status >= 500) {
    return "Server is not responding properly. Please try again in a moment.";
  }

  return fallbackMessage;
}

export function getRequestErrorInfo(
  error: unknown,
  fallbackMessage = "Something went wrong.",
  fallbackTitle = "Request failed",
): RequestErrorInfo {
  if (error instanceof ApiError) {
    const isAuthExpired = error.status === 401;
    const isPermissionDenied = error.status === 403;
    const isNetworkError = error.status === 0;
    const isServerError = error.status >= 500;

    return {
      title: isAuthExpired
        ? "Session expired"
        : isPermissionDenied
          ? "Permission required"
          : isNetworkError
            ? "Network issue"
            : isServerError
              ? "Server issue"
              : fallbackTitle,
      message: getApiErrorMessage(error, fallbackMessage),
      status: error.status,
      isAuthExpired,
      isPermissionDenied,
      isNetworkError,
      isServerError,
    };
  }

  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : fallbackMessage;

  return {
    title: fallbackTitle,
    message,
    isAuthExpired: false,
    isPermissionDenied: false,
    isNetworkError: false,
    isServerError: false,
  };
}

export function getRequestErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong.",
) {
  return getRequestErrorInfo(error, fallbackMessage).message;
}

export function showRequestErrorToast(
  error: unknown,
  { title = "Request failed", fallbackMessage = "Something went wrong.", position = "bottom" }: ErrorToastOptions = {},
) {
  const info = getRequestErrorInfo(error, fallbackMessage, title);

  Toast.show({
    type: "error",
    text1: info.title,
    text2: info.message,
    position,
  });

  return info.message;
}

export function showSuccessToast(
  message: string,
  title = "Success",
  position: ToastPosition = "bottom",
) {
  Toast.show({
    type: "success",
    text1: title,
    text2: message,
    position,
  });
}
