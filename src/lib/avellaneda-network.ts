export const AVELLANEDA_CENTER = {
  lat: -34.6627,
  lng: -58.3656,
  zoom: 13,
};

export interface CorridorSeed {
  code: string;
  name: string;
  category: string;
  isCabaAccess: boolean;
  coordinates: [number, number][];
  centerLat: number;
  centerLng: number;
}

export interface SignalSeed {
  intersection: string;
  corridorCode: string;
  lat: number;
  lng: number;
  /** Nombres anteriores, para encontrar y corregir el semáforo ya guardado en la base. */
  formerNames?: string[];
}

// Trazados tomados de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL),
// simplificados a una línea central por avenida y recortados a Avellaneda y sus accesos.
export const AVELLANEDA_CORRIDORS: CorridorSeed[] = [
  {
    code: 'PUENTE_PUEYRREDON',
    name: 'Puente Pueyrredón (Acceso CABA)',
    category: 'ACCESO_CABA',
    isCabaAccess: true,
    coordinates: [
      [-58.37711, -34.64894],
      [-58.37613, -34.65166],
      [-58.37436, -34.65615],
      [-58.37279, -34.65749],
    ],
    centerLat: -34.65344,
    centerLng: -58.37543,
  },
  {
    code: 'PUENTE_NICOLAS_AVELLANEDA',
    name: 'Puente Nicolás Avellaneda (Acceso CABA)',
    category: 'ACCESO_CABA',
    isCabaAccess: true,
    coordinates: [
      [-58.35971, -34.63365],
      [-58.35915, -34.6337],
      [-58.35871, -34.63395],
      [-58.35723, -34.6366],
      [-58.35699, -34.63696],
      [-58.35661, -34.63732],
      [-58.35229, -34.64077],
      [-58.35123, -34.64184],
      [-58.34814, -34.64425],
      [-58.34341, -34.64804],
    ],
    centerLat: -34.64103,
    centerLng: -58.35204,
  },
  {
    code: 'AV_MITRE',
    name: 'Av. Bartolomé Mitre',
    category: 'AVENIDA_PRINCIPAL',
    isCabaAccess: false,
    coordinates: [
      [-58.37265, -34.65755],
      [-58.36971, -34.65891],
      [-58.36429, -34.66289],
      [-58.35718, -34.66648],
      [-58.35378, -34.67046],
      [-58.34936, -34.67514],
      [-58.34599, -34.67932],
      [-58.34444, -34.6818],
      [-58.34058, -34.68623],
      [-58.33651, -34.68972],
      [-58.32841, -34.69539],
      [-58.31745, -34.704],
      [-58.31319, -34.70803],
    ],
    centerLat: -34.68287,
    centerLng: -58.34351,
  },
  {
    code: 'AV_BELGRANO',
    name: 'Av. Manuel Belgrano',
    category: 'AVENIDA_PRINCIPAL',
    isCabaAccess: false,
    coordinates: [
      [-58.37026, -34.65948],
      [-58.37014, -34.65967],
      [-58.36933, -34.66028],
      [-58.36781, -34.66223],
      [-58.36127, -34.67206],
      [-58.36105, -34.6725],
      [-58.36113, -34.67326],
      [-58.35829, -34.67477],
      [-58.35792, -34.67506],
      [-58.33669, -34.69269],
      [-58.32993, -34.69804],
      [-58.32947, -34.69816],
      [-58.32899, -34.69852],
      [-58.32289, -34.70368],
      [-58.31552, -34.70958],
    ],
    centerLat: -34.68574,
    centerLng: -58.34506,
  },
  {
    code: 'AU_BSAS_LA_PLATA',
    name: 'Autopista Bs. As. - La Plata (Acceso CABA)',
    category: 'AUTOPISTA',
    isCabaAccess: true,
    coordinates: [
      [-58.35482, -34.63008],
      [-58.35422, -34.63077],
      [-58.3537, -34.63194],
      [-58.35357, -34.63267],
      [-58.35358, -34.63599],
      [-58.3531, -34.63805],
      [-58.35232, -34.63968],
      [-58.35072, -34.64242],
      [-58.35037, -34.64375],
      [-58.35035, -34.64458],
      [-58.35054, -34.64558],
      [-58.35117, -34.64698],
      [-58.35327, -34.6507],
      [-58.35311, -34.65223],
      [-58.35291, -34.6529],
      [-58.35182, -34.65515],
      [-58.34909, -34.65918],
      [-58.3475, -34.661],
      [-58.34537, -34.66311],
      [-58.34243, -34.66694],
      [-58.3412, -34.6682],
      [-58.33923, -34.66973],
      [-58.33663, -34.67138],
      [-58.33137, -34.67544],
      [-58.32926, -34.67675],
      [-58.32699, -34.67786],
      [-58.32445, -34.67878],
      [-58.29701, -34.68722],
      [-58.2908, -34.68875],
    ],
    centerLat: -34.66986,
    centerLng: -58.33902,
  },
  {
    code: 'ACCESO_SUDESTE',
    name: 'Acceso Sudeste',
    category: 'AUTOPISTA',
    isCabaAccess: false,
    coordinates: [
      [-58.3408, -34.66874],
      [-58.33985, -34.66944],
      [-58.33701, -34.67093],
      [-58.33378, -34.67367],
      [-58.33032, -34.67618],
      [-58.32812, -34.67738],
      [-58.32744, -34.67761],
      [-58.3262, -34.67739],
      [-58.32509, -34.67795],
      [-58.32465, -34.67837],
      [-58.3241, -34.67943],
      [-58.32424, -34.68037],
      [-58.32274, -34.68215],
      [-58.3057, -34.69567],
      [-58.30464, -34.6971],
      [-58.30421, -34.69825],
      [-58.30407, -34.69968],
      [-58.30434, -34.70374],
    ],
    centerLat: -34.68447,
    centerLng: -58.31982,
  },
];

