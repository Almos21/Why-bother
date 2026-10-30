/* =====================================================================
   OBRA DIGITAL INTERACTIVA
   Una partícula gris decide entre las azules que la rodean y una
   partícula multicolor lejana, al otro lado de un círculo rojo.

   Cada azul que la gris se come hace aparecer un pedazo (~1/3) de una
   imagen. Las azules renacen, pero cada una que come alarga muchísimo su
   oscilación: hacia la tercera imagen casi ya no vuelve a comer.

   Cada vez que toca la multicolor lejana aparece un pedacito (~1/20) de una
   5ª imagen. Al completarse, la gris elige un píxel de colores vivos cerca del
   centro, va hasta él, toma su color y se encoge hasta que la imagen la
   asimila; las demás partículas desaparecen.

   Clic / toque / tecla R  ->  reinicia la obra (nueva decisión).

   TODO lo que se puede ajustar está en CONFIG.
   Las medidas en píxeles están pensadas para una pantalla de 800 px de
   lado menor y se escalan solas a cualquier tamaño de ventana.
   También puedes cambiar valores desde la URL sin tocar el código:
     tu-sitio.github.io/obra/?PROB_AZUL_INICIAL=0.5&CRECIMIENTO_PERIODO=0.3
   (útil para probar rápido: con CRECIMIENTO_PERIODO=0.3 ves las 4 imágenes en pocos minutos)
   ===================================================================== */

const CONFIG = {
  // ---------- DECISIÓN (lo más importante) ----------
  PROB_AZUL_INICIAL: 0.8,   // prob. de ir hacia las azules. El resto (1 - esto) va hacia la de afuera
  PROB_RENDIRSE: 0.4,       // prob. de rendirse al chocar con el círculo rojo, yendo hacia afuera
  ESPERA_INICIAL: 3,        // segundos de calma antes de la primera decisión

  // ---------- IMÁGENES (lo que aparece al comer azules) ----------
  IMAGENES: ['img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg'],  // en orden; al terminar la última vuelve a la primera
  COMIDAS_POR_IMAGEN: 3,    // azules necesarias para completar una imagen (cada una revela ~1/COMIDAS)
  IMAGEN_VARIACION: 0.04,   // cuánto varía ese "tercio" de una comida a otra (0 = exacto)
  IMAGEN_PARCHES: 3,        // en cuántas zonas/manchas aparece lo nuevo con cada azul
  IMAGEN_PROPAGACION: 5,    // segundos que tarda cada mancha en extenderse
  IMAGEN_FADE_CELDA: 2.5,   // segundos que tarda en aparecer cada trocito
  IMAGEN_BORRADO: 3,        // segundos que tarda en borrarse la imagen anterior
  IMAGEN_OPACIDAD: 0.9,     // 1 = imagen a todo color; menos = más oscura detrás de las partículas
  IMAGEN_AJUSTE: 'contain', // 'contain' = imagen completa con barras negras | 'cover' = llena la pantalla recortando
  IMAGEN_COLS: 26,          // la imagen se reparte en una cuadrícula de COLS x FILAS trocitos
  IMAGEN_FILAS: 40,

  // ---------- IMAGEN DE LAS PARTÍCULAS EXTERIORES (la 5ª) ----------
  IMAGEN_EXTERIOR: 'img/5.jpg',   // vacío ('') = las exteriores no revelan nada
  TOQUES_POR_IMAGEN_EXTERIOR: 20, // toques a la multicolor para completarla (cada uno revela ~1/20, mucho menos que una azul)
  IMAGEN_EXT_PARCHES: 2,          // en cuántas zonas aparece lo nuevo con cada toque
  IMAGEN_EXT_PROPAGACION: 1.5,    // segundos que tarda cada mancha en extenderse (más rápido: los toques llegan seguido)
  IMAGEN_EXT_FADE_CELDA: 1.2,     // segundos que tarda en aparecer cada trocito

  // ---------- AL COMPLETARSE ESA IMAGEN: la imagen asimila a la gris ----------
  ASIMILA_VIAJE: 3,         // segundos que tarda en llegar al píxel elegido
  ASIMILA_DURACION: 8,      // segundos que tarda en tomar su color y encogerse del todo
  ASIMILA_CENTRO: 0.3,      // cuánto prefiere el centro al elegir el píxel (menor = más pegado al centro; 5 = lo ignora)

  // ---------- LUZ DE LA GRIS ----------
  LUZ_POR_AZUL: 0.78,       // cada azul comida multiplica su luz por esto (1 = nunca se apaga)
  LUZ_MIN: 0.08,            // nunca baja de aquí
  LUZ_PARPADEO: 0.65,       // al comer una azul se apaga de golpe este % y se recupera (0 = sin parpadeo)
  LUZ_PARPADEO_SEG: 1.0,    // segundos que tarda en recuperarse de ese parpadeo

  // ---------- FONDO DIFUMINADO (solo el fondo, nunca partículas ni imagen) ----------
  FONDO_OPACIDAD: 0.6,      // intensidad del fondo hecho con los colores de la imagen (0 = negro puro)
  FONDO_BLUR: 6,            // qué tan difuminado (más = más suave)

  // ---------- ESCENA ----------
  N_AZULES: 12,
  RENACER_SEGUNDOS: 2.5,    // una azul comida reaparece (en otro sitio) tras estos segundos. -1 = no renacen
  N_ROJAS: 160,
  RADIO_CIRCULO: 190,       // radio del círculo de partículas rojas
  BANDA_ROJA: 42,           // semiancho de la zona donde el círculo frena a la gris
  ZONA_AZUL_MIN: 45,        // las azules viven entre estos dos radios (desde el centro)
  ZONA_AZUL_MAX: 140,
  RADIO_GRIS: 9,
  RADIO_AZUL: 5,
  RADIO_ROJA: 2.2,
  RADIO_LEJANA: 7,
  VEL_LEJANA: 8,            // lo lenta que vaga la multicolor (px/s)

  // ---------- OSCILACIÓN (el "latido" que lanza los impulsos) ----------
  PERIODO_BASE: 0.9,        // segundos entre impulsos al inicio
  // Cada azul comida multiplica el periodo: periodo = PERIODO_BASE * e^(CRECIMIENTO_PERIODO * comidas)
  //   comidas:  1 -> 1.2 s | 3 (1ª imagen) -> 2.2 s | 6 (2ª imagen) -> 5.4 s
  //             9 (3ª imagen) -> 13 s | 12 (4ª imagen) -> 33 s
  CRECIMIENTO_PERIODO: 0.3,
  PERIODO_MAX: 7200,        // tope en segundos
  PERIODO_MIN: 0.05,        // el periodo nunca baja de aquí (en frenesí)
  IMPULSO_AZUL: 380,        // fuerza de cada impulso hacia una azul (px/s)
  IMPULSO: 520,             // fuerza de cada impulso hacia la multicolor
  IMPULSO_POR_TOQUE: 0.12,  // en frenesí cada toque suma este % a los impulsos
  DISPERSION_IMPULSO: 0.12, // desvío aleatorio del impulso (radianes)

  // ---------- CADA VEZ QUE TOCA UNA MULTICOLOR (todavía sin imágenes) ----------
  // factor del periodo en el toque n = max(MIN, INICIAL - PASO * (n - 1))
  // primer toque: un poco más rápido; los siguientes, cada vez mucho más.
  FACTOR_PERIODO_INICIAL: 0.92,
  FACTOR_PERIODO_PASO: 0.06,
  FACTOR_PERIODO_MIN: 0.55,

  // ---------- MOVIMIENTO ----------
  ROZAMIENTO: 1.6,
  GUIADO_AZUL: 140,         // empujoncito continuo hacia la azul; se apaga solo cuando el periodo crece
  GUIADO_EXTERIOR: 150,
  GUIADO_FRENESI: 300,
  GUIADO_FRENESI_POR_TOQUE: 60,
  VEL_MAX_AZUL: 1100,
  VEL_MAX_EXTERIOR: 900,
  VEL_MAX_FRENESI_INICIAL: 900,
  VEL_MAX_FRENESI_FINAL: 2400,  // se alcanza tras ~10 toques
  TEMBLOR: 25,              // la "vida" propia: movimiento mínimo de la gris
  JITTER_ESPERA: 5,         // amplitud del movimiento mientras espera

  // ---------- OBSTÁCULOS ----------
  ROZAMIENTO_ANILLO: 22,    // cuánto frena el círculo rojo (más = más lento)
  VIENTO_ANILLO: 90,        // fuerza en contra del círculo rojo (debe ser menor que GUIADO_EXTERIOR, o nunca cruza)
  ROZAMIENTO_OBSTACULO: 5,  // cuánto frenan las azules al estorbar

  // ---------- LOOK ----------
  ESTELA: 0.22,             // 0 = estela infinita, 1 = sin estela
  AMPLITUD_OSC: 0.35,       // cuánto "late" visualmente la gris
  CRECIMIENTO_RADIO: 0.02,  // la gris crece un poco con cada azul
  ROTACION_CIRCULO: 0.03,   // giro lento del círculo rojo (rad/s)
  BRILLO_LEJANA: 0.4,       // lo tenue de la multicolor

  LOG_CONSOLA: false        // true = imprime las decisiones en la consola del navegador
};

