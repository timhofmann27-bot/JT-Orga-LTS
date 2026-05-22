#!/bin/bash
# ============================================================================
# JT-Orga Backup Script
# Automated daily backups with verification
# ============================================================================

set -e

# Configuration
APP_NAME="JT-ORGA"
BACKUP_DIR="/opt/jt-orga-backups"
DATA_DIR="/opt/jt-orga/data"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/backup_${DATE}.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

log "${GREEN}=== Starting $APP_NAME Backup ===${NC}"

# ============================================================================
# 1. Database Backup
# ============================================================================
log "${YELLOW}[1/5] Backing up database...${NC}"

DB_FILE="${DATA_DIR}/data.db"
BACKUP_DB="${BACKUP_DIR}/data_${DATE}.db"

if [ -f "${DB_FILE}" ]; then
    # Create backup using SQLite backup command (safe during writes)
    sqlite3 "${DB_FILE}" ".backup '${BACKUP_DB}'"

    # Verify backup integrity
    if sqlite3 "${BACKUP_DB}" "PRAGMA integrity_check;" | grep -q "ok"; then
        log "${GREEN}  ✓ Database backup verified${NC}"
    else
        log "${RED}  ✗ Database backup integrity check failed${NC}"
        exit 1
    fi

    # Compress database backup
    gzip "${BACKUP_DB}"
    log "${GREEN}  ✓ Database backup compressed${NC}"
else
    log "${YELLOW}  ⚠ Database file not found at ${DB_FILE}${NC}"
fi

# ============================================================================
# 2. Environment Configuration Backup
# ============================================================================
log "${YELLOW}[2/5] Backing up configuration...${NC}"

ENV_FILE="/opt/jt-orga/.env"
CADDY_FILE="/opt/jt-orga/Caddyfile"
DOCKER_COMPOSE="/opt/jt-orga/docker-compose.yml"

for file in "${ENV_FILE}" "${CADDY_FILE}" "${DOCKER_COMPOSE}"; do
    if [ -f "${file}" ]; then
        cp "${file}" "${BACKUP_DIR}/$(basename ${file})_${DATE}"
        log "${GREEN}  ✓ Backed up $(basename ${file})${NC}"
    else
        log "${YELLOW}  ⚠ File not found: ${file}${NC}"
    fi
done

# ============================================================================
# 3. Backup Audit Logs
# ============================================================================
log "${YELLOW}[3/5] Backing up audit logs...${NC}"

LOG_FILES="/opt/jt-orga/data/*.log"
BACKUP_LOGS="${BACKUP_DIR}/logs_${DATE}.tar.gz"

if ls ${LOG_FILES} 1>/dev/null 2>&1; then
    tar -czf "${BACKUP_LOGS}" -C "${DATA_DIR}" *.log 2>/dev/null || true
    log "${GREEN}  ✓ Audit logs backed up${NC}"
else
    log "${YELLOW}  ⚠ No log files found${NC}"
fi

# ============================================================================
# 4. Create Full Backup Archive
# ============================================================================
log "${YELLOW}[4/5] Creating full backup archive...${NC}"

FULL_BACKUP="${BACKUP_DIR}/jt-orga-full-${DATE}.tar.gz"
tar -czf "${FULL_BACKUP}" -C "${BACKUP_DIR}" \
    "data_${DATE}.db.gz" \
    ".env_${DATE}" \
    "Caddyfile_${DATE}" \
    "docker-compose.yml_${DATE}" \
    "logs_${DATE}.tar.gz" 2>/dev/null || true

log "${GREEN}  ✓ Full backup archive created${NC}"

# ============================================================================
# 5. Verify and Clean Up
# ============================================================================
log "${YELLOW}[5/5] Verifying and cleaning up...${NC}"

# Verify full backup
if [ -f "${FULL_BACKUP}" ]; then
    BACKUP_SIZE=$(du -h "${FULL_BACKUP}" | cut -f1)
    log "${GREEN}  ✓ Full backup size: ${BACKUP_SIZE}${NC}"
else
    log "${RED}  ✗ Full backup creation failed${NC}"
    exit 1
fi

# Clean up individual backup files (keep full archive only)
rm -f "${BACKUP_DIR}/data_${DATE}.db.gz"
rm -f "${BACKUP_DIR}/.env_${DATE}"
rm -f "${BACKUP_DIR}/Caddyfile_${DATE}"
rm -f "${BACKUP_DIR}/docker-compose.yml_${DATE}"
rm -f "${BACKUP_DIR}/logs_${DATE}.tar.gz"

# Remove old backups (keep last N days)
find "${BACKUP_DIR}" -name "jt-orga-full-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "backup_*.log" -mtime +${RETENTION_DAYS} -delete

log "${GREEN}  ✓ Old backups cleaned (keeping last ${RETENTION_DAYS} days)${NC}"

# ============================================================================
# Summary
# ============================================================================
TOTAL_BACKUPS=$(ls -1 "${BACKUP_DIR}"/jt-orga-full-*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

log "${GREEN}=== Backup Complete ===${NC}"
log "Total backups: ${TOTAL_BACKUPS}"
log "Backup directory size: ${TOTAL_SIZE}"
log "Latest backup: ${FULL_BACKUP}"
log "Log file: ${LOG_FILE}"
