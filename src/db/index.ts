import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'data.db');
export const db = new Database(dbPath);

// Set restrictive permissions on database directory and files
try {
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(dbPath, 0o600);
} catch (e) {
  console.warn('Could not set restrictive permissions on database files:', e);
}

db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    person_id INTEGER,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    meeting_point TEXT,
    response_deadline TEXT,
    type TEXT DEFAULT 'event', -- 'wanderung', 'sport', 'demo', 'spontan'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invitees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    person_id INTEGER,
    name_snapshot TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'yes', 'no', 'maybe'
    comment TEXT,
    guests_count INTEGER DEFAULT 0,
    responded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL,
    UNIQUE(event_id, person_id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_type TEXT NOT NULL,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_invitation_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_at DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS registration_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    notes TEXT,
    claimer_person_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (claimer_person_id) REFERENCES persons(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS event_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    person_id INTEGER,
    is_admin INTEGER DEFAULT 0,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    is_closed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    UNIQUE(option_id, person_id)
  );

  CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_type TEXT NOT NULL, -- 'admin' or 'person'
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add person_id to admin_users if it doesn't exist (migration)
try {
  db.exec('ALTER TABLE admin_users ADD COLUMN person_id INTEGER');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding person_id column to admin_users:', e);
  }
}

// Add Account Lock columns (migration)
const tablesToSecure = ['admin_users', 'persons'];
for (const table of tablesToSecure) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN failed_login_attempts INTEGER DEFAULT 0`); } catch (e: any) {}
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN locked_until DATETIME`); } catch (e: any) {}
}

// Add meeting_point column if it doesn't exist (migration)
try {
  db.exec('ALTER TABLE events ADD COLUMN meeting_point TEXT');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding meeting_point column:', e);
  }
}

// Add is_archived column if it doesn't exist (migration)
try {
  db.exec('ALTER TABLE events ADD COLUMN is_archived INTEGER DEFAULT 0');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding is_archived column:', e);
  }
}

// Add username column if it doesn't exist (migration)
try {
  db.exec('ALTER TABLE persons ADD COLUMN username TEXT UNIQUE');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding username column:', e);
  }
}

// Add avatar_url column to admin_users if it doesn't exist (migration)
try {
  db.exec('ALTER TABLE admin_users ADD COLUMN avatar_url TEXT');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding avatar_url column to admin_users:', e);
  }
}

// Add email and password_hash to persons (migration)
try {
  db.exec('ALTER TABLE persons ADD COLUMN email TEXT UNIQUE');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding email column:', e);
  }
}

try {
  db.exec('ALTER TABLE persons ADD COLUMN password_hash TEXT');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding password_hash column:', e);
  }
}

try {
  db.exec('ALTER TABLE persons ADD COLUMN avatar_url TEXT');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding avatar_url column:', e);
  }
}

// Add type column if it doesn't exist (migration)
try {
  db.exec("ALTER TABLE events ADD COLUMN type TEXT DEFAULT 'event'");
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding type column:', e);
  }
}

// Add Google OAuth columns (migration)
try { db.exec('ALTER TABLE persons ADD COLUMN google_id TEXT UNIQUE'); } catch (e: any) {}
try { db.exec('ALTER TABLE persons ADD COLUMN google_email TEXT'); } catch (e: any) {}

// Create default admins if not exists
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.error('FATAL ERROR: ADMIN_PASSWORD environment variable is required to initialize the database.');
  console.error('Please set the ADMIN_PASSWORD environment variable before starting the server.');
  process.exit(1);
}

const defaultAdmins = [
  { username: 'Tim', password: adminPassword }
];

// Migrations — safe to run on every startup (ADD COLUMN fails silently if column exists)
const migrations = [
  `ALTER TABLE events ADD COLUMN is_archived INTEGER DEFAULT 0`,
  `ALTER TABLE events ADD COLUMN deadline_reminder_sent INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS board_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    content TEXT,
    author_person_id INTEGER,
    author_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS board_poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'member',
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    used_by TEXT DEFAULT '[]',
    expires_at DATETIME,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS board_poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(option_id, person_id),
    FOREIGN KEY (option_id) REFERENCES board_poll_options(id) ON DELETE CASCADE
  )`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* already exists */ }
}

for (const admin of defaultAdmins) {
  const exists = db.prepare('SELECT 1 FROM admin_users WHERE username = ?').get(admin.username);
  if (!exists) {
    const hash = bcrypt.hashSync(admin.password, 12);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(admin.username, hash);
  }
}

// Sync all admins to persons table so they can be invited
const allAdmins = db.prepare('SELECT id, username, person_id FROM admin_users').all() as {id: number, username: string, person_id: number | null}[];
for (const admin of allAdmins) {
  let personId = admin.person_id;
  
  if (!personId) {
    // Try to find by name if person_id is missing
    const existingPerson = db.prepare('SELECT id FROM persons WHERE name = ?').get(admin.username) as {id: number} | undefined;
    if (existingPerson) {
      personId = existingPerson.id;
      db.prepare('UPDATE admin_users SET person_id = ? WHERE id = ?').run(personId, admin.id);
    } else {
      // Create new person for admin
      const info = db.prepare('INSERT INTO persons (name, notes) VALUES (?, ?)').run(admin.username, 'Admin Account');
      personId = info.lastInsertRowid as number;
      db.prepare('UPDATE admin_users SET person_id = ? WHERE id = ?').run(personId, admin.id);
    }
  } else {
    // Ensure name is in sync
    db.prepare('UPDATE persons SET name = ? WHERE id = ?').run(admin.username, personId);
  }
}