export const INITIAL_SIGNALS: SignalSeed[] = [
  // Ubicaciones de las esquinas: Georef (datos.gob.ar) y OpenStreetMap.
  { intersection: 'Av. Mitre y Subida Puente Pueyrredón', corridorCode: 'PUENTE_PUEYRREDON', lat: -34.65749, lng: -58.37279 },
  { intersection: 'Av. Belgrano y Gral. Güemes', corridorCode: 'AV_BELGRANO', lat: -34.67253, lng: -58.36101 },
  { intersection: 'Av. Mitre y Alsina (Plaza Alsina)', corridorCode: 'AV_MITRE', lat: -34.66285, lng: -58.36439 },
  { intersection: 'Av. Mitre y Montes de Oca', corridorCode: 'AV_MITRE', lat: -34.65958, lng: -58.36872 },
  {
    intersection: 'Av. Mitre y Av. Mujeres Argentinas (Sarandí)', corridorCode: 'AV_MITRE', lat: -34.6784, lng: -58.34676,
    // Antes figuraba "Mitre y Crisólogo Larralde", pero esas dos avenidas no se cruzan
    // (Larralde corre paralela a Mitre). Se usa el cruce real más cercano.
    formerNames: ['Av. Mitre y Crisólogo Larralde'],
  },
  { intersection: 'Av. Mitre y Av. Ramón Franco (Villa Domínico)', corridorCode: 'AV_MITRE', lat: -34.69506, lng: -58.32892 },
  { intersection: 'Av. Belgrano y Arenales', corridorCode: 'AV_BELGRANO', lat: -34.66824, lng: -58.36384 },
  { intersection: 'Av. Debenedetti y Puente Nicolás Avellaneda', corridorCode: 'PUENTE_NICOLAS_AVELLANEDA', lat: -34.64804, lng: -58.34341 },
];

/**
 * Semáforos cargados desde el panel de Admin que quedaron en la ubicación por defecto.
 * Al publicar, la carga inicial los mueve a su esquina real (Georef, datos.gob.ar) y corrige
 * errores de tipeo en el nombre. Solo se aplica si el semáforo sigue en DEFAULT_SIGNAL_POSITION:
 * si alguien lo mueve después, no se vuelve a tocar.
 */
export const DEFAULT_SIGNAL_POSITION = { lat: -34.665, lng: -58.362 };

export interface SignalPositionFix {
  currentName: string;
  intersection: string;
  corridorCode: string | null;
  lat: number;
  lng: number;
}

export const ADMIN_SIGNAL_FIXES: SignalPositionFix[] = [
  { currentName: 'Avenida Belgrani y España ', intersection: 'Avenida Belgrano y España', corridorCode: 'AV_BELGRANO', lat: -34.66138, lng: -58.36837 },
  { currentName: 'Avenida Belgrano y Mariano Acosta', intersection: 'Avenida Belgrano y Mariano Acosta', corridorCode: 'AV_BELGRANO', lat: -34.66019, lng: -58.36944 },
  { currentName: 'Avenida Belgrabo y Berutti', intersection: 'Avenida Belgrano y Berutti', corridorCode: 'AV_BELGRANO', lat: -34.66235, lng: -58.3677 },
  { currentName: 'Avenida Belgrano y Alsina', intersection: 'Avenida Belgrano y Alsina', corridorCode: 'AV_BELGRANO', lat: -34.66427, lng: -58.36643 },
  { currentName: 'Avenida Belgrano y Piaggio', intersection: 'Avenida Belgrano y Piaggio', corridorCode: 'AV_BELGRANO', lat: -34.66515, lng: -58.36586 },
  { currentName: 'Avenida Belgrano e Italia', intersection: 'Avenida Belgrano e Italia', corridorCode: 'AV_BELGRANO', lat: -34.66682, lng: -58.36483 },
  { currentName: 'Avenida Belgrano y Nueve de Julio', intersection: 'Avenida Belgrano y Nueve de Julio', corridorCode: 'AV_BELGRANO', lat: -34.66584, lng: -58.36544 },
  { currentName: 'Avenida Belgrano y General Paz', intersection: 'Avenida Belgrano y General Paz', corridorCode: 'AV_BELGRANO', lat: -34.66753, lng: -58.36433 },
  { currentName: 'Avenida Belgrano y Velez Sarsfield', intersection: 'Avenida Belgrano y Vélez Sarsfield', corridorCode: 'AV_BELGRANO', lat: -34.67002, lng: -58.36265 },
  { currentName: 'Avenida Mitre y Olavarria', intersection: 'Avenida Mitre y Olavarría', corridorCode: 'AV_MITRE', lat: -34.66592, lng: -58.35823 },
  { currentName: 'Avenida Mitre y Castelli', intersection: 'Avenida Mitre y Castelli', corridorCode: 'AV_MITRE', lat: -34.6653, lng: -58.35942 },
  { currentName: 'Crisólogo Larralde y Onsari', intersection: 'Av. Crisólogo Larralde y Onsari', corridorCode: null, lat: -34.71233, lng: -58.32709 },
];
