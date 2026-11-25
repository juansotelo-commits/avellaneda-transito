import { PrismaClient } from '@prisma/client';
import {
  ADMIN_SIGNAL_FIXES, AVELLANEDA_CENTER, AVELLANEDA_CORRIDORS, DEFAULT_SIGNAL_POSITION, INITIAL_SIGNALS,
} from '../src/lib/avellaneda-network';
import { OSM_SIGNALS } from '../src/lib/osm-signals';

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

  // Semáforos cargados desde Admin que quedaron en la ubicación por defecto (ver ADMIN_SIGNAL_FIXES).
  const near = (v: number) => ({ gte: v - 0.0001, lte: v + 0.0001 });
  for (const fix of ADMIN_SIGNAL_FIXES) {
    const { count } = await prisma.trafficSignal.updateMany({
      where: {
        municipalityId: avellaneda.id, intersection: fix.currentName,
        lat: near(DEFAULT_SIGNAL_POSITION.lat), lng: near(DEFAULT_SIGNAL_POSITION.lng),
      },
      data: { intersection: fix.intersection, corridorCode: fix.corridorCode, lat: fix.lat, lng: fix.lng },
    });
    if (count > 0) console.log(`Semáforo ubicado en su esquina: ${fix.intersection}`);
  }
  // Semáforos de OpenStreetMap: se agregan una sola vez cada uno (externalApiId "osm:<id>")
  // y se saltean los que quedan a menos de 50 m de uno ya cargado (a mano o desde el panel).
  // No se toca ningún semáforo existente.
  const existing = await prisma.trafficSignal.findMany({
    where: { municipalityId: avellaneda.id }, select: { lat: true, lng: true, externalApiId: true },
  });
  const loadedOsm = new Set(existing.map((s) => s.externalApiId).filter(Boolean));
  const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    Math.hypot((a.lat - b.lat) * 111320, (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180));
  const toCreate = OSM_SIGNALS.filter((s) =>
    !loadedOsm.has(`osm:${s.osmId}`) && !existing.some((e) => meters(e, s) < 50));
  if (toCreate.length) {
    await prisma.trafficSignal.createMany({
      data: toCreate.map((s) => ({
        municipalityId: avellaneda.id, intersection: s.intersection, corridorCode: s.corridorCode,
        lat: s.lat, lng: s.lng, status: 'SIN_INFORMACION', sourceType: 'OSM', externalApiId: `osm:${s.osmId}`,
      })),
    });
  }
  console.log(`Semáforos de OpenStreetMap agregados: ${toCreate.length} (de ${OSM_SIGNALS.length}).`);
  console.log('Seed de Avellaneda Tr\u00e1nsito completado.');
}

main().finally(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
