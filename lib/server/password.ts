import 'server-only';

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }

  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const candidate = (await scrypt(password, salt, 64)) as Buffer;
  const target = Buffer.from(hash, 'hex');

  if (candidate.length !== target.length) {
    return false;
  }

  return timingSafeEqual(candidate, target);
}
