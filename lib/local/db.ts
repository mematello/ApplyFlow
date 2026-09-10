export const DB_NAME = 'uppend_local';
export const DB_VERSION = 2;
export const STORE_APPLICATIONS = 'applications';

let migrationPromise: Promise<void> | null = null;

async function migrateLegacyDb(): Promise<void> {
  if (typeof window === 'undefined') return;

  return new Promise((resolve) => {
    // Attempt to open the legacy database to check for existence
    const req = indexedDB.open('applyflow_local');

    let isNew = false;

    req.onupgradeneeded = () => {
      // If onupgradeneeded fires, the database didn't previously exist
      isNew = true;
    };

    req.onsuccess = async () => {
      const legacyDb = req.result;

      if (isNew) {
        // It didn't exist, so close it, delete the newly created empty shell, and skip migration
        legacyDb.close();
        indexedDB.deleteDatabase('applyflow_local');
        return resolve();
      }

      // It existed. Check if the store is present
      if (!legacyDb.objectStoreNames.contains(STORE_APPLICATIONS)) {
        legacyDb.close();
        indexedDB.deleteDatabase('applyflow_local');
        return resolve();
      }

      // Extract all data from the legacy DB
      try {
        const data = await new Promise<Record<string, unknown>[]>((res, rej) => {
          const tx = legacyDb.transaction(STORE_APPLICATIONS, 'readonly');
          const store = tx.objectStore(STORE_APPLICATIONS);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => res(getAllReq.result);
          getAllReq.onerror = () => rej(getAllReq.error);
        });

        legacyDb.close();

        if (data.length > 0) {
          // Open the new DB directly to safely migrate data
          const newDb = await new Promise<IDBDatabase>((res, rej) => {
            const openReq = indexedDB.open(DB_NAME, DB_VERSION);
            openReq.onupgradeneeded = (e) => {
              const db = (e.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains(STORE_APPLICATIONS)) {
                db.createObjectStore(STORE_APPLICATIONS, { keyPath: 'id' });
              }
            };
            openReq.onsuccess = (e) => res((e.target as IDBOpenDBRequest).result);
            openReq.onerror = () => rej(openReq.error);
          });

          // Insert data into new DB using 'put' for idempotency
          await new Promise<void>((res, rej) => {
            const tx = newDb.transaction(STORE_APPLICATIONS, 'readwrite');
            const store = tx.objectStore(STORE_APPLICATIONS);
            data.forEach(item => store.put(item));
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
          });
          
          newDb.close();
        }

        // Data safely written to new DB, now delete legacy DB
        indexedDB.deleteDatabase('applyflow_local');
        resolve();
      } catch (err) {
        console.error('Legacy migration failed', err);
        resolve(); // Resolve anyway so we don't completely block the app startup
      }
    };

    req.onerror = () => {
      resolve(); // Proceed normally if we can't open the legacy DB
    };
  });
}

export async function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server');
  }

  // Ensure migration runs exactly once per session before resolving the DB
  if (!migrationPromise) {
    migrationPromise = migrateLegacyDb();
  }
  await migrationPromise;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject(new Error('Failed to open local database'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_APPLICATIONS)) {
        db.createObjectStore(STORE_APPLICATIONS, { keyPath: 'id' });
      }
    };
  });
}

export function clearDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
    request.onblocked = () => resolve(); // sometimes delete is blocked if connections are open, resolve anyway for cleanup
  });
}
