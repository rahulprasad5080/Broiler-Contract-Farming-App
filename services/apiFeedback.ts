import Toast from "react-native-toast-message";

type ToastPosition = "top" | "bottom";

type ErrorToastOptions = {
  title?: string;
  fallbackMessage?: string;
  position?: ToastPosition;
};

export function getRequestErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong.",
) {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return fallbackMessage;
}

export function showRequestErrorToast(
  error: unknown,
  { title = "Request failed", fallbackMessage = "Something went wrong.", position = "bottom" }: ErrorToastOptions = {},
) {
  const message = getRequestErrorMessage(error, fallbackMessage);

  Toast.show({
    type: "error",
    text1: title,
    text2: message,
    position,
  });

  return message;
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
