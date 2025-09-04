const fs = require('fs-extra');
const path = require('path');
const { load } = require('./db');

async function collectReferencedUploads(db) {
  const refs = new Set();

  function walk(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      const idx = obj.indexOf('/uploads/');
      if (idx !== -1) {
        refs.add(path.basename(obj));
      }
      return;
    }
    if (Array.isArray(obj)) return obj.forEach(walk);
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) walk(obj[k]);
    }
  }

  walk(db);
  return refs;
}

async function cleanupUploads({ dryRun = true } = {}) {
  const db = load();
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  await fs.ensureDir(uploadsDir);
  const files = await fs.readdir(uploadsDir).catch(() => []);
  const refs = await collectReferencedUploads(db);

  const orphaned = files.filter((f) => !refs.has(f));
  const deleted = [];
  for (const file of orphaned) {
    const fp = path.join(uploadsDir, file);
    if (!dryRun) {
      try {
        await fs.unlink(fp);
        deleted.push(file);
      } catch (e) {
        // ignore individual failures
      }
    } else {
      deleted.push(file);
    }
  }

  return {
    uploadsDir,
    totalFiles: files.length,
    referenced: refs.size,
    orphaned: orphaned.length,
    deleted: deleted,
    dryRun: !!dryRun,
  };
}

module.exports = cleanupUploads;

if (require.main === module) {
  // run as CLI
  (async () => {
    const res = await cleanupUploads({ dryRun: false });
    console.log('cleanupUploads result:', res);
  })();
}
