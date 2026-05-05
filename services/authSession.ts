import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthSession } from "./authTypes";

const AUTH_USER_KEY = "murgi_auth_user";
const AUTH_TOKEN_KEY = "murgi_auth_tokens";

type SessionListener = (session: AuthSession | null) => void;

let cachedSession: AuthSession | null = null;
let hasLoadedSession = false;
const sessionListeners = new Set<SessionListener>();

function notifySessionListeners(session: AuthSession | null) {
  sessionListeners.forEach((listener) => listener(session));
}

async function readStoredTokens() {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(AUTH_TOKEN_KEY)
    : SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

async function writeStoredTokens(value: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, value);
}

async function removeStoredTokens() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  const [storedUser, storedTokens] = await Promise.all([
    AsyncStorage.getItem(AUTH_USER_KEY),
    readStoredTokens(),
  ]);

  if (!storedUser || !storedTokens) {
    cachedSession = null;
    hasLoadedSession = true;
    return null;
  }

  try {
    const session = {
      user: JSON.parse(storedUser),
      tokens: JSON.parse(storedTokens),
    } as AuthSession;

    cachedSession = session;
    hasLoadedSession = true;
    return session;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function getStoredSession(): Promise<AuthSession | null> {
  if (hasLoadedSession) {
    return cachedSession;
  }

  return loadStoredSession();
}

export async function persistStoredSession(session: AuthSession) {
  await Promise.all([
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user)),
    writeStoredTokens(JSON.stringify(session.tokens)),
  ]);

  cachedSession = session;
  hasLoadedSession = true;
  notifySessionListeners(session);
}

export async function clearStoredSession() {
  await Promise.all([AsyncStorage.removeItem(AUTH_USER_KEY), removeStoredTokens()]);

  cachedSession = null;
  hasLoadedSession = true;
  notifySessionListeners(null);
}

export function subscribeToStoredSession(listener: SessionListener) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}
