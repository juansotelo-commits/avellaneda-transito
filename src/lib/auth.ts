import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'avellaneda_admin_session';
const isProd = process.env.NODE_ENV === 'production';

// En producción no hay valores de repuesto: si falta la variable en Vercel, el Admin queda cerrado.
// Los valores de desarrollo solo sirven en la computadora de quien programa.
function getSecret(): string | null {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  return isProd ? null : 'dev-only-local-secret';
}

export function getAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) return { email, password };
  return isProd ? null : { email: 'admin@local.test', password: 'dev-local' };
}

// Compara textos sin filtrar por el tiempo de respuesta cuántos caracteres coinciden.
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function createAdminToken(email: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({ email, role: 'ADMIN', exp: Date.now() + 1000 * 60 * 60 * 12 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(): Promise<{ email: string } | null> {
  const secret = getSecret();
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now() || parsed.role !== 'ADMIN') return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
