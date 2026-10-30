/* =====================================================================
   OBRA DIGITAL INTERACTIVA (VERSIÓN ROBUSTA ANTI-PANTALLA NEGRA)
   ===================================================================== */

const CONFIG = {
  // ---------- DECISIÓN ----------
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

/* ===================== imágenes con fallback seguro ===================== */

const IMGS = [];   
let imgExteriorObj = null;

// Crea una imagen de respaldo procedural (canvas temporal) si falla la carga para evitar pantalla negra
function crearImagenRespaldo(tipoTexto) {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 800;
  const ctx = c.getContext('2d');
  
  // Gradiente artístico de respaldo
  const grad = ctx.createLinearGradient(0, 0, 600, 800);
  grad.addColorStop(0, '#1a1a3a');
  grad.addColorStop(0.5, '#4a154b');
  grad.addColorStop(1, '#0f2027');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 800);

  // Círculos y formas estéticas para que se vea bien si se usa el respaldo
  for(let i=0; i<40; i++) {
    ctx.fillStyle = `hsla(${i * 45}, 70%, 60%, 0.3)`;
    ctx.beginPath();
    ctx.arc(Math.random()*600, Math.random()*800, Math.random()*80 + 20, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tipoTexto, 300, 400);

  const img = new Image();
  img.src = c.toDataURL();
  return img;
}

function cargarImagenes() {
  CONFIG.IMAGENES.forEach((src, i) => {
    const o = { img: new Image(), ok: false, w: 600, h: 800 };
    o.img.onload = () => { o.ok = true; o.w = o.img.naturalWidth; o.h = o.img.naturalHeight; };
    o.img.onerror = () => {
      console.warn('[obra] No se encontró o falló', src, '- Usando imagen de respaldo.');
      o.img = crearImagenRespaldo('IMAGEN ' + (i + 1));
      o.ok = true;
      o.w = 600; o.h = 800;
    };
    o.img.src = src;
    IMGS[i] = o;
  });

  imgExteriorObj = { img: new Image(), ok: false, w: 600, h: 800 };
  imgExteriorObj.img.onload = () => { imgExteriorObj.ok = true; imgExteriorObj.w = imgExteriorObj.img.naturalWidth; imgExteriorObj.h = imgExteriorObj.img.naturalHeight; };
  imgExteriorObj.img.onerror = () => {
    console.warn('[obra] No se encontró o falló 5ta imagen', CONFIG.IMAGEN_EXTERIOR, '- Usando respaldo.');
    imgExteriorObj.img = crearImagenRespaldo('5ta IMAGEN EXTERIOR');
    imgExteriorObj.ok = true;
    imgExteriorObj.w = 600; imgExteriorObj.h = 800;
  };
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
  const o = esExterior ? imgExteriorObj : (IMGS[idx] || { w: 600, h: 800 });
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
  evento(
