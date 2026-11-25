import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, createAdminToken, getAdminCredentials, safeEqual } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const creds = getAdminCredentials();
  if (!creds) {
    return NextResponse.json({ error: 'El acceso de Admin no está configurado en el servidor' }, { status: 503 });
  }
  // Se evalúan las dos comparaciones siempre, para no revelar cuál falló.
  const emailOk = safeEqual(email.toLowerCase(), creds.email.trim().toLowerCase());
  const passOk = safeEqual(password, creds.password);
  if (!emailOk || !passOk) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }
  const token = createAdminToken(creds.email);
  if (!token) {
    return NextResponse.json({ error: 'El acceso de Admin no está configurado en el servidor' }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true, email: creds.email });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 12,
  });
  return res;
}