// Permite sobrescribir cualquier valor de CONFIG desde la URL (?NOMBRE=valor)
if (typeof location !== 'undefined') {
  const params = new URLSearchParams(location.search);
  for (const k of Object.keys(CONFIG)) {
    if (!params.has(k)) continue;
    if (typeof CONFIG[k] === 'number') {
      const v = parseFloat(params.get(k));
      if (!isNaN(v)) CONFIG[k] = v;
    } else if (typeof CONFIG[k] === 'string') {
      CONFIG[k] = params.get(k);
    }
  }
}

/* ===================== utilidades ===================== */

function ruido(t, s) {
  // ruido suave y barato en [-1, 1]
  return 0.5 * Math.sin(t + s * 1.7) + 0.3 * Math.sin(t * 1.73 + s * 2.9 + 1.3) + 0.2 * Math.sin(t * 2.41 + s * 4.1 + 2.1);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function distSeg(px, py, ax, ay, bx, by) {
  // distancia de un punto al segmento a-b (evita atravesar objetivos a mucha velocidad)
  const abx = bx - ax, aby = by - ay;
  const l2 = abx * abx + aby * aby;
  let t = l2 ? ((px - ax) * abx + (py - ay) * aby) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function evento(m, tipo, extra) {
  const e = Object.assign({ t: +m.t.toFixed(2), tipo }, extra || {});
  m.eventos.push(e);
  if (m.eventos.length > 5000) m.eventos.shift();
  if (CONFIG.LOG_CONSOLA && typeof console !== 'undefined') console.log('[obra]', e);
}

/* ===================== imágenes ===================== */

const IMGS = [];   // { img, ok, w, h } por cada archivo de CONFIG.IMAGENES

function cargarImagenes() {
  // las de las azules van primero; la última (la 5ª) es la de las partículas exteriores
  const lista = CONFIG.IMAGENES.concat(CONFIG.IMAGEN_EXTERIOR ? [CONFIG.IMAGEN_EXTERIOR] : []);
  lista.forEach((src, i) => {
    const o = { img: new Image(), ok: false, w: 663, h: 1024 };
    o.img.onload = () => { o.ok = true; o.w = o.img.naturalWidth; o.h = o.img.naturalHeight; };
    o.img.onerror = () => { if (typeof console !== 'undefined') console.warn('[obra] no se pudo cargar', src); };
    o.img.src = src;
    IMGS[i] = o;
  });
}

// dónde se dibuja una imagen de iw x ih dentro de la ventana
function rectImagen(iw, ih) {
  const cover = CONFIG.IMAGEN_AJUSTE === 'cover';
  const s = cover ? Math.max(width / iw, height / ih) : Math.min(width / iw, height / ih);
  const w = iw * s, h = ih * s;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function nuevaCapa(m, idx, ext) {
  const C = CONFIG, N = C.IMAGEN_COLS * C.IMAGEN_FILAS;
  const capa = {
    idx, N, ext: !!ext,
    prop: ext ? C.IMAGEN_EXT_PROPAGACION : C.IMAGEN_PROPAGACION,
    fade: ext ? C.IMAGEN_EXT_FADE_CELDA : C.IMAGEN_FADE_CELDA,
    parches: ext ? C.IMAGEN_EXT_PARCHES : C.IMAGEN_PARCHES,
    ini: new Float32Array(N).fill(Infinity),   // instante en que cada trocito empieza a aparecer
    cxn: new Float32Array(N), cyn: new Float32Array(N), rf: new Float32Array(N),
    bdel: null,                                // retardo de borrado de cada trocito
    asignadas: 0, borrando: false, tBorra: 0, finAnim: 0, sucia: true,
    cv: null, mk: null, w: 0, h: 0
  };
  for (let i = 0; i < N; i++) {
    const col = i % C.IMAGEN_COLS, fila = Math.floor(i / C.IMAGEN_COLS);
    capa.cxn[i] = (col + 0.5 + (Math.random() - 0.5) * 0.5) / C.IMAGEN_COLS;
    capa.cyn[i] = (fila + 0.5 + (Math.random() - 0.5) * 0.5) / C.IMAGEN_FILAS;
    capa.rf[i] = 0.9 + Math.random() * 0.4;
  }
  return capa;
}

// posición (0..1) dentro de la imagen de un punto de la pantalla
function aNormalizada(idx, x, y) {
  const o = IMGS[idx] || { w: 663, h: 1024 };
  const r = rectImagen(o.w, o.h);
  return { x: clamp((x - r.x) / r.w, 0, 1), y: clamp((y - r.y) / r.h, 0, 1) };
}

// Aparece un pedazo nuevo de la imagen actual (o empieza otra, borrando la anterior)
function avanzarImagen(m, bx, by) {
  const C = CONFIG, A = m.arte;
  if (!C.IMAGENES.length) return;
  const K = Math.max(1, Math.round(C.COMIDAS_POR_IMAGEN));
  let capa = A.capas.length ? A.capas[A.capas.length - 1] : null;

  if (!capa || capa.borrando || A.comidas >= K) {
    // la imagen anterior estaba completa y se come otra azul: se borra y empieza la siguiente
    const nueva = (A.indice + 1) % C.IMAGENES.length;
    if (capa && !capa.borrando) iniciarBorrado(m, capa, aNormalizada(capa.idx, bx, by));
    A.indice = nueva;
    A.comidas = 0;
    capa = nuevaCapa(m, A.indice);
    A.capas.push(capa);
    evento(m, 'imagen_nueva', { imagen: A.indice + 1 });
  }

  A.comidas++;
  let frac = A.comidas >= K ? 1 : A.comidas / K + (Math.random() - 0.5) * 2 * C.IMAGEN_VARIACION;
  frac = clamp(frac, 0, 1);
  const n = Math.max(1, Math.round(frac * capa.N) - capa.asignadas);
  const s = aNormalizada(A.indice, bx, by);
  revelarCeldas(m, capa, n, s.x * C.IMAGEN_COLS, s.y * C.IMAGEN_FILAS);
  evento(m, 'revela', { imagen: A.indice + 1, parte: A.comidas + '/' + K, cobertura: +(capa.asignadas / capa.N).toFixed(2) });
}

// Elige n trocitos agrupados en manchas: una nace donde se comió la azul, las demás en sitios al azar
function revelarCeldas(m, capa, n, sx, sy) {
  const C = CONFIG, COLS = C.IMAGEN_COLS;
  const libres = [];
  for (let i = 0; i < capa.N; i++) if (capa.ini[i] === Infinity) libres.push(i);
  if (!libres.length) return;
  n = Math.min(n, libres.length);

  const semillas = [{ x: sx, y: sy }];
  for (let k = 1; k < Math.max(1, capa.parches); k++) {
    const i = libres[Math.floor(Math.random() * libres.length)];
    semillas.push({ x: (i % COLS) + 0.5, y: Math.floor(i / COLS) + 0.5 });
  }
  const pts = libres.map(i => {
    const x = (i % COLS) + 0.5, y = Math.floor(i / COLS) + 0.5;
    let d = Infinity;
    for (const s of semillas) d = Math.min(d, Math.hypot(x - s.x, y - s.y));
    return { i, d, score: d * (0.75 + 0.5 * Math.random()) + Math.random() * 1.5 };   // bordes irregulares
  });
  pts.sort((a, b) => a.score - b.score);
  const elegidas = pts.slice(0, n);
  const dmax = Math.max(1e-6, ...elegidas.map(e => e.d));
  for (const e of elegidas) {
    capa.ini[e.i] = m.t + (e.d / dmax) * capa.prop + Math.random() * 0.5;
    capa.finAnim = Math.max(capa.finAnim, capa.ini[e.i] + capa.fade);
  }
  capa.asignadas += n;
  capa.sucia = true;
}

// La imagen se deshace desde el punto donde se comió la azul
function iniciarBorrado(m, capa, s) {
  const C = CONFIG;
  capa.borrando = true;
  capa.tBorra = m.t;
  capa.bdel = new Float32Array(capa.N);
  for (let i = 0; i < capa.N; i++) {
    const d = Math.hypot(capa.cxn[i] - s.x, (capa.cyn[i] - s.y) * 1.55) / 1.3;
    capa.bdel[i] = C.IMAGEN_BORRADO * clamp(0.65 * d + 0.35 * Math.random(), 0, 1);
  }
  capa.sucia = true;
  evento(m, 'imagen_se_borra', { imagen: capa.idx + 1 });
}

function alfaCelda(capa, i, t) {
  const ini = capa.ini[i];
  if (ini === Infinity || t <= ini) return 0;
  const x = Math.min(1, (t - ini) / capa.fade);
  let a = x * x * (3 - 2 * x);
  if (capa.borrando) {
    const y = clamp((t - capa.tBorra - capa.bdel[i]) / 1.8, 0, 1);
    a *= 1 - y * y * (3 - 2 * y);
  }
  return a;
}

function suave(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Cada toque a la multicolor revela un pedacito de la 5ª imagen. Devuelve true cuando queda completa.
function revelarExterior(m, x, y) {
  const C = CONFIG, E = m.ext;
  if (!C.IMAGEN_EXTERIOR) return false;
  const idx = C.IMAGENES.length;
  if (!E.capa) {
    E.capa = nuevaCapa(m, idx, true);
    m.arte.capas.push(E.capa);
    evento(m, 'imagen_ext_nueva');
  }
  const capa = E.capa;
  const K = Math.max(1, Math.round(C.TOQUES_POR_IMAGEN_EXTERIOR));
  E.toques++;
  let frac = E.toques >= K ? 1 : E.toques / K + (Math.random() - 0.5) * C.IMAGEN_VARIACION;
  frac = clamp(frac, 0, 1);
  const n = Math.max(1, Math.round(frac * capa.N) - capa.asignadas);
  const s = aNormalizada(idx, x, y);
  revelarCeldas(m, capa, n, s.x * C.IMAGEN_COLS, s.y * C.IMAGEN_FILAS);
  evento(m, 'revela_ext', { parte: E.toques + '/' + K, cobertura: +(capa.asignadas / capa.N).toFixed(2) });
  return E.toques >= K;
}

// Elige el píxel de la imagen con color más vivo (lo más lejos posible del negro, del blanco y del gris),
// dando preferencia a la zona del centro. Devuelve su posición (0..1) y su color.
function elegirPixel(idx) {
  const C = CONFIG, o = IMGS[idx];
  const reserva = { nx: 0.5, ny: 0.45, rgb: [220, 110, 255] };   // si no se puede leer la imagen
  if (!o || !o.ok) return reserva;
  try {
    const W = 96, H = Math.max(8, Math.round(W * o.h / o.w));    // versión pequeña: cada píxel promedia un bloque
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.imageSmoothingQuality = 'high';
    c.drawImage(o.img, 0, 0, W, H);
    const d = c.getImageData(0, 0, W, H).data;
    const sg = Math.max(0.05, C.ASIMILA_CENTRO);
    let mejor = -1, bx = 0.5, by = 0.5, bc = reserva.rgb;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        const croma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;   // 0 en negro, blanco y grises
        const dx = (x + 0.5) / W - 0.5, dy = (y + 0.5) / H - 0.5;
        const peso = 0.2 + 0.8 * Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg));
        const s = croma * peso;
        if (s > mejor) { mejor = s; bx = (x + 0.5) / W; by = (y + 0.5) / H; bc = [r, g, b]; }
      }
    }
    return { nx: bx, ny: by, rgb: bc };
  } catch (e) {
    console.warn('[obra] no se pudo leer la imagen para elegir el píxel (¿abierta como file://?). Se usa un color de reserva.', e);
    return reserva;
  }
}

