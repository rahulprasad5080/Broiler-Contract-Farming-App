import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ApiError } from "./api";
import {
  createBatchExpense,
  createDailyLog,
  createSale,
  createTreatment,
  updateDailyLog,
  type CreateBatchExpenseRequest,
  type CreateDailyLogRequest,
  type CreateSaleRequest,
  type CreateTreatmentRequest,
  type UpdateDailyLogRequest,
} from "./managementApi";

const OFFLINE_QUEUE_KEY = "offline_submission_queue_v1";

export type OfflineSubmission =
  | {
      id: string;
      type: "daily-entry";
      createdAt: string;
      attempts: number;
      lastError?: string;
      payload: { batchId: string; body: CreateDailyLogRequest };
    }
  | {
      id: string;
      type: "daily-entry-update";
      createdAt: string;
      attempts: number;
      lastError?: string;
      payload: { batchId: string; dailyLogId: string; body: UpdateDailyLogRequest };
    }
  | {
      id: string;
      type: "expense-entry";
      createdAt: string;
      attempts: number;
      lastError?: string;
      payload: { batchId: string; body: CreateBatchExpenseRequest };
    }
  | {
      id: string;
      type: "sales-entry";
      createdAt: string;
      attempts: number;
      lastError?: string;
      payload: { batchId: string; body: CreateSaleRequest };
    }
  | {
      id: string;
      type: "treatment-entry";
      createdAt: string;
      attempts: number;
      lastError?: string;
      payload: { batchId: string; body: CreateTreatmentRequest };
    };

type NewOfflineSubmission = Omit<OfflineSubmission, "id" | "createdAt" | "attempts" | "lastError">;

type SyncResult = {
  synced: number;
  failed: number;
  remaining: number;
};

let syncInFlight = false;

function createQueueId(type: OfflineSubmission["type"]) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Sync failed";
}

function isRetryableSyncError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500;
  }

  return true;
}

async function saveQueue(queue: OfflineSubmission[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function getOfflineQueue() {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineSubmission[]) : [];
  } catch {
    return [];
  }
}

export async function getOfflineQueueCount() {
  return (await getOfflineQueue()).length;
}

export async function enqueueOfflineSubmission(item: NewOfflineSubmission) {
  const queue = await getOfflineQueue();
  const queuedItem = {
    ...item,
    id: createQueueId(item.type),
    createdAt: new Date().toISOString(),
    attempts: 0,
  } as OfflineSubmission;

  await saveQueue([...queue, queuedItem]);
  return queuedItem;
}

export async function isNetworkConnected() {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
}

async function syncItem(token: string, item: OfflineSubmission) {
  if (item.type === "daily-entry") {
    await createDailyLog(token, item.payload.batchId, item.payload.body);
    return;
  }

  if (item.type === "daily-entry-update") {
    await updateDailyLog(
      token,
      item.payload.batchId,
      item.payload.dailyLogId,
      item.payload.body,
    );
    return;
  }

  if (item.type === "expense-entry") {
    await createBatchExpense(token, item.payload.batchId, item.payload.body);
    return;
  }

  if (item.type === "sales-entry") {
    await createSale(token, item.payload.batchId, item.payload.body);
    return;
  }

  await createTreatment(token, item.payload.batchId, item.payload.body);
}

export async function processOfflineQueue(token: string): Promise<SyncResult> {
  if (syncInFlight) {
    const remaining = await getOfflineQueueCount();
    return { synced: 0, failed: 0, remaining };
  }

  if (!(await isNetworkConnected())) {
    const remaining = await getOfflineQueueCount();
    return { synced: 0, failed: 0, remaining };
  }

  syncInFlight = true;

  try {
    const queue = await getOfflineQueue();
    const remainingQueue: OfflineSubmission[] = [];
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        await syncItem(token, item);
        synced += 1;
      } catch (error) {
        failed += 1;
        remainingQueue.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: getErrorMessage(error),
        });

        if (isRetryableSyncError(error)) {
          const index = queue.indexOf(item);
          remainingQueue.push(...queue.slice(index + 1));
          break;
        }
      }
    }

    await saveQueue(remainingQueue);
    return { synced, failed, remaining: remainingQueue.length };
  } finally {
    syncInFlight = false;
  }
}
