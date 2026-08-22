// Real cryptography helpers built on the Web Crypto API.
// Passwords are never stored in plaintext or reversibly encoded.

const enc = new TextEncoder();

export const PBKDF2_ITERATIONS = 150_000;

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function randomToken(bytes = 32): string {
  return Array.from(randomBytes(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function uid(prefix = ''): string {
  return prefix + randomToken(8);
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toB64(bits);
}

/** Returns a self-describing hash string: pbkdf2$sha256$iterations$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toB64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, , iterStr, saltB64, hash] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const computed = await pbkdf2(password, fromB64(saltB64), parseInt(iterStr, 10));
    // constant-time-ish comparison
    if (computed.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function passwordStrength(pw: string): { score: number; label: string; issues: string[] } {
  const issues: string[] = [];
  if (pw.length < 10) issues.push('Use at least 10 characters');
  if (!/[a-z]/.test(pw)) issues.push('Add a lowercase letter');
  if (!/[A-Z]/.test(pw)) issues.push('Add an uppercase letter');
  if (!/[0-9]/.test(pw)) issues.push('Add a digit');
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('Add a symbol');
  const score = Math.max(0, 5 - issues.length);
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][score];
  return { score, label, issues };
}
