// Correcciones de semáforos cargados desde el panel de Admin (revisión del 25/11/2026).
// Se identifican por id. Cada corrección se aplica una sola vez y solo si el semáforo sigue
// como estaba: si alguien ya lo arregló a mano, no se toca.

export interface SignalMove {
  id: string; from: { lat: number; lng: number };
  intersection: string; corridorCode: string | null; lat: number; lng: number;
}
export interface SignalMerge { keepId: string; removeIds: string[]; intersection: string }

// Semáforos en un punto equivocado (casi todos, apilados en la ubicación por defecto del formulario viejo).
// Posiciones: OpenStreetMap y Georef (datos.gob.ar), que coinciden a menos de 20 m.
export const SIGNAL_MOVES: SignalMove[] = [
  { id: "cmwvym3nn0001ju08lx59tois", from: {lat: -34.665, lng: -58.362}, intersection: "Avenida Mitre y Estado de Israel", corridorCode: "AV_MITRE", lat: -34.68252, lng: -58.34382 },
  { id: "cmwvymh3a0001js08rzhhwpjd", from: {lat: -34.665, lng: -58.362}, intersection: "Avenida Mitre y Berutti", corridorCode: "AV_MITRE", lat: -34.66143, lng: -58.36626 },
  { id: "cmwvymtt80003js083wphr3mg", from: {lat: -34.665, lng: -58.362}, intersection: "Avenida Mitre y Piaggio", corridorCode: "AV_MITRE", lat: -34.66338, lng: -58.36344 },
  { id: "cmwvynws50007js08bkfuxvtx", from: {lat: -34.665, lng: -58.362}, intersection: "Crisólogo Larralde y Madariaga", corridorCode: null, lat: -34.6907, lng: -58.3537 },
  { id: "cmwvyocew0005ju08h5cnd0x6", from: {lat: -34.665, lng: -58.362}, intersection: "Hipólito Yrigoyen y Mariano Ferreyra", corridorCode: null, lat: -34.66328, lng: -58.37655 },
  { id: "cmwvyov2u0007ju089su2sz5s", from: {lat: -34.665, lng: -58.362}, intersection: "Hipólito Yrigoyen y Avenida Galicia", corridorCode: null, lat: -34.67692, lng: -58.38295 },
  { id: "cmwvyp3qv0009js08mr8itf92", from: {lat: -34.665, lng: -58.362}, intersection: "Avenida Galicia y Cabildo", corridorCode: null, lat: -34.67049, lng: -58.39064 },
  { id: "cmwvypgxl0009ju0800g12z0u", from: {lat: -34.665, lng: -58.362}, intersection: "Lacarra y De la Serna", corridorCode: null, lat: -34.68447, lng: -58.37349 },
  { id: "cmwvyptpy000bju08wxst2wc2", from: {lat: -34.665, lng: -58.362}, intersection: "Crisólogo Larralde y Güemes", corridorCode: null, lat: -34.67861, lng: -58.36821 },
  { id: "cmwvyq2dc000bjs08xahjeqbu", from: {lat: -34.665, lng: -58.362}, intersection: "Crisólogo Larralde y Lacarra", corridorCode: null, lat: -34.67936, lng: -58.36736 },
  { id: "cmwvyra93000djs088ce6omd3", from: {lat: -34.665, lng: -58.362}, intersection: "Crisólogo Larralde y Centenario Uruguayo", corridorCode: null, lat: -34.70241, lng: -58.33978 },
  { id: "cmwwhle20000jlf0895l87i5y", from: {lat: -34.67851, lng: -58.34751}, intersection: "Avenida Belgrano y Salta", corridorCode: "AV_BELGRANO", lat: -34.68105, lng: -58.3507 },
  { id: "cmwwhkzkb0003lj07lownizcp", from: {lat: -34.69641, lng: -58.36878}, intersection: "Camino General Belgrano y Salta", corridorCode: null, lat: -34.69641, lng: -58.36878 },
];

// Una misma esquina cargada varias veces: queda uno solo (con los reportes de todos).
export const SIGNAL_MERGES: SignalMerge[] = [
  { keepId: "cmww2ak9v0017l008j3nnlocw", removeIds: ["cmww2luw1001dl008hpt11iyo","cmww1y0dz000vl008cj8wgc0f","cmww2kt1y001bl0087j1d1p2h","cmwvyszgv000fju08wy4apibc"], intersection: "Avenida Mitre y Florencio Varela / Dardo Rocha" },
  { keepId: "cmwv754vi000djs07wm2blbte", removeIds: ["cmww28aqs000bi607nck4c41w"], intersection: "Avenida Mitre y Castelli / Arenales" },
  { keepId: "cmww22uue0013l008j2x48zyr", removeIds: ["cmwv6mhim000ip67l6objb5oz"], intersection: "Avenida Mitre y Alsina / Sarmiento (Plaza Alsina)" },
  { keepId: "cmww23st80007i607y580wt3s", removeIds: ["cmwv6mhlr000kp67lk9lwmzgx"], intersection: "Avenida Mitre y Montes de Oca" },
  { keepId: "cmwwhhr38000dlf08e7cvuf7u", removeIds: ["cmwv6mhox000mp67le7axtv84", "cmww1ki8q000nl0085jantdsp"], intersection: "Avenida Mitre y Mujeres Argentinas / Craig" },
  { keepId: "cmww1suu7000jld083op9pi3d", removeIds: ["cmww2fbfv000ji6075l5ijy52"], intersection: "Avenida Mitre e Iguazú / Pastor Obligado" },
  { keepId: "cmww1o8uk000hld087uh1w686", removeIds: ["cmww2hh4u0019l008t51n99nu"], intersection: "Avenida Mitre y Estibau / Casella Piñero" },
  { keepId: "cmww219qv0001i6070wyca1f6", removeIds: ["cmww27k7b0009i607c3rrqb5r"], intersection: "Avenida Mitre y Lamadrid / Paz" },
  // Semáforos apilados que ya se habían vuelto a cargar bien ubicados (a veces con el otro nombre de la calle).
  { keepId: "cmww22lss0011l008klvd5az0", removeIds: ["cmwvyn4600005js08blxse8ex"], intersection: "Avenida Mitre y Laprida / Nueve de Julio" },
  { keepId: "cmww21ld90003i607wvbz49xe", removeIds: ["cmwvyndj80003ju080gtw9osl"], intersection: "Avenida Mitre y 12 de Octubre / Italia" },
  { keepId: "cmww1ynq8000zl008ymttjshq", removeIds: ["cmwvys7qp000dju08x9zngv1g", "cmwvyupwy000hju08p90x7kwo", "cmww29foe000di6070c0p4yz8"], intersection: "Avenida Mitre y Suárez / Paso" },
  { keepId: "cmww2b5k8000fi60715sy0etj", removeIds: ["cmww1wrgl000lld08zncou21n"], intersection: "Avenida Mitre y Lacarra / Llorente" },
];
