import type { DriverLocationInput } from "@ezygo/contracts";

const DATABASE_NAME = "ezygo-driver-outbox";
const STORE_NAME = "latest-location";
const LOCATION_KEY = "driver-location";

type QueuedLocation = DriverLocationInput & { capturedAt: number };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function queueLatestLocation(location: DriverLocationInput) {
  const queued: QueuedLocation = { ...location, capturedAt: Date.now() };
  await transact("readwrite", (store) => store.put(queued, LOCATION_KEY));
}

export async function readQueuedLocation(): Promise<QueuedLocation | null> {
  const result = await transact<QueuedLocation | undefined>("readonly", (store) =>
    store.get(LOCATION_KEY)
  );
  return result ?? null;
}

export async function clearQueuedLocation(): Promise<void> {
  await transact("readwrite", (store) => store.delete(LOCATION_KEY));
}