/* ===================== mundo ===================== */

function crearMundo() {
  const u = Math.min(width, height) / 800;
  const cx = width / 2, cy = height / 2;
  const C = CONFIG;
  const m = {
    u, cx, cy, t: 0, espera: C.ESPERA_INICIAL,
    azules: [], rojas: [], efectos: [], eventos: [], lejana: null, gris: null,
    arte: { indice: -1, comidas: 0, capas: [] },
    ext: { toques: 0, capa: null },   // la imagen de las exteriores
    fadeResto: 0                      // 0 = todo visible, 1 = ya desaparecieron las demás partículas
  };

  m.gris = {
    x: cx, y: cy, vx: 0, vy: 0, px: cx, py: cy,
    r0: C.RADIO_GRIS * u, r: C.RADIO_GRIS * u,
    estado: 'espera',          // espera | azules | exterior | frenesi
    fase: 0, periodo: C.PERIODO_BASE,
    comidas: 0, toques: 0,
    comprometido: false, dadoTirado: false, digiere: false,
    luz: 1, dip: 0, mezcla: 0, escala: 1, fin: null,
    destello: 0, obstruido: false,
    semilla: Math.random() * 100
  };

  // azules, repartidas alrededor de la gris sin pegarse entre sí
  let intentos = 0;
  while (m.azules.length < C.N_AZULES && intentos++ < 3000) {
    const ang = Math.random() * Math.PI * 2;
    const rad = (C.ZONA_AZUL_MIN + Math.sqrt(Math.random()) * (C.ZONA_AZUL_MAX - C.ZONA_AZUL_MIN)) * u;
    const hx = cx + Math.cos(ang) * rad, hy = cy + Math.sin(ang) * rad;
    if (m.azules.some(b => Math.hypot(b.hx - hx, b.hy - hy) < 26 * u)) continue;
    m.azules.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, r: C.RADIO_AZUL * u, vivo: true, aparece: 1, renace: -1, semilla: Math.random() * 100 });
  }

  // círculo de partículas rojas
  for (let i = 0; i < C.N_ROJAS; i++) {
    const a = (i / C.N_ROJAS) * Math.PI * 2 + (Math.random() - 0.5) * 0.015;
    const R = C.RADIO_CIRCULO * u;
    m.rojas.push({
      a, semilla: Math.random() * 100,
      x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, vx: 0, vy: 0,
      hx: cx + Math.cos(a) * R, hy: cy + Math.sin(a) * R
    });
  }

  m.lejana = nuevaLejana(m, false);
  return m;
}

