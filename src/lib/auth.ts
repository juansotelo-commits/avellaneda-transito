import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'avellaneda_admin_session';

function getSecret() {
  return process.env.ADMIN_JWT_SECRET || 'dev-only-change-in-production-avellaneda';
}

export function createAdminToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, role: 'ADMIN', exp: Date.now() + 1000 * 60 * 60 * 12 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.exp < Date.now() || parsed.role !== 'ADMIN') return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
