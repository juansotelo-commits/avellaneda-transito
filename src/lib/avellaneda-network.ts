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
}

export const AVELLANEDA_CORRIDORS: CorridorSeed[] = [
  {
    code: 'PUENTE_PUEYRREDON',
    name: 'Puente Pueyrredón (Acceso CABA)',
    category: 'ACCESO_CABA',
    isCabaAccess: true,
    coordinates: [
      [-58.3742, -34.6632],
      [-58.3728, -34.6601],
      [-58.3712, -34.6572],
      [-58.3698, -34.6545],
    ],
    centerLat: -34.6588,
    centerLng: -58.3720,
  },
  {
    code: 'PUENTE_NICOLAS_AVELLANEDA',
    name: 'Puente Nicolás Avellaneda (Acceso CABA)',
    category: 'ACCESO_CABA',
    isCabaAccess: true,
    coordinates: [
      [-58.3568, -34.6425],
      [-58.3562, -34.6398],
      [-58.3556, -34.6372],
    ],
    centerLat: -34.6398,
    centerLng: -58.3562,
  },
  {
    code: 'AV_MITRE',
    name: 'Av. Bartolomé Mitre',
    category: 'AVENIDA_PRINCIPAL',
    isCabaAccess: false,
    coordinates: [
      [-58.3712, -34.6572],
      [-58.3656, -34.6627],
      [-58.3555, -34.6725],
      [-58.3440, -34.6835],
      [-58.3325, -34.6945],
    ],
    centerLat: -34.6725,
    centerLng: -58.3555,
  },
  {
    code: 'AV_BELGRANO',
    name: 'Av. Manuel Belgrano',
    category: 'AVENIDA_PRINCIPAL',
    isCabaAccess: false,
    coordinates: [
      [-58.3742, -34.6632],
      [-58.3672, -34.6665],
      [-58.3585, -34.6745],
      [-58.3475, -34.6850],
    ],
    centerLat: -34.6745,
    centerLng: -58.3585,
  },
  {
    code: 'AU_BSAS_LA_PLATA',
    name: 'Autopista Bs. As. - La Plata (Acceso CABA)',
    category: 'AUTOPISTA',
    isCabaAccess: true,
    coordinates: [
      [-58.3580, -34.6455],
      [-58.3490, -34.6580],
      [-58.3385, -34.6720],
      [-58.3270, -34.6875],
    ],
    centerLat: -34.6650,
    centerLng: -58.3435,
  },
  {
    code: 'ACCESO_SUDESTE',
    name: 'Acceso Sudeste',
    category: 'AUTOPISTA',
    isCabaAccess: false,
    coordinates: [
      [-58.3490, -34.6580],
      [-58.3455, -34.6685],
      [-58.3415, -34.6795],
      [-58.3375, -34.6910],
    ],
    centerLat: -34.6740,
    centerLng: -58.3435,
  },
];

export const INITIAL_SIGNALS: SignalSeed[] = [
  { intersection: 'Av. Mitre y Subida Puente Pueyrredón', corridorCode: 'PUENTE_PUEYRREDON', lat: -34.6572, lng: -58.3712 },
  { intersection: 'Av. Belgrano y Gral. Güemes', corridorCode: 'AV_BELGRANO', lat: -34.6632, lng: -58.3742 },
  { intersection: 'Av. Mitre y Alsina (Plaza Alsina)', corridorCode: 'AV_MITRE', lat: -34.6627, lng: -58.3656 },
  { intersection: 'Av. Mitre y Montes de Oca', corridorCode: 'AV_MITRE', lat: -34.6685, lng: -58.3598 },
  { intersection: 'Av. Mitre y Crisólogo Larralde', corridorCode: 'AV_MITRE', lat: -34.6765, lng: -58.3515 },
  { intersection: 'Av. Mitre y Av. Ramón Franco (Villa Domínico)', corridorCode: 'AV_MITRE', lat: -34.6915, lng: -58.3355 },
  { intersection: 'Av. Belgrano y Arenales', corridorCode: 'AV_BELGRANO', lat: -34.6675, lng: -58.3655 },
  { intersection: 'Av. Debenedetti y Puente Nicolás Avellaneda', corridorCode: 'PUENTE_NICOLAS_AVELLANEDA', lat: -34.6425, lng: -58.3568 },
];