function nuevaLejana(m, desdeGris) {
  const C = CONFIG, u = m.u, g = m.gris;
  const R = C.RADIO_CIRCULO * u;
  const margen = 45 * u;
  const minC = R * 1.45;                          // siempre fuera del círculo rojo
  const libre = R + C.BANDA_ROJA * u + 25 * u;    // el camino directo no debe cruzar el círculo
  const lado = Math.min(width, height);
  let mejor = null, mejorD = -1;

  for (let i = 0; i < 150; i++) {
    const x = margen + Math.random() * (width - 2 * margen);
    const y = margen + Math.random() * (height - 2 * margen);
    const dc = Math.hypot(x - m.cx, y - m.cy);
    if (dc < minC) continue;
    if (desdeGris) {
      if (Math.hypot(x - g.x, y - g.y) < lado * 0.3) continue;       // "lejos" de donde está la gris
      if (distSeg(m.cx, m.cy, g.x, g.y, x, y) < libre) continue;     // sin tener que cruzar el círculo
      mejor = { x, y };
      break;
    } else if (dc > mejorD) {                                          // la primera: lo más lejos posible
      mejorD = dc; mejor = { x, y };
    }
  }
  if (!mejor) {
    const base = desdeGris ? Math.atan2(g.y - m.cy, g.x - m.cx) + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2;
    mejor = {
      x: clamp(m.cx + Math.cos(base) * minC * 1.2, margen, width - margen),
      y: clamp(m.cy + Math.sin(base) * minC * 1.2, margen, height - margen)
    };
  }
  return { x: mejor.x, y: mejor.y, r: C.RADIO_LEJANA * u, ang: Math.random() * Math.PI * 2, semilla: Math.random() * 100, aparece: desdeGris ? 0 : 1 };
}

function renacerAzul(m, b) {
  const C = CONFIG, u = m.u, g = m.gris;
  for (let i = 0; i < 80; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = (C.ZONA_AZUL_MIN + Math.sqrt(Math.random()) * (C.ZONA_AZUL_MAX - C.ZONA_AZUL_MIN)) * u;
    const hx = m.cx + Math.cos(ang) * rad, hy = m.cy + Math.sin(ang) * rad;
    if (m.azules.some(o => o !== b && o.vivo && Math.hypot(o.hx - hx, o.hy - hy) < 26 * u)) continue;
    if (Math.hypot(hx - g.x, hy - g.y) < 45 * u) continue;     // no nace encima de la gris
    b.hx = hx; b.hy = hy;
    break;
  }
  b.x = b.hx; b.y = b.hy; b.vx = 0; b.vy = 0;
  b.vivo = true; b.aparece = 0; b.renace = -1;
}

/* ===================== lógica de la gris ===================== */

function decidir(m, reintento) {
  const g = m.gris;
  g.dadoTirado = false;
  g.comprometido = false;
  const quedan = m.azules.some(b => b.vivo);
  if (!quedan && CONFIG.RENACER_SEGUNDOS < 0) {
    g.estado = 'exterior';
    g.comprometido = true;          // ya no hay alternativa: no hay a qué renunciar
  } else if (Math.random() < CONFIG.PROB_AZUL_INICIAL) {
    g.estado = 'azules';
  } else {
    g.estado = 'exterior';
  }
  if (!reintento) g.fase = 0.75;    // el primer impulso llega pronto
  evento(m, reintento ? 'recalcula' : 'decide', { hacia: g.estado });
}

function objetivo(m) {
  const g = m.gris;
  if (g.estado === 'azules') {
    let mejor = null, md = Infinity;
    for (const b of m.azules) {
      if (!b.vivo || b.aparece < 0.5) continue;
      const d = Math.hypot(b.x - g.x, b.y - g.y);
      if (d < md) { md = d; mejor = b; }
    }
    return mejor;                   // puede ser null si todas están renaciendo
  }
  return m.lejana;
}

function darImpulso(m, obj) {
  const g = m.gris, C = CONFIG;
  g.digiere = false;
  if (obj.x === g.x && obj.y === g.y) return;
  const ang = Math.atan2(obj.y - g.y, obj.x - g.x) + ruido(m.t * 3, g.semilla + 3) * C.DISPERSION_IMPULSO;
  let mag = (g.estado === 'azules' ? C.IMPULSO_AZUL : C.IMPULSO) * m.u;
  if (g.estado === 'frenesi') mag *= 1 + C.IMPULSO_POR_TOQUE * g.toques;
  g.vx += Math.cos(ang) * mag;
  g.vy += Math.sin(ang) * mag;
  g.destello = 1;
}

