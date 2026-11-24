import { connection } from 'next/server';
import { getLiveTraffic, LIVE_CACHE_SECONDS } from '@/lib/live-traffic';

export async function GET() {
  // Siempre en el momento del pedido (nunca prerenderizado en el build).
  await connection();
  const data = await getLiveTraffic();
  return Response.json(data, {
    headers: {
      // La CDN de Vercel comparte la respuesta entre todos los visitantes unos minutos.
      'Cache-Control': data.enabled && !data.error
        ? `public, s-maxage=${LIVE_CACHE_SECONDS}, stale-while-revalidate=60`
        : 'no-store',
    },
  });
}
