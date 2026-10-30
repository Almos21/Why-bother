/* =====================================================================
   OBRA DIGITAL INTERACTIVA (VERSIÓN AJUSTADA Y MEJORADA)
   ===================================================================== */

const CONFIG = {
  // ---------- DECISIÓN (lo más importante) ----------
  PROB_AZUL_INICIAL: 0.8,   
  PROB_RENDIRSE: 0.4,       
  ESPERA_INICIAL: 3,        

  // ---------- IMÁGENES ----------
  IMAGENES: ['img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg'],  
  IMAGEN_EXTERIOR: 'img/5.jpg', 
  COMIDAS_POR_IMAGEN: 3,    
  COMIDAS_EXTERIOR: 12,     
  IMAGEN_VARIACION: 0.04,   
  IMAGEN_PARCHES: 3,        
  IMAGEN_PROPAGACION: 5,    
  IMAGEN_FADE_CELDA: 2.5,   
  IMAGEN_BORRADO: 3,        
  IMAGEN_OPACIDAD: 0.9,     
  IMAGEN_AJUSTE: 'contain', 
  IMAGEN_COLS: 26,          
  IMAGEN_FILAS: 40,

  // ---------- ESCENA ----------
  N_AZULES: 12,
  RENACER_SEGUNDOS: 2.5,    
  N_ROJAS: 160,
  RADIO_CIRCULO: 190,       
  BANDA_ROJA: 42,           
  ZONA_AZUL_MIN: 45,        
  ZONA_AZUL_MAX: 140,
  RADIO_GRIS: 9,
  RADIO_AZUL: 5,
  RADIO_ROJA: 2.2,
  RADIO_LEJANA: 7,
  VEL_LEJANA: 8,            

  // ---------- OSCILACIÓN ----------
  PERIODO_BASE: 0.9,        
  CRECIMIENTO_PERIODO: 0.65,
  PERIODO_MAX: 7200,        
  PERIODO_MIN: 0.05,        
  IMPULSO_AZUL: 380,        
  IMPULSO: 520,             
  IMPULSO_POR_TOQUE: 0.12,  
  DISPERSION_IMPULSO: 0.12, 

  // ---------- CADA VEZ QUE TOCA UNA MULTICOLOR ----------
  FACTOR_PERIODO_INICIAL: 1.0, 
  FACTOR_PERIODO_PASO: 0.0,
  FACTOR_PERIODO_MIN: 1.0,

  // ---------- MOVIMIENTO ----------
  ROZAMIENTO: 1.6,
  GUIADO_AZUL: 140,         
  GUIADO_EXTERIOR: 150,
  GUIADO_FRENESI: 300,
  GUIADO_FRENESI_POR_TOQUE: 60,
  VEL_MAX_AZUL: 1100,
  VEL_MAX_EXTERIOR: 900,
  VEL_MAX_FRENESI_INICIAL: 900,
  VEL_MAX_FRENESI_FINAL: 2400,
  TEMBLOR: 25,              
  JITTER_ESPERA: 5,         

  // ---------- OBSTÁCULOS ----------
  ROZAMIENTO_ANILLO: 22,    
  VIENTO_ANILLO: 90,        
  ROZAMIENTO_OBSTACULO: 5,  

  // ---------- LOOK ----------
  ESTELA: 0.22,             
  AMPLITUD_OSC: 0.35,       
  CRECIMIENTO_RADIO: 0.02,  
  ROTACION_CIRCULO: 0.03,   
  BRILLO_LEJANA: 0.4,       

  LOG_CONSOLA: false        
};

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
  return 0.5 * Math.sin(t + s * 1.7) + 0.3 * Math.sin(t * 1.73 + s * 2.9 + 1.3) + 0.2 * Math.sin(t * 2.41 + s * 4.1 + 2.1);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function distSeg(px, py, ax, ay, bx, by) {
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

const IMGS = [];   
let imgExteriorObj = null;

function cargarImagenes() {
  CONFIG.IMAGENES.forEach((src, i) => {
    const o = { img: new Image(), ok: false, w: 663, h: 1024 };
    o.img.onload = () => { o.ok = true; o.w = o.img.naturalWidth; o.h = o.img.naturalHeight; };
    o.img.onerror = () => { if (typeof console !== 'undefined') console.warn('[obra] no se pudo cargar', src); };
    o.img.src = src;
    IMGS[i] = o;
  });

  imgExteriorObj = { img: new Image(), ok: false, w: 663, h: 1024 };
  imgExteriorObj.img.onload = () => { imgExteriorObj.ok = true; imgExteriorObj.w = imgExteriorObj.img.naturalWidth; imgExteriorObj.h = imgExteriorObj.img.naturalHeight; };
  imgExteriorObj.img.onerror = () => { if (typeof console !== 'undefined') console.warn('[obra] no se pudo cargar', CONFIG.IMAGEN_EXTERIOR); };
  imgExteriorObj.img.src = CONFIG.IMAGEN_EXTERIOR;
}

function rectImagen(iw, ih) {
  const cover = CONFIG.IMAGEN_AJUSTE === 'cover';
  const s = cover ? Math.max(width / iw, height / ih) : Math.min(width / iw, height / ih);
  const w = iw * s, h = ih * s;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function nuevaCapa(m, idx, esExterior = false) {
  const C = CONFIG, N = C.IMAGEN_COLS * C.IMAGEN_FILAS;
  const capa = {
    idx, N, esExterior,
    ini: new Float32Array(N).fill(Infinity),
    cxn: new Float32Array(N), cyn: new Float32Array(N), rf: new Float32Array(N),
    bdel: null,
    asignadas: 0, borrando: false, tBorra: 0, finAnim: 0, sucia: true,
    cv: null, mk: null, w: 0, h: 0,
    completadaAsimilacion: false,
    metaAsimilacion: null
  };
  for (let i = 0; i < N; i++) {
    const col = i % C.IMAGEN_COLS, fila = Math.floor(i / C.IMAGEN_COLS);
    capa.cxn[i] = (col + 0.5 + (Math.random() - 0.5) * 0.5) / C.IMAGEN_COLS;
    capa.cyn[i] = (fila + 0.5 + (Math.random() - 0.5) * 0.5) / C.IMAGEN_FILAS;
    capa.rf[i] = 0.9 + Math.random() * 0.4;
  }
  return capa;
}

function aNormalizada(idx, x, y, esExterior = false) {
  const o = esExterior ? imgExteriorObj : (IMGS[idx] || { w: 663, h: 1024 });
  const r = rectImagen(o.w, o.h);
  return { x: clamp((x - r.x) / r.w, 0, 1), y: clamp((y - r.y) / r.h, 0, 1) };
}

function avanzarImagen(m, bx, by) {
  const C = CONFIG, A = m.arte;
  if (!C.IMAGENES.length) return;
  const K = Math.max(1, Math.round(C.COMIDAS_POR_IMAGEN));
  let capa = A.capas.length ? A.capas[A.capas.length - 1] : null;

  if (!capa || capa.borrando || capa.esExterior || A.comidas >= K) {
    const nueva = (A.indice + 1) % C.IMAGENES.length;
    if (capa && !capa.borrando) iniciarBorrado(m, capa, aNormalizada(capa.idx, bx, by, capa.esExterior));
    A.indice = nueva;
    A.comidas = 0;
    capa = nuevaCapa(m, A.indice, false);
    A.capas.push(capa);
    evento(m, 'imagen_nueva', { imagen: A.indice + 1 });
  }

  A.comidas++;
  let frac = A.comidas >= K ? 1 : A.comidas / K + (Math.random() - 0.5) * 2 * C.IMAGEN_VARIACION;
  frac = clamp(frac, 0, 1);
  const n = Math.max(1, Math.round(frac * capa.N) - capa.asignadas);
  const s = aNormalizada(A.indice, bx, by, false);
  revelarCeldas(m, capa, n, s.x * C.IMAGEN_COLS, s.y * C.IMAGEN_FILAS);
  evento(m, 'revela', { imagen: A.indice + 1, parte: A.comidas + '/' + K, cobertura: +(capa.asignadas / capa.N).toFixed(2) });
}

function avanzarImagenExterior(m, bx, by) {
  const C = CONFIG, A = m.arte;
  if (!imgExteriorObj) return;
  const K = Math.max(1, Math.round(C.COMIDAS_EXTERIOR));
  let capa = A.capas.length ? A.capas[A.capas.length - 1] : null;

  if (!capa || capa.borrando || !capa.esExterior || A.toquesExterior >= K) {
    if (capa && !capa.borrando) iniciarBorrado(m, capa, aNormalizada(0, bx, by, true));
    A.toquesExterior = 0;
    capa = nuevaCapa(m, 0, true);
    A.capas.push(capa);
    evento(m, 'imagen_exterior_nueva');
  }

  A.toquesExterior++;
  let frac = A.toquesExterior >= K ? 1 : A.toquesExterior / K;
  const n = Math.max(1, Math.round(frac * capa.N) - capa.asignadas);
  const s = aNormalizada(0, bx, by, true);
  revelarCeldas(m, capa, n, s.x * C.IMAGEN_COLS, s.y * C.IMAGEN_FILAS);
  evento(m, 'revela_exterior', { parte: A.toquesExterior + '/' + K, cobertura: +(capa.asignadas / capa.N).toFixed(2) });
}

function revelarCeldas(m, capa, n, sx, sy) {
  const C = CONFIG, COLS = C.IMAGEN_COLS;
  const libres = [];
  for (let i = 0; i < capa.N; i++) if (capa.ini[i] === Infinity) libres.push(i);
  if (!libres.length) return;
  n = Math.min(n, libres.length);

  const semillas = [{ x: sx, y: sy }];
  for (let k = 1; k < Math.max(1, C.IMAGEN_PARCHES); k++) {
    const i = libres[Math.floor(Math.random() * libres.length)];
    semillas.push({ x: (i % COLS) + 0.5, y: Math.floor(i / COLS) + 0.5 });
  }
  const pts = libres.map(i => {
    const x = (i % COLS) + 0.5, y = Math.floor(i / COLS) + 0.5;
    let d = Infinity;
    for (const s of semillas) d = Math.min(d, Math.hypot(x - s.x, y - s.y));
    return { i, d, score: d * (0.75 + 0.5 * Math.random()) + Math.random() * 1.5 };
  });
  pts.sort((a, b) => a.score - b.score);
  const elegidas = pts.slice(0, n);
  const dmax = Math.max(1e-6, ...elegidas.map(e => e.d));
  for (const e of elegidas) {
    capa.ini[e.i] = m.t + (e.d / dmax) * C.IMAGEN_PROPAGACION + Math.random() * 0.5;
    capa.finAnim = Math.max(capa.finAnim, capa.ini[e.i] + C.IMAGEN_FADE_CELDA);
  }
  capa.asignadas += n;
  capa.sucia = true;
}

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
}

function alfaCelda(capa, i, t) {
  const ini = capa.ini[i];
  if (ini === Infinity || t <= ini) return 0;
  const x = Math.min(1, (t - ini) / CONFIG.IMAGEN_FADE_CELDA);
  let a = x * x * (3 - 2 * x);
  if (capa.borrando) {
    const y = clamp((t - capa.tBorra - capa.bdel[i]) / 1.8, 0, 1);
    a *= 1 - y * y * (3 - 2 * y);
  }
  return a;
}

/* ===================== mundo ===================== */

function crearMundo() {
  const u = Math.min(width, height) / 800;
  const cx = width / 2, cy = height / 2;
  const C = CONFIG;
  const m = {
    u, cx, cy, t: 0, espera: C.ESPERA_INICIAL,
    azules: [], rojas: [], efectos: [], eventos: [], lejana: null, gris: null,
    arte: { indice: -1, comidas: 0, toquesExterior: 0, capas: [] },
    terminado: false
  };

  m.gris = {
    x: cx, y: cy, vx: 0, vy: 0, px: cx, py: cy,
    r0: C.RADIO_GRIS * u, r: C.RADIO_GRIS * u,
    estado: 'espera',
    fase: 0, periodo: C.PERIODO_BASE,
    comidas: 0, toques: 0,
    comprometido: false, dadoTirado: false, digiere: false,
    destello: 0, obstruido: false,
    semilla: Math.random() * 100,
    asimilando: false,
    progresoAsimilacion: 0,
    colorAsimilado: [215, 215, 222]
  };

  let intentos = 0;
  while (m.azules.length < C.N_AZULES && intentos++ < 3000) {
    const ang = Math.random() * Math.PI * 2;
    const rad = (C.ZONA_AZUL_MIN + Math.sqrt(Math.random()) * (C.ZONA_AZUL_MAX - C.ZONA_AZUL_MIN)) * u;
    const hx = cx + Math.cos(ang) * rad, hy = cy + Math.sin(ang) * rad;
    if (m.azules.some(b => Math.hypot(b.hx - hx, b.hy - hy) < 26 * u)) continue;
    m.azules.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, r: C.RADIO_AZUL * u, vivo: true, aparece: 1, renace: -1, semilla: Math.random() * 100 });
  }

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
  const minC = R * 1.45;
  const libre = R + C.BANDA_ROJA * u + 25 * u;
  const lado = Math.min(width, height);
  let mejor = null, mejorD = -1;

  for (let i = 0; i < 150; i++) {
    const x = margen + Math.random() * (width - 2 * margen);
    const y = margen + Math.random() * (height - 2 * margen);
    const dc = Math.hypot(x - m.cx, y - m.cy);
    if (dc < minC) continue;
    if (desdeGris) {
      if (Math.hypot(x - g.x, y - g.y) < lado * 0.3) continue;
      if (distSeg(m.cx, m.cy, g.x, g.y, x, y) < libre) continue;
      mejor = { x, y };
      break;
    } else if (dc > mejorD) {
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
    if (Math.hypot(hx - g.x, hy - g.y) < 45 * u) continue;
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
    g.comprometido = true;
  } else if (Math.random() < CONFIG.PROB_AZUL_INICIAL) {
    g.estado = 'azules';
  } else {
    g.estado = 'exterior';
  }
  if (!reintento) g.fase = 0.75;
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
    return mejor;
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
  g.periodo = Math.min(C.PERIODO_MAX, C.PERIODO_BASE * Math.exp(C.CRECIMIENTO_PERIODO * g.comidas));
  g.fase = 0;
  g.digiere = true;
  g.r = g.r0 * (1 + C.CRECIMIENTO_RADIO * Math.min(g.comidas, 12));
  g.vx *= 0.25; g.vy *= 0.25;
  g.destello = 1;
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
  if (g.estado !== 'frenesi') { g.estado = 'frenesi'; evento(m, 'frenesi'); }
  g.destello = 1;
  m.efectos.push({ x: L.x, y: L.y, t: 0, dur: 0.9, rmax: 60 * m.u, c: [255, 90, 220] });
  m.efectos.push({ x: L.x, y: L.y, t: 0.12, dur: 0.9, rmax: 42 * m.u, c: [90, 255, 200] });
  evento(m, 'toca', { toques: g.toques });
  
  avanzarImagenExterior(m, L.x, L.y);

  m.lejana = nuevaLejana(m, true);
}