function comer(m, b) {
  const g = m.gris, C = CONFIG;
  b.vivo = false;
  b.renace = C.RENACER_SEGUNDOS >= 0 ? m.t + C.RENACER_SEGUNDOS : -1;
  g.comidas++;
  // cada azul alarga el periodo de forma exponencial: hacia la 3ª imagen casi no vuelve a comer
  g.periodo = Math.min(C.PERIODO_MAX, C.PERIODO_BASE * Math.exp(C.CRECIMIENTO_PERIODO * g.comidas));
  g.fase = 0;                       // tiene que completar una oscilación entera antes del próximo impulso
  g.digiere = true;                 // y hasta ese impulso no puede comer otra (así no se come dos de un solo impulso)
  g.r = g.r0 * (1 + C.CRECIMIENTO_RADIO * Math.min(g.comidas, 12));
  g.vx *= 0.25; g.vy *= 0.25;
  g.destello = 1;
  g.luz = Math.max(C.LUZ_MIN, g.luz * C.LUZ_POR_AZUL);   // se apaga de inmediato un paso
  g.dip = 1;                                              // y parpadea
  m.efectos.push({ x: b.x, y: b.y, t: 0, dur: 0.7, rmax: 38 * m.u, c: [70, 130, 255] });
  evento(m, 'come', { comidas: g.comidas, periodo: +g.periodo.toFixed(2) });
  avanzarImagen(m, b.x, b.y);
  if (C.RENACER_SEGUNDOS < 0 && !m.azules.some(x => x.vivo)) {
    g.estado = 'exterior';
    g.comprometido = true;
    g.dadoTirado = true;
    evento(m, 'sin_azules');
  }
}

function tocarLejana(m) {
  const g = m.gris, C = CONFIG, L = m.lejana;
  g.toques++;
  const f = Math.max(C.FACTOR_PERIODO_MIN, C.FACTOR_PERIODO_INICIAL - C.FACTOR_PERIODO_PASO * (g.toques - 1));
  g.periodo = Math.max(C.PERIODO_MIN, g.periodo * f);
  if (g.estado !== 'frenesi') { g.estado = 'frenesi'; evento(m, 'frenesi'); }
  g.destello = 1;
  m.efectos.push({ x: L.x, y: L.y, t: 0, dur: 0.9, rmax: 60 * m.u, c: [255, 90, 220] });
  m.efectos.push({ x: L.x, y: L.y, t: 0.12, dur: 0.9, rmax: 42 * m.u, c: [90, 255, 200] });
  evento(m, 'toca', { toques: g.toques, periodo: +g.periodo.toFixed(3) });
  if (revelarExterior(m, L.x, L.y)) cerrarExterior(m, L);   // la imagen quedó completa
  else m.lejana = nuevaLejana(m, true);
}

// Se tocó la última: ya no aparece otra multicolor y empieza el final (ver actualizarFinal)
function cerrarExterior(m, L) {
  const g = m.gris;
  L.aparece = 0; L.fantasma = true;
  g.estado = 'final';
  g.fin = { fase: 'espera', t: 0 };
  g.vx *= 0.15; g.vy *= 0.15;       // frena casi en seco
  g.escala = 1;
  evento(m, 'imagen_ext_completa');
}

// El final: espera a que la imagen termine de aparecer, viaja al píxel elegido y es asimilada.
function actualizarFinal(m, h) {
  const g = m.gris, C = CONFIG, f = g.fin, capa = m.ext.capa;
  g.px = g.x; g.py = g.y;
  g.destello = Math.max(0, g.destello - h * 4);
  f.t += h;

  if (f.fase === 'espera') {
    // casi quieta, respirando, mientras la imagen termina de aparecer
    const k = Math.exp(-5 * h);
    g.vx = g.vx * k + ruido(m.t * 1.3, g.semilla + 7) * C.TEMBLOR * 0.3 * m.u * h;
    g.vy = g.vy * k + ruido(m.t * 1.3, g.semilla + 19) * C.TEMBLOR * 0.3 * m.u * h;
    g.x = clamp(g.x + g.vx * h, 20 * m.u, width - 20 * m.u);
    g.y = clamp(g.y + g.vy * h, 20 * m.u, height - 20 * m.u);
    if (!capa || m.t >= capa.finAnim + 0.4) {
      const idx = C.IMAGENES.length, o = IMGS[idx];
      const px = elegirPixel(idx);
      const r = rectImagen(o ? o.w : 663, o ? o.h : 1024);
      f.xt = r.x + px.nx * r.w; f.yt = r.y + px.ny * r.h;
      f.col = px.rgb.map(v => v * C.IMAGEN_OPACIDAD);   // el color tal como se ve en pantalla
      f.x0 = g.x; f.y0 = g.y; f.fase = 'viaje'; f.t = 0;
      evento(m, 'pixel_elegido', { x: Math.round(f.xt), y: Math.round(f.yt), rgb: px.rgb });
    }
  } else if (f.fase === 'viaje') {
    const p = clamp(f.t / C.ASIMILA_VIAJE, 0, 1), e = p * p * (3 - 2 * p);
    g.x = f.x0 + (f.xt - f.x0) * e;
    g.y = f.y0 + (f.yt - f.y0) * e;
    if (p >= 1) { f.fase = 'absorbe'; f.t = 0; evento(m, 'absorbe'); }
  } else if (f.fase === 'absorbe') {
    const p = clamp(f.t / C.ASIMILA_DURACION, 0, 1);
    g.mezcla = clamp(f.t / 0.5, 0, 1);       // pasa a dibujarse sobre la imagen, no sumada a ella
    f.colorMix = suave(0, 0.55, p);          // va tomando el color del píxel
    g.escala = 1 - suave(0.15, 1, p);        // y se vuelve pequeña
    m.fadeResto = suave(0.3, 0.95, p);       // y las demás partículas se desvanecen
    if (p >= 1) { f.fase = 'fin'; evento(m, 'fin'); }
  }
}

