import { getDb, STORE_APPLICATIONS } from './db';
import { Application } from '../types';

// We omit user_id and other server-only fields for local storage
export type LocalApplication = Omit<Application, 'user_id'>;

function generateId() {
  return 'local_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

export async function getApplications(): Promise<LocalApplication[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_APPLICATIONS, 'readonly');
    const store = transaction.objectStore(STORE_APPLICATIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by date_applied desc manually as we don't have an index
      const data = request.result as LocalApplication[];
      
      // Default currency for backward compatibility
      const mappedData = data.map(app => ({
        ...app,
        currency: app.currency || 'PHP'
      }));
      
      mappedData.sort((a, b) => {
        const da = a.date_applied || '';
        const db = b.date_applied || '';
        return da > db ? -1 : da < db ? 1 : 0;
      });
      resolve(mappedData);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveApplication(data: Partial<LocalApplication>): Promise<LocalApplication> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_APPLICATIONS, 'readwrite');
    const store = transaction.objectStore(STORE_APPLICATIONS);

    const newApp: LocalApplication = {
      ...data,
      id: generateId(),
      currency: data.currency || 'PHP',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as LocalApplication;

    const request = store.add(newApp);
    request.onsuccess = () => resolve(newApp);
    request.onerror = () => reject(request.error);
  });
}

export async function updateApplication(id: string, data: Partial<LocalApplication>): Promise<LocalApplication> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_APPLICATIONS, 'readwrite');
    const store = transaction.objectStore(STORE_APPLICATIONS);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) return reject(new Error('Application not found locally'));

      const updated = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString()
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getApplicationById(id: string): Promise<LocalApplication | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_APPLICATIONS, 'readonly');
    const store = transaction.objectStore(STORE_APPLICATIONS);
    
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        resolve({
          ...request.result,
          currency: request.result.currency || 'PHP'
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteApplication(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_APPLICATIONS, 'readwrite');
    const store = transaction.objectStore(STORE_APPLICATIONS);
    
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
