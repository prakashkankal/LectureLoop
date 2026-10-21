import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const storePath = fileURLToPath(new URL('../../../../data/users.json', import.meta.url));
let users;

const loadUsers = () => {
  if (users) return users;

  try {
    const savedUsers = JSON.parse(readFileSync(storePath, 'utf8'));
    if (!Array.isArray(savedUsers)) {
      throw new Error('Local user store must contain a JSON array.');
    }
    users = new Map(savedUsers.map((user) => [user.email, user]));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    users = new Map();
  }

  return users;
};

const persistUsers = (userMap) => {
  const directory = path.dirname(storePath);
  const temporaryPath = `${storePath}.${randomUUID()}.tmp`;
  mkdirSync(directory, { recursive: true });

  try {
    writeFileSync(temporaryPath, JSON.stringify([...userMap.values()], null, 2), { mode: 0o600 });
    renameSync(temporaryPath, storePath);
  } finally {
    if (existsSync(temporaryPath)) rmSync(temporaryPath);
  }
};

export const findFallbackUserByEmail = (email) => loadUsers().get(email) ?? null;

export const findFallbackUserById = (id) => (
  [...loadUsers().values()].find((user) => user.id === id) ?? null
);

export const saveFallbackUser = (user) => {
  const userMap = loadUsers();
  if (userMap.has(user.email)) return false;

  userMap.set(user.email, user);
  try {
    persistUsers(userMap);
  } catch (error) {
    userMap.delete(user.email);
    throw error;
  }

  return true;
};