function actualizarGris(m, h) {
  const g = m.gris, C = CONFIG, u = m.u;

  // luz: cada azul comida la apaga un poco (cambia suave, no de golpe)
  const luzObj = Math.max(C.LUZ_MIN, Math.pow(C.LUZ_POR_AZUL, g.comidas));
  g.luz += (luzObj - g.luz) * (1 - Math.exp(-h * 1.5));
  g.dip = Math.max(0, g.dip - h / Math.max(0.05, C.LUZ_PARPADEO_SEG));

  if (g.estado === 'final') { actualizarFinal(m, h); return; }

  if (g.estado === 'espera') {
    g.x = m.cx + ruido(m.t * 0.5, g.semilla) * C.JITTER_ESPERA * u;
    g.y = m.cy + ruido(m.t * 0.5, g.semilla + 50) * C.JITTER_ESPERA * u;
    m.espera -= h;
    if (m.espera <= 0) { g.vx = 0; g.vy = 0; decidir(m, false); }
    return;
  }

  g.px = g.x; g.py = g.y;
  const obj = objetivo(m) || { x: g.x, y: g.y };

  // oscilación interna: al cerrar cada ciclo, impulso
  g.fase += h / g.periodo;
  if (g.fase >= 1) { g.fase -= 1; darImpulso(m, obj); }
  g.destello = Math.max(0, g.destello - h * 4);

  // guiado suave hacia el objetivo + temblor propio
  let dx = obj.x - g.x, dy = obj.y - g.y;
  const dist = Math.hypot(dx, dy) || 1; dx /= dist; dy /= dist;
  let guiado = g.estado === 'azules' ? C.GUIADO_AZUL * Math.pow(Math.min(1, C.PERIODO_BASE / g.periodo), 2)
    : g.estado === 'exterior' ? C.GUIADO_EXTERIOR
    : C.GUIADO_FRENESI + g.toques * C.GUIADO_FRENESI_POR_TOQUE;
  guiado *= u;
  let ax = dx * guiado + ruido(m.t * 1.3, g.semilla + 7) * C.TEMBLOR * u;
  let ay = dy * guiado + ruido(m.t * 1.3, g.semilla + 19) * C.TEMBLOR * u;
  let gamma = C.ROZAMIENTO;

  // el círculo rojo: frena y empuja en contra (salvo en frenesí, ya enfocada)
  if (g.estado !== 'frenesi') {
    const rx = g.x - m.cx, ry = g.y - m.cy;
    const dc = Math.hypot(rx, ry) || 1;
    const delta = dc - C.RADIO_CIRCULO * u;
    const banda = C.BANDA_ROJA * u;
    if (Math.abs(delta) < banda) {
      const res = 1 - Math.abs(delta) / banda;       // 1 en la línea del círculo, 0 en los bordes
      gamma += C.ROZAMIENTO_ANILLO * res;
      ax -= (rx / dc) * C.VIENTO_ANILLO * u * res;
      ay -= (ry / dc) * C.VIENTO_ANILLO * u * res;

      // al llegar al círculo yendo hacia la exterior: ¿se rinde?
      if (g.estado === 'exterior' && !g.dadoTirado && !g.comprometido) {
        g.dadoTirado = true;
        if (Math.random() < C.PROB_RENDIRSE) {
          evento(m, 'se_rinde');
          m.efectos.push({ x: g.x, y: g.y, t: 0, dur: 0.8, rmax: 30 * u, c: [200, 200, 210] });
          decidir(m, true);
          return;
        }
        g.comprometido = true;
        evento(m, 'persiste');
      }
    }
  }

  // las azules estorban a quien va hacia la exterior
  g.obstruido = false;
  if (g.estado === 'exterior') {
    for (const b of m.azules) {
      if (!b.vivo) continue;
      const ex = g.x - b.x, ey = g.y - b.y;
      const d = Math.hypot(ex, ey) || 0.001;
      const nx = ex / d, ny = ey / d;
      const contacto = g.r + b.r + 3 * u;
      const alcance = contacto + 14 * u;
      if (d < alcance) {
        const k = 1 - d / alcance;
        ax += nx * 260 * u * k; ay += ny * 260 * u * k;
        b.vx -= nx * 600 * u * k * h; b.vy -= ny * 600 * u * k * h;
        g.obstruido = true;
      }
      if (d < contacto) {
        const so = contacto - d;
        g.x += nx * so * 0.4; g.y += ny * so * 0.4;
        b.x -= nx * so * 0.6; b.y -= ny * so * 0.6;
        const vn = g.vx * nx + g.vy * ny;
        if (vn < 0) { g.vx -= vn * nx * 0.7; g.vy -= vn * ny * 0.7; }
      }
    }
    if (g.obstruido) gamma += C.ROZAMIENTO_OBSTACULO;
  }

  // integración
  g.vx += ax * h; g.vy += ay * h;
  const f = Math.exp(-gamma * h);
  g.vx *= f; g.vy *= f;
  const vmax = (g.estado === 'azules' ? C.VEL_MAX_AZUL
    : g.estado === 'exterior' ? C.VEL_MAX_EXTERIOR
    : C.VEL_MAX_FRENESI_INICIAL + (C.VEL_MAX_FRENESI_FINAL - C.VEL_MAX_FRENESI_INICIAL) * Math.min(1, g.toques / 10)) * u;
  const v = Math.hypot(g.vx, g.vy);
  if (v > vmax) { g.vx *= vmax / v; g.vy *= vmax / v; }
  g.x += g.vx * h; g.y += g.vy * h;

  // bordes de pantalla (rebote suave)
  const mg = 20 * u;
  if (g.x < mg) { g.x = mg; g.vx = Math.abs(g.vx) * 0.3; }
  if (g.x > width - mg) { g.x = width - mg; g.vx = -Math.abs(g.vx) * 0.3; }
  if (g.y < mg) { g.y = mg; g.vy = Math.abs(g.vy) * 0.3; }
  if (g.y > height - mg) { g.y = height - mg; g.vy = -Math.abs(g.vy) * 0.3; }

  // contacto con el objetivo
  if (g.estado === 'azules') {
    for (const b of m.azules) {
      if (!g.digiere && b.vivo && b.aparece > 0.5 && distSeg(b.x, b.y, g.px, g.py, g.x, g.y) < g.r + b.r) comer(m, b);
      if (g.estado !== 'azules') break;
    }
  } else if (m.lejana.aparece > 0.3) {
    const L = m.lejana;
    if (distSeg(L.x, L.y, g.px, g.py, g.x, g.y) < g.r + L.r + 4 * u) tocarLejana(m);
  }
}

/* ===================== resto de actores ===================== */

function actualizarRojas(m, h) {
  const g = m.gris, C = CONFIG, u = m.u;
  const R = C.RADIO_CIRCULO * u;
  const infl = 55 * u;
  for (const p of m.rojas) {
    const ang = p.a + m.t * C.ROTACION_CIRCULO;
    const rad = R + Math.sin(m.t * 0.7 + p.semilla) * 3 * u;
    p.hx = m.cx + Math.cos(ang) * rad;
    p.hy = m.cy + Math.sin(ang) * rad;
    let ax = (p.hx - p.x) * 45 - p.vx * 8;
    let ay = (p.hy - p.y) * 45 - p.vy * 8;
    const dx = p.x - g.x, dy = p.y - g.y;
    const d = Math.hypot(dx, dy) || 0.01;
    if (d < infl) {                       // se aparta al paso de la gris
      const k = (1 - d / infl);
      ax += (dx / d) * 1600 * u * k * k;
      ay += (dy / d) * 1600 * u * k * k;
    }
    p.vx += ax * h; p.vy += ay * h;
    p.x += p.vx * h; p.y += p.vy * h;
  }
}

