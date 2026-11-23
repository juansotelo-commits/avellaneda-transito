// Prepara la base de datos durante el build (por ejemplo, en Vercel):
//   1. Crea o actualiza las tablas según prisma/schema.prisma (prisma db push).
//   2. Carga los datos iniciales de Avellaneda si faltan (prisma/seed.ts).
//
// - Si no hay DATABASE_URL, no hace nada y el build sigue normalmente.
// - Si algo falla, avisa en el log pero no frena la publicación de la web.
// - prisma db push NO borra datos: si un cambio del esquema implicara perder
//   datos, se niega y hay que resolverlo a mano.
// - Para saltear este paso, definir SKIP_DB_PREPARE=1.

import { spawnSync } from 'node:child_process';

const log = (msg) => console.log(`[prepare-db] ${msg}`);

if (process.env.SKIP_DB_PREPARE === '1') {
  log('SKIP_DB_PREPARE=1: no se toca la base.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  log('No hay DATABASE_URL configurada: se publica la web sin base de datos.');
  process.exit(0);
}

// Para crear tablas conviene una conexión directa (sin pooler), si el proveedor la ofrece.
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;
const env = { ...process.env, DATABASE_URL: directUrl };

function run(label, args) {
  log(`${label}...`);
  const result = spawnSync('npx', args, { stdio: 'inherit', env });
  if (result.status !== 0) {
    log(`AVISO: falló "${label}". La web se publica igual; revisá el log de arriba.`);
    return false;
  }
  return true;
}

if (run('Creando/actualizando tablas', ['prisma', 'db', 'push', '--skip-generate'])) {
  run('Cargando datos iniciales', ['tsx', 'prisma/seed.ts']);
}