// Analizar la 5ta imagen al completarse
function iniciarAsimilacion(m, capa) {
  const g = m.gris;
  const o = imgExteriorObj;
  if (!o || !o.ok) return;

  const tempCv = document.createElement('canvas');
  tempCv.width = o.w; tempCv.height = o.h;
  const tctx = tempCv.getContext('2d');
  tctx.drawImage(o.img, 0, 0);
  const imgData = tctx.getImageData(0, 0, o.w, o.h);
  const data = imgData.data;

  let mejorX = o.w / 2, mejorY = o.h / 2, mejorScore = -1;
  const cx = o.w / 2, cy = o.h / 2;

  for (let i = 0; i < 500; i++) {
    // Preferir fuertemente la zona del centro
    const rx = Math.floor(cx + (Math.random() - 0.5) * (o.w * 0.4));
    const ry = Math.floor(cy + (Math.random() - 0.5) * (o.h * 0.4));
    if (rx < 0 || rx >= o.w || ry < 0 || ry >= o.h) continue;

    const idx = (ry * o.w + rx) * 4;
    const r = data[idx], gCol = data[idx+1], b = data[idx+2];

    const brilloPix = (r + gCol + b) / 3;
    const saturacionExtrema = Math.abs(r - gCol) + Math.abs(gCol - b) + Math.abs(b - r);
    const distanciaCentro = Math.hypot(rx - cx, ry - cy);

    // Evitar blanco y negro puros
    if (brilloPix > 25 && brilloPix < 230) {
      const score = saturacionExtrema * 3 - (distanciaCentro / (o.w * 0.5)) * 80;
      if (score > mejorScore) {
        mejorScore = score;
        mejorX = rx;
        mejorY = ry;
        g.colorAsimilado = [r, gCol, b];
      }
    }
  }

  const rImg = rectImagen(o.w, o.h);
  const pantallaX = rImg.x + (mejorX / o.w) * rImg.w;
  const pantallaY = rImg.y + (mejorY / o.h) * rImg.h;

  g.asimilando = true;
  g.progresoAsimilacion = 0;
  capa.metaAsimilacion = { x: pantallaX, y: pantallaY };
  evento(m, 'asimilacion_iniciada');
}