function actualizarAzules(m, h) {
  const u = m.u;
  for (const b of m.azules) {
    if (!b.vivo) {
      if (b.renace >= 0 && m.t >= b.renace) renacerAzul(m, b);
      continue;
    }
    b.aparece = Math.min(1, b.aparece + h * 1.2);
    const tx = b.hx + ruido(m.t * 0.4, b.semilla) * 6 * u;
    const ty = b.hy + ruido(m.t * 0.4, b.semilla + 30) * 6 * u;
    b.vx += ((tx - b.x) * 8 - b.vx * 3.2) * h;
    b.vy += ((ty - b.y) * 8 - b.vy * 3.2) * h;
    b.x += b.vx * h; b.y += b.vy * h;
  }
}

function actualizarLejana(m, h) {
  const L = m.lejana, C = CONFIG, u = m.u;
  if (L.fantasma) return;           // la última ya fue tocada: no vuelve
  L.aparece = Math.min(1, L.aparece + h * 0.8);
  L.ang += ruido(m.t * 0.15, L.semilla) * 0.6 * h;
  L.x += Math.cos(L.ang) * C.VEL_LEJANA * u * h;
  L.y += Math.sin(L.ang) * C.VEL_LEJANA * u * h;
  // se queda fuera del círculo rojo y dentro de la pantalla
  const dx = L.x - m.cx, dy = L.y - m.cy;
  const d = Math.hypot(dx, dy) || 1;
  const minC = C.RADIO_CIRCULO * u * 1.45;
  if (d < minC) { L.x += (dx / d) * 40 * u * h; L.y += (dy / d) * 40 * u * h; L.ang = Math.atan2(dy, dx); }
  const mg = 45 * u;
  if (L.x < mg) { L.x += 40 * u * h; L.ang = 0; }
  if (L.x > width - mg) { L.x -= 40 * u * h; L.ang = Math.PI; }
  if (L.y < mg) { L.y += 40 * u * h; L.ang = Math.PI / 2; }
  if (L.y > height - mg) { L.y -= 40 * u * h; L.ang = -Math.PI / 2; }
}

function actualizarMundo(m, dt) {
  dt = Math.min(dt, 0.05);
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    m.t += h;
    actualizarGris(m, h);
    actualizarRojas(m, h);
    actualizarAzules(m, h);
    actualizarLejana(m, h);
  }
  for (const e of m.efectos) e.t += dt;
  m.efectos = m.efectos.filter(e => e.t < e.dur);
  // las imágenes borradas por completo se retiran
  m.arte.capas = m.arte.capas.filter(c => !(c.borrando && m.t - c.tBorra > CONFIG.IMAGEN_BORRADO + 2));
}

/* ===================== dibujo ===================== */

let SPR = {};
let M;            // el mundo
let CP, CPctx;    // capa de partículas (aparte, para que las estelas no se mezclen con la imagen)

function crearSprite(r, g, b) {
  const s = document.createElement('canvas');
  s.width = s.height = 128;
  return pintarSprite(s, r, g, b);
}

// (re)pinta un sprite de 128x128 con un brillo del color dado
function pintarSprite(s, r, g, b) {
  const c = s.getContext('2d');
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, 128, 128);
  const grad = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.22, `rgba(${r},${g},${b},0.7)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.16)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  c.fillStyle = grad;
  c.fillRect(0, 0, 128, 128);
  return s;
}

// círculo blanco de borde suave: con él se "pinta" la máscara que revela la imagen
function crearSpriteSuave() {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const c = s.getContext('2d');
  const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 64, 64);
  return s;
}

function brillo(ctx, spr, x, y, radio, alpha) {
  const s = radio * 4.4;            // el sprite tiene un halo de ~4x el radio del núcleo
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.drawImage(spr, x - s, y - s, s * 2, s * 2);
}

function crearCapaParticulas() {
  const pd = pixelDensity();
  CP = document.createElement('canvas');
  CP.width = Math.round(width * pd);
  CP.height = Math.round(height * pd);
  CPctx = CP.getContext('2d');
  CPctx.scale(pd, pd);
  limpiarCapaParticulas();
}

function limpiarCapaParticulas() {
  CPctx.globalCompositeOperation = 'source-over';
  CPctx.globalAlpha = 1;
  CPctx.fillStyle = '#000';
  CPctx.fillRect(0, 0, width, height);
}

function dibujarParticulas(m) {
  const ctx = CPctx, C = CONFIG, u = m.u, t = m.t;

  // estela: se oscurece lo anterior en vez de borrar
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(0,0,0,${C.ESTELA})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  const vis = 1 - m.fadeResto;      // al final, las demás partículas se desvanecen

  // círculo rojo
  if (vis > 0.002) for (const p of m.rojas) {
    const exc = Math.hypot(p.x - p.hx, p.y - p.hy) / (18 * u);
    brillo(ctx, SPR.roja, p.x, p.y, C.RADIO_ROJA * u * (1 + Math.min(exc, 1) * 0.5), (0.5 + Math.min(0.5, exc)) * vis);
  }

  // azules
  for (const b of m.azules) {
    if (!b.vivo) continue;
    const pulso = 1 + 0.12 * Math.sin(t * 2 + b.semilla);
    brillo(ctx, SPR.azul, b.x, b.y, b.r * pulso, 0.9 * b.aparece * vis);
  }

  // multicolor lejana: tres canales (R, G, B) que se mezclan y giran => cambia de color
  const L = m.lejana;
  for (let k = 0; k < 3; k++) {
    const a = t * 0.7 + k * (Math.PI * 2 / 3);
    const ox = Math.cos(a) * L.r * 0.5, oy = Math.sin(a) * L.r * 0.5;
    const intensidad = 0.5 + 0.5 * Math.sin(t * 0.6 + k * 2.094);
    brillo(ctx, SPR.canal[k], L.x + ox, L.y + oy, L.r * (0.8 + 0.2 * intensidad), C.BRILLO_LEJANA * (0.35 + 0.65 * intensidad) * L.aparece * vis);
  }

  // gris: carga (crece despacio) y suelta (impulso)
  const g = m.gris;
  let rr = g.r, halo = 0.12;
  if (g.estado === 'espera' || g.estado === 'final') {
    rr = g.r * (1 + 0.04 * Math.sin(t * 1.5));
  } else {
    const amp = C.AMPLITUD_OSC * clamp(g.periodo / 0.5, 0.25, 1);
    const carga = g.fase * g.fase * g.fase;
    rr = g.r * (1 + amp * carga) * (1 - 0.25 * g.destello);
    halo = 0.12 + 0.35 * carga;
  }
  rr *= g.escala;
  // luz: se apaga con cada azul comida. mezcla: al final pasa a dibujarse sobre la imagen (ver dibujarGrisSobreImagen)
  const am = (1 - g.mezcla) * g.luz * (1 - C.LUZ_PARPADEO * g.dip * g.dip);
  if (am > 0.002 && rr > 0.05) {
    brillo(ctx, SPR.gris, g.x, g.y, rr * 2.4, halo * am);
    brillo(ctx, SPR.gris, g.x, g.y, rr, (0.85 + 0.15 * g.destello) * am);
  }

  // destellos de eventos (comer, tocar, rendirse)
  ctx.lineWidth = 1.5;
  for (const e of m.efectos) {
    if (e.t < 0) continue;
    const p = e.t / e.dur;
    const radio = e.rmax * (1 - Math.pow(1 - p, 3));
    ctx.globalAlpha = (1 - p) * 0.8 * vis;
    ctx.strokeStyle = `rgb(${e.c[0]},${e.c[1]},${e.c[2]})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, radio, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// Pinta la máscara (un círculo suave por cada trocito ya aparecido) y recorta la imagen con ella
