export const DB_NAME = 'applyflow_local';
export const DB_VERSION = 1;
export const STORE_APPLICATIONS = 'applications';

export function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is not available on the server'));
    }

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
