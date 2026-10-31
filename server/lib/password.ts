import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [algorithm, salt, expectedHex] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;

  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actual, expected);
};