function redibujarCapa(capa, t) {
  const C = CONFIG, o = IMGS[capa.idx];
  if (!capa.cv) {
    const s = Math.min(1, 1280 / Math.max(o.w, o.h));
    capa.w = Math.round(o.w * s); capa.h = Math.round(o.h * s);
    capa.cv = document.createElement('canvas'); capa.cv.width = capa.w; capa.cv.height = capa.h;
    capa.mk = document.createElement('canvas'); capa.mk.width = capa.w; capa.mk.height = capa.h;
  }
  const mk = capa.mk.getContext('2d');
  mk.globalCompositeOperation = 'source-over';
  mk.clearRect(0, 0, capa.w, capa.h);
  const R = Math.max(capa.w / C.IMAGEN_COLS, capa.h / C.IMAGEN_FILAS) * 1.25;
  for (let i = 0; i < capa.N; i++) {
    const a = alfaCelda(capa, i, t);
    if (a < 0.004) continue;
    const r = R * capa.rf[i];
    mk.globalAlpha = a;
    mk.drawImage(SPR.suave, capa.cxn[i] * capa.w - r, capa.cyn[i] * capa.h - r, r * 2, r * 2);
  }
  mk.globalAlpha = 1;
  const c = capa.cv.getContext('2d');
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, capa.w, capa.h);
  c.drawImage(o.img, 0, 0, capa.w, capa.h);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(capa.mk, 0, 0);
  c.globalCompositeOperation = 'source-over';
}

// Fondo: los colores de las imágenes visibles, a tamaño 'cover', muy reducidos y suavizados.
// Solo se pinta detrás de la imagen; las partículas y la imagen no se tocan.
let FB = null, FBm = null;
function dibujarFondo(m, ctx) {
  const C = CONFIG;
  if (C.FONDO_OPACIDAD <= 0) return;
  const bw = 40, bh = Math.max(8, Math.round(bw * height / width));
  if (!FB || FB.height !== bh) {
    FB = document.createElement('canvas'); FB.width = bw; FB.height = bh;
    FBm = document.createElement('canvas'); FBm.width = bw * 4; FBm.height = bh * 4;
  }
  const f = FB.getContext('2d');
  f.globalAlpha = 1;
  f.clearRect(0, 0, bw, bh);
  let hay = false;
  for (const capa of m.arte.capas) {
    const o = IMGS[capa.idx];
    if (!o || !o.ok || !capa.cv) continue;
    const s = Math.max(bw / capa.w, bh / capa.h);
    const w = capa.w * s, h = capa.h * s;
    f.imageSmoothingQuality = 'high';
    f.drawImage(capa.cv, (bw - w) / 2, (bh - h) / 2, w, h);
    hay = true;
  }
  if (!hay) return;
  const mm = FBm.getContext('2d');
  mm.clearRect(0, 0, FBm.width, FBm.height);
  mm.imageSmoothingEnabled = true; mm.imageSmoothingQuality = 'high';
  if ('filter' in mm) mm.filter = `blur(${C.FONDO_BLUR}px)`;
  mm.drawImage(FB, 0, 0, FBm.width, FBm.height);
  if ('filter' in mm) mm.filter = 'none';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = C.FONDO_OPACIDAD;
  ctx.drawImage(FBm, 0, 0, width, height);
  ctx.globalAlpha = 1;
}

function dibujarImagenes(m, ctx) {
  for (const capa of m.arte.capas) {
    const o = IMGS[capa.idx];
    if (!o || !o.ok) continue;
    const animando = m.t < capa.finAnim + 0.1;
    if (capa.sucia || animando || capa.borrando) {
      redibujarCapa(capa, m.t);
      if (!animando && !capa.borrando) capa.sucia = false;
    }
  }
  dibujarFondo(m, ctx);
  for (const capa of m.arte.capas) {
    const o = IMGS[capa.idx];
    if (!o || !o.ok) continue;
    const r = rectImagen(capa.w, capa.h);
    ctx.globalAlpha = CONFIG.IMAGEN_OPACIDAD;
    ctx.drawImage(capa.cv, r.x, r.y, r.w, r.h);
  }
  ctx.globalAlpha = 1;
}

// En la asimilación la gris se dibuja con mezcla normal (no sumada) para que, al tomar el color del
// píxel y encogerse, se funda con la imagen en vez de brillar encima.
function dibujarGrisSobreImagen(m, ctx) {
  const g = m.gris;
  if (g.estado !== 'final' || g.mezcla <= 0) return;
  const f = g.fin, base = [215, 215, 222], k = f.colorMix || 0;
  const rr = g.r * g.escala;
  if (rr < 0.05) return;
  const col = base.map((v, i) => Math.round(v + (f.col[i] - v) * k));
  pintarSprite(SPR.tmp, col[0], col[1], col[2]);
  ctx.globalCompositeOperation = 'source-over';
  brillo(ctx, SPR.tmp, g.x, g.y, rr * 2.4, 0.12 * g.luz * g.mezcla * (1 - C.LUZ_PARPADEO * g.dip * g.dip));
  brillo(ctx, SPR.tmp, g.x, g.y, rr, 0.85 * g.luz * g.mezcla * (1 - C.LUZ_PARPADEO * g.dip * g.dip));
  ctx.globalAlpha = 1;
}

function componer(m) {
  const ctx = drawingContext;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  dibujarImagenes(m, ctx);
  ctx.globalCompositeOperation = 'lighter';     // las partículas se suman encima de la imagen
  ctx.drawImage(CP, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  dibujarGrisSobreImagen(m, ctx);
  ctx.globalAlpha = 1;
}

/* ===================== p5 ===================== */

function setup() {
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  SPR.gris = crearSprite(215, 215, 222);
  SPR.azul = crearSprite(60, 120, 255);
  SPR.roja = crearSprite(255, 45, 60);
  SPR.canal = [crearSprite(255, 0, 0), crearSprite(0, 255, 0), crearSprite(0, 0, 255)];
  SPR.suave = crearSpriteSuave();
  SPR.tmp = document.createElement('canvas');    // sprite que se repinta cada cuadro con el color de la gris al ser asimilada
  SPR.tmp.width = SPR.tmp.height = 128;
  cargarImagenes();
  crearCapaParticulas();
  M = crearMundo();
  background(0);
}

function draw() {
  actualizarMundo(M, deltaTime / 1000);
  dibujarParticulas(M);
  componer(M);
}

function reiniciar() {
  M = crearMundo();
  limpiarCapaParticulas();
  background(0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  crearCapaParticulas();
  reiniciar();
}

function mousePressed() { reiniciar(); return false; }
function keyPressed() { if (key === 'r' || key === 'R') reiniciar(); }
