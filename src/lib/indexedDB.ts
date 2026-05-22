import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface JTOrgaDB extends DBSchema {
  events: {
    key: number;
    value: {
      id: number;
      title: string;
      date: string;
      location: string;
      description: string;
      cachedAt: number;
    };
    indexes: { 'by-date': string };
  };
  persons: {
    key: number;
    value: {
      id: number;
      name: string;
      email: string;
      cachedAt: number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  'sync-queue': {
    key: number;
    value: {
      id?: number;
      type: 'create' | 'update' | 'delete';
      entity: 'event' | 'person';
      data: any;
      timestamp: number;
    };
    indexes: { 'timestamp': number };
  };
}

let db: IDBPDatabase<JTOrgaDB> | null = null;

export async function initDB() {
  if (db) return db;

  db = await openDB<JTOrgaDB>('jt-orga-db', 1, {
    upgrade(db) {
      // Events store
      const eventStore = db.createObjectStore('events', { keyPath: 'id' });
      eventStore.createIndex('by-date', 'date');

      // Persons store
      db.createObjectStore('persons', { keyPath: 'id' });

      // Settings store
      db.createObjectStore('settings', { keyPath: 'key' });

      // Sync queue for offline operations
      const syncStore = db.createObjectStore('sync-queue', {
        keyPath: 'id',
        autoIncrement: true,
      });
      syncStore.createIndex('timestamp', 'timestamp');
    },
  });

  return db;
}

// Events
export async function cacheEvent(event: any) {
  const database = await initDB();
  await database.put('events', {
    ...event,
    cachedAt: Date.now(),
  });
}

export async function cacheEvents(events: any[]) {
  const database = await initDB();
  const tx = database.transaction('events', 'readwrite');
  await Promise.all([
    ...events.map((event) => tx.store.put({ ...event, cachedAt: Date.now() })),
    tx.done,
  ]);
}

export async function getCachedEvents() {
  const database = await initDB();
  return database.getAll('events');
}

export async function getCachedEvent(id: number) {
  const database = await initDB();
  return database.get('events', id);
}

// Persons
export async function cachePersons(persons: any[]) {
  const database = await initDB();
  const tx = database.transaction('persons', 'readwrite');
  await Promise.all([
    ...persons.map((person) => tx.store.put({ ...person, cachedAt: Date.now() })),
    tx.done,
  ]);
}

export async function getCachedPersons() {
  const database = await initDB();
  return database.getAll('persons');
}

// Settings
export async function setSetting(key: string, value: any) {
  const database = await initDB();
  await database.put('settings', { key, value });
}

export async function getSetting(key: string) {
  const database = await initDB();
  const result = await database.get('settings', key);
  return result?.value;
}

// Sync Queue
export async function addToSyncQueue(
  type: 'create' | 'update' | 'delete',
  entity: 'event' | 'person',
  data: any
) {
  const database = await initDB();
  await database.add('sync-queue', {
    type,
    entity,
    data,
    timestamp: Date.now(),
  });
}

export async function getSyncQueue() {
  const database = await initDB();
  return database.getAll('sync-queue');
}

export async function clearSyncQueueItem(id: number) {
  const database = await initDB();
  await database.delete('sync-queue', id);
}

export async function clearSyncQueue() {
  const database = await initDB();
  const tx = database.transaction('sync-queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// Cache cleanup
export async function cleanupCache(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
  const database = await initDB();
  const now = Date.now();
  
  const events = await database.getAll('events');
  const oldEvents = events.filter((e) => now - e.cachedAt > maxAge);
  
  const persons = await database.getAll('persons');
  const oldPersons = persons.filter((p) => now - p.cachedAt > maxAge);

  const tx = database.transaction(['events', 'persons'], 'readwrite');
  
  for (const event of oldEvents) {
    tx.objectStore('events').delete(event.id);
  }
  
  for (const person of oldPersons) {
    tx.objectStore('persons').delete(person.id);
  }
  
  await tx.done;
}
