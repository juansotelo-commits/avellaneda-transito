import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, createAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const validEmail = process.env.ADMIN_EMAIL || 'admin@avellaneda.local';
  const validPass = process.env.ADMIN_PASSWORD || 'AvellanedaTransito2026';

  if (email !== validEmail || password !== validPass) {
    return NextResponse.json({ error: 'Credenciales inv\u00e1lidas' }, { status: 401 });
  }
  const token = createAdminToken(email);
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 12,
  });
  return res;
}
