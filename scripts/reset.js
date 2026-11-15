// Reset generated data back to a fresh install.
//   npm run reset            → user data (history, Watch later, likes, searches, views) + thumbnails
//   npm run reset -- --all   → also delete downloaded videos (run `npm run seed` again afterwards)
// Stop the server first, otherwise it writes its in-memory data back on exit.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, THUMBS_DIR, VIDEOS_DIR } from '../apps/server/src/config.js';

const all = process.argv.includes('--all');
const targets = [path.join(DATA_DIR, 'db.json'), path.join(DATA_DIR, 'db.json.tmp'), THUMBS_DIR];
if (all) targets.push(VIDEOS_DIR);

for (const t of targets) {
  if (!fs.existsSync(t)) continue;
  fs.rmSync(t, { recursive: true, force: true });
  console.log('removed', path.relative(process.cwd(), t));
}
console.log(all ? 'Reset complete. Run `npm run seed` to download videos again.' : 'Reset complete.');