function actualizarGris(m, h) {
  const g = m.gris, C = CONFIG, u = m.u;

  if (g.estado === 'espera') {
    g.x = m.cx + ruido(m.t * 0.5, g.semilla) * C.JITTER_ESPERA * u;
    g.y = m.cy + ruido(m.t * 0.5, g.semilla + 50) * C.JITTER_ESPERA * u;
    m.espera -= h;
    if (m.espera <= 0) { g.vx = 0; g.vy = 0; decidir(m, false); }
    return;
  }

  // Comportamiento exacto al asimilar la 5ta imagen: se detiene por completo y se encoge
  if (g.asimilando) {
    const capaActual = m.arte.capas[m.arte.capas.length - 1];
    if (capaActual && capaActual.metaAsimilacion) {
      const meta = capaActual.metaAsimilacion;
      g.x += (meta.x - g.x) * h * 4.0;
      g.y += (meta.y - g.y) * h * 4.0;
      g.vx = 0; g.vy = 0;
      g.progresoAsimilacion += h * 0.5;
      g.r = Math.max(0.5, g.r0 * (1 - g.progresoAsimilacion));
      if (g.progresoAsimilacion >= 1) {
        m.terminado = true; // Detiene la simulación y oculta los demás elementos
      }
    }
    return;
  }

  g.px = g.x; g.py = g.y;
  const obj = objetivo(m) || { x: g.x, y: g.y };

  g.fase += h / g.periodo;
  if (g.fase >= 1) { g.fase -= 1; darImpulso(m, obj); }
  g.destello = Math.max(0, g.destello - h * 4);

  let dx = obj.x - g.x, dy = obj.y - g.y;
  const dist = Math.hypot(dx, dy) || 1; dx /= dist; dy /= dist;
  let guiado = g.estado === 'azules' ? C.GUIADO_AZUL * Math.pow(Math.min(1, C.PERIODO_BASE / g.periodo), 2)
    : g.estado === 'exterior' ? C.GUIADO_EXTERIOR
    : C.GUIADO_FRENESI + g.toques * C.GUIADO_FRENESI_POR_TOQUE;
  guiado *= u;
  let ax = dx * guiado + ruido(m.t * 1.3, g.semilla + 7) * C.TEMBLOR * u;
  let ay = dy * guiado + ruido(m.t * 1.3, g.semilla + 19) * C.TEMBLOR * u;
  let gamma = C.ROZAMIENTO;

  if (g.estado !== 'frenesi') {
    const rx = g.x - m.cx, ry = g.y - m.cy;
    const dc = Math.hypot(rx, ry) || 1;
    const delta = dc - C.RADIO_CIRCULO * u;
    const banda = C.BANDA_ROJA * u;
    if (Math.abs(delta) < banda) {
      const res = 1 - Math.abs(delta) / banda;
      gamma += C.ROZAMIENTO_ANILLO * res;
      ax -= (rx / dc) * C.VIENTO_ANILLO * u * res;
      ay -= (ry / dc) * C.VIENTO_ANILLO * u * res;

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

  g.vx += ax * h; g.vy += ay * h;
  const f = Math.exp(-gamma * h);
  g.vx *= f; g.vy *= f;
  const vmax = (g.estado === 'azules' ? C.VEL_MAX_AZUL
    : g.estado === 'exterior' ? C.VEL_MAX_EXTERIOR
    : C.VEL_MAX_FRENESI_INICIAL + (C.VEL_MAX_FRENESI_FINAL - C.VEL_MAX_FRENESI_INICIAL) * Math.min(1, g.toques / 10)) * u;
  const v = Math.hypot(g.vx, g.vy);
  if (v > vmax) { g.vx *= vmax / v; g.vy *= vmax / v; }
  g.x += g.vx * h; g.y += g.vy * h;

  const mg = 20 * u;
  if (g.x < mg) { g.x = mg; g.vx = Math.abs(g.vx) * 0.3; }
  if (g.x > width - mg) { g.x = width - mg; g.vx = -Math.abs(g.vx) * 0.3; }
  if (g.y < mg) { g.y = mg; g.vy = Math.abs(g.vy) * 0.3; }
  if (g.y > height - mg) { g.y = height - mg; g.vy = -Math.abs(g.vy) * 0.3; }

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
    if (d < infl) {
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
  L.aparece = Math.min(1, L.aparece + h * 0.8);
  L.ang += ruido(m.t * 0.15, L.semilla) * 0.6 * h;
  L.x += Math.cos(L.ang) * C.VEL_LEJANA * u * h;
  L.y += Math.sin(L.ang) * C.VEL_LEJANA * u * h;
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
  if (m.terminado) return;
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
  m.arte.capas = m.arte.capas.filter(c => !(c.borrando && m.t - c.tBorra > CONFIG.IMAGEN_BORRADO + 2));
}

/* ===================== dibujo ===================== */

let SPR = {};
let M;
let CP, CPctx;

function crearSprite(r, g, b) {
  const s = document.createElement('canvas');
  s.width = s.height = 128;
  const c = s.getContext('2d');
  const grad = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.22, `rgba(${r},${g},${b},0.7)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.16)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  c.fillStyle = grad;
  c.fillRect(0, 0, 128, 128);
  return s;
}

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
  const s = radio * 4.4;
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
  if (m.terminado) return;
  const ctx = CPctx, C = CONFIG, u = m.u, t = m.t;

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(0,0,0,${C.ESTELA})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';

  for (const p of m.rojas) {
    const exc = Math.hypot(p.x - p.hx, p.y - p.hy) / (18 * u);
    brillo(ctx, SPR.roja, p.x, p.y, C.RADIO_ROJA * u * (1 + Math.min(exc, 1) * 0.5), 0.5 + Math.min(0.5, exc));
  }

  for (const b of m.azules) {
    if (!b.vivo) continue;
    const pulso = 1 + 0.12 * Math.sin(t * 2 + b.semilla);
    brillo(ctx, SPR.azul, b.x, b.y, b.r * pulso, 0.9 * b.aparece);
  }

  const L = m.lejana;
  for (let k = 0; k < 3; k++) {
    const a = t * 0.7 + k * (Math.PI * 2 / 3);
    const ox = Math.cos(a) * L.r * 0.5, oy = Math.sin(a) * L.r * 0.5;
    const intensidad = 0.5 + 0.5 * Math.sin(t * 0.6 + k * 2.094);
    brillo(ctx, SPR.canal[k], L.x + ox, L.y + oy, L.r * (0.8 + 0.2 * intensidad), C.BRILLO_LEJANA * (0.35 + 0.65 * intensidad) * L.aparece);
  }

  const g = m.gris;
  let rr = g.r, halo = 0.12;
  if (g.estado === 'espera') {
    rr = g.r * (1 + 0.04 * Math.sin(t * 1.5));
  } else {
    const amp = C.AMPLITUD_OSC * clamp(g.periodo / 0.5, 0.25, 1);
    const carga = g.fase * g.fase * g.fase;
    rr = g.r * (1 + amp * carga) * (1 - 0.25 * g.destello);
    halo = 0.12 + 0.35 * carga;
  }

  // Pérdida de luz sustancial y muy visible por cada azul consumida (multiplicador fuerte)
  const factorLuz = Math.max(0.1, 1 - (g.comidas * 0.2));
  
  if (g.asimilando) {
    const cr = g.colorAsimilado[0], cg = g.colorAsimilado[1], cb = g.colorAsimilado[2];
    if (!SPR.grisAsimilado) SPR.grisAsimilado = crearSprite(cr, cg, cb);
    brillo(ctx, SPR.grisAsimilado, g.x, g.y, rr * 2.4, halo * factorLuz);
    brillo(ctx, SPR.grisAsimilado, g.x, g.y, rr, (0.85 + 0.15 * g.destello) * factorLuz);
  } else {
    brillo(ctx, SPR.gris, g.x, g.y, rr * 2.4, halo * factorLuz);
    brillo(ctx, SPR.gris, g.x, g.y, rr, (0.85 + 0.15 * g.destello) * factorLuz);
  }

  ctx.lineWidth = 1.5;
  for (const e of m.efectos) {
    if (e.t < 0) continue;
    const p = e.t / e.dur;
    const radio = e.rmax * (1 - Math.pow(1 - p, 3));
    ctx.globalAlpha = (1 - p) * 0.8;
    ctx.strokeStyle = `rgb(${e.c[0]},${e.c[1]},${e.c[2]})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, radio, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function redibujarCapa(capa, t) {
  const C = CONFIG;
  const o = capa.esExterior ? imgExteriorObj : IMGS[capa.idx];
  if (!o || !o.img) return;

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

  if (capa.esExterior && !capa.completadaAsimilacion) {
    let completado = true;
    for (let i = 0; i < capa.N; i++) {
      if (alfaCelda(capa, i, t) < 0.95) { completado = false; break; }
    }
    if (completado) {
      capa.completadaAsimilacion = true;
      iniciarAsimilacion(M, capa);
    }
  }
}

function dibujarImagenes(m, ctx) {
  for (const capa of m.arte.capas) {
    const o = capa.esExterior ? imgExteriorObj : IMGS[capa.idx];
    if (!o || !o.ok) continue;
    const animando = m.t < capa.finAnim + 0.1;
    if (capa.sucia || animando || capa.borrando) {
      redibujarCapa(capa, m.t);
      if (!animando && !capa.borrando && !capa.esExterior) capa.sucia = false;
    }
    const r = rectImagen(capa.w, capa.h);
    ctx.globalAlpha = CONFIG.IMAGEN_OPACIDAD;
    ctx.drawImage(capa.cv, r.x, r.y, r.w, r.h);
  }
  ctx.globalAlpha = 1;
}

function componer(m) {
  const ctx = drawingContext;
  ctx.globalCompositeOperation = 'source-over';
  
  // Fondo difuminado dinámico basado en la imagen activa para fundirlas estéticamente
  if (m.arte.capas.length > 0) {
    const capaActual = m.arte.capas[m.arte.capas.length - 1];
    const o = capaActual.esExterior ? imgExteriorObj : IMGS[capaActual.idx];
    if (o && o.ok && capaActual.cv) {
      ctx.globalAlpha = 0.25; // Sutil y ambiental
      const r = rectImagen(o.w, o.h);
      ctx.drawImage(capaActual.cv, r.x, r.y, r.w, r.h);
      ctx.filter = 'blur(40px)';
      ctx.drawImage(capaActual.cv, 0, 0, width, height);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.globalAlpha = 1;
  dibujarImagenes(m, ctx);
  
  if (!m.terminado) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(CP, 0, 0, width, height);
  }
  ctx.globalCompositeOperation = 'source-over';
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
