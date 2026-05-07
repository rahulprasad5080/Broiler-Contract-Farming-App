import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "../constants/Colors";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastOptions = {
  title?: string;
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

type ToastState = Required<Pick<ToastOptions, "message" | "tone" | "duration">> &
  Pick<ToastOptions, "title">;

const TOAST_COLORS: Record<ToastTone, string> = {
  success: Colors.primary,
  error: Colors.error,
  info: Colors.secondary,
  warning: Colors.warning,
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-12)).current;
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = React.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = React.useCallback(
    ({ tone = "info", duration = 2600, ...rest }: ToastOptions) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      opacity.setValue(0);
      translateY.setValue(-12);
      setToast({
        ...rest,
        tone,
        duration,
      });

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      });

      hideTimerRef.current = setTimeout(hideToast, duration);
    },
    [hideToast, opacity, translateY],
  );

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.viewport}>
          <Animated.View
            style={[
              styles.toast,
              {
                borderLeftColor: TOAST_COLORS[toast.tone],
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  message: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
