import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { initializeDatabase } from './db/sqlite.js';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
dotenv.config({ path: path.join(moduleRoot, '.env') });
const port = Number(process.env.PORT || 4179);
await initializeDatabase();
const app = createApp();
app.listen(port, '127.0.0.1', () => console.log(`Oral practice API listening on http://127.0.0.1:${port}`));