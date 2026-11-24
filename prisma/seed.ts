import { PrismaClient } from '@prisma/client';
import { AVELLANEDA_CENTER, AVELLANEDA_CORRIDORS, INITIAL_SIGNALS } from '../src/lib/avellaneda-network';

const prisma = new PrismaClient();

async function main() {
  const avellaneda = await prisma.municipality.upsert({
    where: { slug: 'avellaneda' },
    update: {},
    create: {
      slug: 'avellaneda', name: 'Partido de Avellaneda',
      centerLat: AVELLANEDA_CENTER.lat, centerLng: AVELLANEDA_CENTER.lng, zoom: AVELLANEDA_CENTER.zoom,
    },
  });
  for (const c of AVELLANEDA_CORRIDORS) {
    await prisma.roadCorridor.upsert({
      where: { code: c.code },
      update: {
        name: c.name, category: c.category, isCabaAccess: c.isCabaAccess,
        coordinatesJson: JSON.stringify(c.coordinates), centerLat: c.centerLat, centerLng: c.centerLng,
      },
      create: {
        municipalityId: avellaneda.id, code: c.code, name: c.name, category: c.category,
        isCabaAccess: c.isCabaAccess, coordinatesJson: JSON.stringify(c.coordinates),
        centerLat: c.centerLat, centerLng: c.centerLng,
      },
    });
  }
  if ((await prisma.trafficSignal.count({ where: { municipalityId: avellaneda.id } })) === 0) {
    for (const s of INITIAL_SIGNALS) {
      await prisma.trafficSignal.create({
        data: {
          municipalityId: avellaneda.id, intersection: s.intersection, corridorCode: s.corridorCode,
          lat: s.lat, lng: s.lng, status: 'SIN_INFORMACION', sourceType: 'CITIZEN',
        },
      });
    }
  } else {
    // Semáforos ya cargados: se corrige su ubicación (y el nombre, si cambió).
    // No se tocan el estado, los reportes ni los semáforos agregados desde el panel de admin.
    for (const s of INITIAL_SIGNALS) {
      const { count } = await prisma.trafficSignal.updateMany({
        where: { municipalityId: avellaneda.id, intersection: { in: [s.intersection, ...(s.formerNames ?? [])] } },
        data: { intersection: s.intersection, corridorCode: s.corridorCode, lat: s.lat, lng: s.lng },
      });
      if (count > 0) console.log(`Semáforo actualizado: ${s.intersection}`);
    }
  }
  console.log('Seed de Avellaneda Tr\u00e1nsito completado.');
}

main().finally(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
