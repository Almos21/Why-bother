/* =====================================================================
   OBRA DIGITAL INTERACTIVA
   Una partícula gris decide entre las azules que la rodean y una
   partícula multicolor lejana, al otro lado de un círculo rojo.

   Clic / toque / tecla R  ->  reinicia la obra (nueva decisión).

   TODO lo que se puede ajustar está en CONFIG.
   Las medidas en píxeles están pensadas para una pantalla de 800 px de
   lado menor y se escalan solas a cualquier tamaño de ventana.
   También puedes cambiar valores desde la URL sin tocar el código:
     tu-sitio.github.io/obra/?PROB_AZUL_INICIAL=0.5&PROB_RENDIRSE=0.9
   ===================================================================== */

const CONFIG = {
  // ---------- DECISIÓN (lo más importante) ----------
  PROB_AZUL_INICIAL: 0.8,   // prob. de ir hacia las azules. El resto (1 - esto) va hacia la de afuera
  PROB_RENDIRSE: 0.4,       // prob. de rendirse al chocar con el círculo rojo, yendo hacia afuera
  ESPERA_INICIAL: 3,        // segundos de calma antes de la primera decisión

  // ---------- ESCENA ----------
  N_AZULES: 12,
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
  CRECIMIENTO_POR_AZUL: 0.35, // cada azul comida alarga el periodo: base * (1 + esto * comidas)
  PERIODO_MIN: 0.05,        // el periodo nunca baja de aquí
  IMPULSO_AZUL: 380,        // fuerza de cada impulso hacia una azul (px/s)
  IMPULSO: 520,             // fuerza de cada impulso hacia la multicolor
  IMPULSO_POR_TOQUE: 0.12,  // en frenesí cada toque suma este % a los impulsos
  DISPERSION_IMPULSO: 0.12, // desvío aleatorio del impulso (radianes)

  // ---------- CADA VEZ QUE TOCA UNA MULTICOLOR ----------
  // factor del periodo en el toque n = max(MIN, INICIAL - PASO * (n - 1))
  // primer toque: un poco más rápido; los siguientes, cada vez mucho más.
  FACTOR_PERIODO_INICIAL: 0.92,
  FACTOR_PERIODO_PASO: 0.06,
  FACTOR_PERIODO_MIN: 0.55,

  // ---------- MOVIMIENTO ----------
  ROZAMIENTO: 1.6,
  GUIADO_AZUL: 140,         // empujoncito continuo hacia el objetivo
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
    if (params.has(k)) {
      const v = parseFloat(params.get(k));
      if (!isNaN(v)) CONFIG[k] = v;
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

/* ===================== mundo ===================== */

function crearMundo() {
  const u = Math.min(width, height) / 800;
  const cx = width / 2, cy = height / 2;
  const C = CONFIG;
  const m = {
    u, cx, cy, t: 0, espera: C.ESPERA_INICIAL,
    azules: [], rojas: [], efectos: [], eventos: [], lejana: null, gris: null
  };

  m.gris = {
    x: cx, y: cy, vx: 0, vy: 0, px: cx, py: cy,
    r0: C.RADIO_GRIS * u, r: C.RADIO_GRIS * u,
    estado: 'espera',          // espera | azules | exterior | frenesi
    fase: 0, periodo: C.PERIODO_BASE,
    comidas: 0, toques: 0,
    comprometido: false, dadoTirado: false,
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
    m.azules.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, r: C.RADIO_AZUL * u, vivo: true, semilla: Math.random() * 100 });
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

/* ===================== lógica de la gris ===================== */

function decidir(m, reintento) {
  const g = m.gris;
  g.dadoTirado = false;
  g.comprometido = false;
  const quedan = m.azules.some(b => b.vivo);
  if (!quedan) {
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
      if (!b.vivo) continue;
      const d = Math.hypot(b.x - g.x, b.y - g.y);
      if (d < md) { md = d; mejor = b; }
    }
    if (mejor) return mejor;
  }
  return m.lejana;
}

function darImpulso(m, obj) {
  const g = m.gris, C = CONFIG;
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
  g.comidas++;
  g.periodo = C.PERIODO_BASE * (1 + C.CRECIMIENTO_POR_AZUL * g.comidas);
  g.r = g.r0 * (1 + C.CRECIMIENTO_RADIO * g.comidas);
  g.vx *= 0.8; g.vy *= 0.8;
  g.destello = 1;
  m.efectos.push({ x: b.x, y: b.y, t: 0, dur: 0.7, rmax: 38 * m.u, c: [70, 130, 255] });
  evento(m, 'come', { comidas: g.comidas, periodo: +g.periodo.toFixed(2) });
  if (!m.azules.some(x => x.vivo)) {
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
  m.lejana = nuevaLejana(m, true);
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

  g.px = g.x; g.py = g.y;
  const obj = objetivo(m);

  // oscilación interna: al cerrar cada ciclo, impulso
  g.fase += h / g.periodo;
  if (g.fase >= 1) { g.fase -= 1; darImpulso(m, obj); }
  g.destello = Math.max(0, g.destello - h * 4);

  // guiado suave hacia el objetivo + temblor propio
  let dx = obj.x - g.x, dy = obj.y - g.y;
  const dist = Math.hypot(dx, dy) || 1; dx /= dist; dy /= dist;
  let guiado = g.estado === 'azules' ? C.GUIADO_AZUL
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
      if (b.vivo && distSeg(b.x, b.y, g.px, g.py, g.x, g.y) < g.r + b.r) comer(m, b);
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
    if (!b.vivo) continue;
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
}

/* ===================== dibujo ===================== */

let SPR = {};
let M;

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

function brillo(ctx, spr, x, y, radio, alpha) {
  const s = radio * 4.4;            // el sprite tiene un halo de ~4x el radio del núcleo
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.drawImage(spr, x - s, y - s, s * 2, s * 2);
}

function dibujarMundo(m) {
  const ctx = drawingContext, C = CONFIG, u = m.u, t = m.t;

  // estela: se oscurece lo anterior en vez de borrar
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(0,0,0,${C.ESTELA})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';

  // círculo rojo
  for (const p of m.rojas) {
    const exc = Math.hypot(p.x - p.hx, p.y - p.hy) / (18 * u);
    brillo(ctx, SPR.roja, p.x, p.y, C.RADIO_ROJA * u * (1 + Math.min(exc, 1) * 0.5), 0.5 + Math.min(0.5, exc));
  }

  // azules
  for (const b of m.azules) {
    if (!b.vivo) continue;
    const pulso = 1 + 0.12 * Math.sin(t * 2 + b.semilla);
    brillo(ctx, SPR.azul, b.x, b.y, b.r * pulso, 0.9);
  }

  // multicolor lejana: tres canales (R, G, B) que se mezclan y giran => cambia de color
  const L = m.lejana;
  for (let k = 0; k < 3; k++) {
    const a = t * 0.7 + k * (Math.PI * 2 / 3);
    const ox = Math.cos(a) * L.r * 0.5, oy = Math.sin(a) * L.r * 0.5;
    const intensidad = 0.5 + 0.5 * Math.sin(t * 0.6 + k * 2.094);
    brillo(ctx, SPR.canal[k], L.x + ox, L.y + oy, L.r * (0.8 + 0.2 * intensidad), C.BRILLO_LEJANA * (0.35 + 0.65 * intensidad) * L.aparece);
  }

  // gris: carga (crece despacio) y suelta (impulso)
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
  brillo(ctx, SPR.gris, g.x, g.y, rr * 2.4, halo);
  brillo(ctx, SPR.gris, g.x, g.y, rr, 0.85 + 0.15 * g.destello);

  // destellos de eventos (comer, tocar, rendirse)
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

/* ===================== p5 ===================== */

function setup() {
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  SPR.gris = crearSprite(215, 215, 222);
  SPR.azul = crearSprite(60, 120, 255);
  SPR.roja = crearSprite(255, 45, 60);
  SPR.canal = [crearSprite(255, 0, 0), crearSprite(0, 255, 0), crearSprite(0, 0, 255)];
  M = crearMundo();
  background(0);
}

function draw() {
  actualizarMundo(M, deltaTime / 1000);
  dibujarMundo(M);
}

function reiniciar() {
  M = crearMundo();
  background(0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  reiniciar();
}

function mousePressed() { reiniciar(); return false; }
function keyPressed() { if (key === 'r' || key === 'R') reiniciar(); }
