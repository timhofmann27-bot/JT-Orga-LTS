const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_FILE = path.join(DATA_DIR, 'data.db');

function backup() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Database not found at', DB_FILE);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `data-${timestamp}.db`);

  fs.copyFileSync(DB_FILE, backupFile);
  console.log('Backup created:', backupFile);

  // Keep only last 10 backups
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('data-') && f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  for (let i = 10; i < backups.length; i++) {
    fs.unlinkSync(path.join(BACKUP_DIR, backups[i].name));
    console.log('Removed old backup:', backups[i].name);
  }
}

backup();
