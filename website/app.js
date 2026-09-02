const { createApp, ref, computed, onMounted, onUnmounted, nextTick, watch } = Vue;

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
  };
}

/* ==================== ASCII RENDERERS ==================== */

const asciiRings = (ctx, w, h, t, status) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const charSets = { idle: '.:-=+*#%@', thinking: ':;i1tfLCG08', working: '┤╡╢╖╕╣║╗╝╜╛', waiting: '░▒▓█', success: '1234567890', error: '!@#$%^&*()' };
  const chars = charSets[status] || charSets.idle;
  for (let ring = 0; ring < 5; ring++) {
    const radius = 40 + ring * 28;
    const segments = 24 + ring * 8;
    const speed = status === 'working' ? 1.5 : 0.5;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 + t * speed * (ring % 2 ? 1 : -1);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const ci = (i + Math.floor(t * 4)) % chars.length;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(angle + t) * 0.1})`;
      ctx.font = `${11 + ring}px monospace`;
      ctx.fillText(chars[ci], x, y);
    }
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(status.toUpperCase(), cx, cy + 4);
  ctx.textAlign = 'start';
};

const asciiWave = (ctx, w, h, t, pattern) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const chars = pattern || '·.:|=+*#%@';
  const cols = 40;
  const rows = 18;
  const cellW = w / cols;
  const cellH = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const val = Math.sin(x * 0.3 + t * 2 + y * 0.2) * 0.5 + 0.5;
      const ci = Math.floor(val * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.1 + val * 0.5})`;
      ctx.font = `${Math.floor(cellH * 0.8)}px monospace`;
      ctx.fillText(chars[ci], x * cellW + 2, y * cellH + cellH * 0.8);
    }
  }
};

const asciiWireCube = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const s = 70;
  const cos = Math.cos, sin = Math.sin;
  const ry = t * 0.4, rx = t * 0.25;
  const verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x,y,z]) => {
    let y1 = y * cos(rx) - z * sin(rx);
    let z1 = y * sin(rx) + z * cos(rx);
    let x1 = x * cos(ry) - z1 * sin(ry);
    let z2 = x * sin(ry) + z1 * cos(ry);
    const scale = 2 / (4 + z2);
    return [cx + x1 * s * scale, cy + y1 * s * scale];
  });
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  edges.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(verts[a][0], verts[a][1]);
    ctx.lineTo(verts[b][0], verts[b][1]);
    ctx.stroke();
  });
  verts.forEach(([x, y], i) => {
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('+', x - 3, y + 4);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = '10px monospace';
  ctx.fillText('3D WIREFRAME', 10, h - 10);
};

const asciiGrid = (ctx, w, h, t, opts = {}) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cols = opts.cols || 32;
  const rows = opts.rows || 16;
  const cellW = w / cols;
  const cellH = h / rows;
  const chars = opts.chars || '·.:*#@';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dist = Math.sqrt((x - cols / 2) ** 2 + (y - rows / 2) ** 2);
      const val = Math.sin(dist * 0.4 - t * 2) * 0.5 + 0.5;
      const ci = Math.floor(val * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.08 + val * 0.45})`;
      ctx.font = `${Math.floor(cellH * 0.75)}px monospace`;
      ctx.fillText(chars[ci], x * cellW + 2, y * cellH + cellH * 0.75);
    }
  }
};

const asciiParticles = (ctx, w, h, t, opts = {}) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const count = opts.count || 80;
  const chars = opts.chars || '*+.#@';
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const x = ((seed * 7.3 + Math.sin(t + i) * 40) % w + w) % w;
    const y = ((seed * 11.1 + Math.cos(t * 0.7 + i) * 30) % h + h) % h;
    const ci = i % chars.length;
    const alpha = 0.15 + Math.abs(Math.sin(t + i * 0.5)) * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = `${10 + (i % 4)}px monospace`;
    ctx.fillText(chars[ci], x, y);
  }
};

const asciiBarChart = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const bars = 16;
  const barW = (w - 60) / bars;
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText('GPU utilization // real-time', 10, 16);
  for (let i = 0; i < bars; i++) {
    const val = (Math.sin(t * 2 + i * 0.6) * 0.5 + 0.5) * 0.8 + 0.1;
    const barH = val * (h - 40);
    const chars = '█▓▒░';
    const ci = Math.floor(val * (chars.length - 1));
    for (let row = 0; row < Math.floor(barH / 12); row++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + (row / (barH / 12)) * 0.4})`;
      ctx.fillText(chars[ci], 30 + i * barW, h - 20 - row * 12);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText(String(i + 1).padStart(2), 30 + i * barW, h - 6);
  }
};

const asciiSpiral = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const chars = '·.:;|=+*#%@';
  for (let i = 0; i < 300; i++) {
    const angle = i * 0.15 + t;
    const r = i * 0.6;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (x < 0 || x > w || y < 0 || y > h) continue;
    const ci = i % chars.length;
    const alpha = Math.max(0, 0.6 - i * 0.002);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = `${10 + (i % 4)}px monospace`;
    ctx.fillText(chars[ci], x, y);
  }
};

const asciiNoise = (ctx, w, h, t, opts = {}) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cellSize = opts.cellSize || 10;
  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);
  const chars = opts.chars || ' ·∶: Noticed░▒▓█';
  const seed = opts.seed || 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = Math.sin(x * 0.1 + seed) * Math.cos(y * 0.1 + t * 0.5) * 0.5 + 0.5;
      const ci = Math.floor(n * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.05 + n * 0.5})`;
      ctx.font = `${cellSize - 1}px monospace`;
      ctx.fillText(chars[ci], x * cellSize, y * cellSize + cellSize - 1);
    }
  }
};

const asciiEqualizer = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const bands = 24;
  const bandW = (w - 40) / bands;
  const chars = '·:*+#@';
  for (let i = 0; i < bands; i++) {
    const val = Math.abs(Math.sin(t * 1.5 + i * 0.5)) * 0.9 + 0.1;
    const barH = val * (h - 30);
    for (let row = 0; row < Math.floor(barH / 10); row++) {
      const ci = Math.min(chars.length - 1, Math.floor((row / (barH / 10)) * chars.length));
      ctx.fillStyle = `rgba(255,255,255,${0.1 + (row / (barH / 10)) * 0.45})`;
      ctx.font = '10px monospace';
      ctx.fillText(chars[ci], 20 + i * bandW, h - 16 - row * 10);
    }
  }
};

const asciiHeatmap = (ctx, w, h, t, opts = {}) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cellW = 8, cellH = 12;
  const cols = Math.ceil(w / cellW);
  const rows = Math.ceil(h / cellH);
  const chars = ' ··::--==++**##@@';
  const freq = opts.freq || 0.12;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const val = Math.sin(x * freq + t * 0.8) * Math.cos(y * freq + t * 0.6) * 0.5 + 0.5;
      const ci = Math.floor(val * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.05 + val * 0.5})`;
      ctx.font = `${cellH - 2}px monospace`;
      ctx.fillText(chars[ci], x * cellW + 1, y * cellH + cellH - 2);
    }
  }
};

const asciiMatrix = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cols = 30;
  const cellW = w / cols;
  const chars = '01';
  const drops = Array.from({ length: cols }, (_, i) => (i * 7 + 3) % 20);
  ctx.font = '12px monospace';
  for (let i = 0; i < cols; i++) {
    const y = (drops[i] + t * 2) % (h / 12);
    for (let j = 0; j < 8; j++) {
      const charY = y * 12 - j * 12;
      if (charY < 0 || charY > h) continue;
      const alpha = j === 0 ? 0.8 : Math.max(0.05, 0.5 - j * 0.06);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      const ci = (i * 3 + j + Math.floor(t * 3)) % chars.length;
      ctx.fillText(chars[ci], i * cellW + 2, charY);
    }
  }
};

const asciiFire = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cellW = 8, cellH = 10;
  const cols = Math.ceil(w / cellW);
  const rows = Math.ceil(h / cellH);
  const chars = ' .,:;i1tfLCG08#';
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const normalY = y / rows;
      const base = Math.sin(x * 0.2 + t) * 0.3 + 0.5;
      const heat = Math.max(0, base - normalY * 0.7 + Math.sin(x * 0.5 + y * 0.3 + t * 2) * 0.2);
      const ci = Math.floor(heat * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${heat * 0.6})`;
      ctx.font = `${cellH - 1}px monospace`;
      ctx.fillText(chars[ci], x * cellW + 1, y * cellH + cellH - 2);
    }
  }
};

const asciiRadar = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const rings = 5;
  const chars = '·:.:=+*#%@';
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let r = 1; r <= rings; r++) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 25, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * rings * 25, cy + Math.sin(angle) * rings * 25);
    ctx.stroke();
  }
  const sweepAngle = t * 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAngle) * rings * 25, cy + Math.sin(sweepAngle) * rings * 25);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t * 0.3;
    const r = 20 + Math.abs(Math.sin(i * 2.3 + t)) * 80;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const ci = i % chars.length;
    const alpha = Math.abs(Math.sin(sweepAngle - angle)) < 0.3 ? 0.9 : 0.15;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = '11px monospace';
    ctx.fillText(chars[ci], x, y);
  }
};

const asciiWaveform = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const mid = h / 2;
  const chars = '·:|=+*#';
  const points = 80;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < points; i++) {
      const x = (i / points) * w;
      const val = Math.sin(i * 0.1 + t * (2 + layer * 0.5) + layer) * (20 + layer * 15);
      const y = mid + val;
      const ci = Math.abs(Math.floor(val / 5)) % chars.length;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + layer * 0.15})`;
      ctx.font = '10px monospace';
      ctx.fillText(chars[ci], x, y);
    }
  }
};

const asciiSine = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const mid = h / 2;
  const chars = '·:-=+*#%@';
  for (let i = 0; i < 200; i++) {
    const x = (i / 200) * w;
    const val = Math.sin(i * 0.06 + t * 2) * (h * 0.35);
    const y = mid + val;
    const ci = Math.floor((Math.abs(val) / (h * 0.35)) * (chars.length - 1));
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(i * 0.06 + t * 2)) * 0.4})`;
    ctx.font = '11px monospace';
    ctx.fillText(chars[ci], x, y);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '10px monospace';
  ctx.fillText(`freq: ${(1 + Math.sin(t * 0.3) * 0.5).toFixed(2)} Hz`, 10, 16);
};

/* ==================== CANVAS MAP ==================== */

const drawCanvas = (canvas, rendererId, time, state) => {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (!ctx) return;
  const t = time * 0.001;
  const renderers = {
    hero: () => asciiRings(ctx, w, h, t, state.status),
    playground: () => asciiWave(ctx, w, h, t, ':;|=+*#%@'),
    s02_fullscreen: () => asciiWave(ctx, w, h, t, '.:;-=+*#%@'),
    s03_sharing: () => asciiWireCube(ctx, w, h, t),
    s04_shared_uniforms: () => asciiWave(ctx, w, h, t, '._-=+*#'),
    s05_fixits: () => asciiGrid(ctx, w, h, t, { chars: '!!..::##' }),
    s06_scene: () => asciiGrid(ctx, w, h, t, { cols: 20, rows: 12, chars: '@*+#=.-' }),
    s07_hdr_post: () => asciiHeatmap(ctx, w, h, t),
    s08_ping_pong: () => asciiBarChart(ctx, w, h, t),
    s09_bundles: () => asciiGrid(ctx, w, h, t, { cols: 24, rows: 10, chars: '[]{}()' }),
    s10_group_claim: () => asciiSpiral(ctx, w, h, t),
    s11_compute: () => asciiParticles(ctx, w, h, t, { count: 100, chars: '*+#@' }),
    s12_scheduling_resize: () => asciiMatrix(ctx, w, h, t),
    s13_headless: () => asciiNoise(ctx, w, h, t, { cellSize: 10, seed: 42 }),
    s14_raymarching: () => asciiFire(ctx, w, h, t),
    s15_noise_fields: () => asciiNoise(ctx, w, h, t, { cellSize: 7, seed: 0, chars: ' ·∶░▒▓█' }),
    s16_particle_system: () => asciiParticles(ctx, w, h, t, { count: 150, chars: '.·:*+@' }),
    s17_volumetric: () => asciiHeatmap(ctx, w, h, t, { freq: 0.08 }),
    s18_post_process: () => asciiEqualizer(ctx, w, h, t),
    s19_domain_warping: () => asciiNoise(ctx, w, h, t, { cellSize: 6, seed: 7, chars: '·:;i1tfLCG08#' }),
    s20_texture_gen: () => asciiSine(ctx, w, h, t),
    s21_edge_detect: () => asciiRadar(ctx, w, h, t),
    s22_color_palette: () => asciiWaveform(ctx, w, h, t),
    cockpit: () => asciiRings(ctx, w, h, t, state.status),
    dashboard: () => asciiBarChart(ctx, w, h, t),
    replay: () => asciiWave(ctx, w, h, t, '<=>[]|/\\'),
    agent_animation: () => asciiParticles(ctx, w, h, t, { count: 120 }),
    state_tools: () => asciiGrid(ctx, w, h, t, { cols: 20, rows: 8, chars: '+-|=' }),
    transmission: () => asciiWireCube(ctx, w, h, t),
    fluid: () => asciiFire(ctx, w, h, t),
    lava: () => asciiNoise(ctx, w, h, t, { cellSize: 5, chars: '·:.:;i1tfLCG08#' }),
    gallery: () => asciiGrid(ctx, w, h, t, { cols: 16, rows: 8, chars: '::--**##' }),
    mesh_edit: () => asciiRadar(ctx, w, h, t),
    dom_mount: () => asciiWave(ctx, w, h, t, '+-:.'),
    fw_vue: () => asciiRings(ctx, w, h, t, 'working'),
    fw_react: () => asciiGrid(ctx, w, h, t, { cols: 16, rows: 6, chars: '><' }),
    fw_svelte: () => asciiWave(ctx, w, h, t, '~/\\'),
    fw_purejs: () => asciiParticles(ctx, w, h, t, { count: 60, chars: 'o*' }),
  };
  const renderer = renderers[rendererId];
  if (renderer) renderer();
};

/* ==================== APP ==================== */

createApp({
  setup() {
    const status = ref('working');
    const progress = ref(64);
    const activity = ref(42);
    const filter = ref('all');
    const search = ref('');
    const eventLog = ref('// waiting for events...');
    const modalOpen = ref(false);
    const modalType = ref('');
    const modalExample = ref(null);
    const modalFramework = ref(null);

    const categories = [
      { id: 'gpu_core', label: 'GPU Core' },
      { id: 'agent', label: 'Agent' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'gpu_extra', label: 'GPU Extras' },
    ];

    const examples = ref([
      { id: 's02_fullscreen', title: 's02 — fullscreen triangle', category: 'gpu_core', tags: 'fullscreen triangle wgsl', description: 'One triangle. No vertex buffer. The simplest GPU entry point.', code: `import { gpu } from 'aigpu'\n\nconst gpuCtx = gpu()\nconst canvas = document.querySelector('canvas')\n\nawait gpuCtx.configure({\n  canvas,\n  format: navigator.gpu.getPreferredCanvasFormat(),\n})\n\nconst pipeline = gpuCtx.device.createRenderPipeline({\n  layout: 'auto',\n  vertex: {\n    module: gpuCtx.device.createShaderModule({\n      code: \`@vertex fn v(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {\n        var pos = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));\n        return vec4f(pos[i], 0, 1);\n      }\`,\n    }),\n    entryPoint: 'v',\n  },\n  fragment: {\n    module: gpuCtx.device.createShaderModule({\n      code: \`@fragment fn f() -> @location(0) vec4f {\n        return vec4f(1);\n      }\`,\n    }),\n    entryPoint: 'f',\n    targets: [{ format: gpuCtx.format }],\n  },\n})\n\nfunction render() {\n  const pass = gpuCtx.beginPass({ canvas })\n  pass.setPipeline(pipeline)\n  pass.draw(3)\n  pass.end()\n  gpuCtx.submit()\n}\n\nrender()`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s02_fullscreen_triangle/renderer.ts' },
      { id: 's03_sharing', title: 's03 — sharing GPU contexts', category: 'gpu_core', tags: 'context share workers', description: 'Share one GPU device across tabs, workers, or multiple canvases.', code: `import { gpu } from 'aigpu'\n\nconst a = gpu()\nconst b = gpu()\n\n// Same device, different canvases\nawait a.configure({ canvas: canvasA, format: 'bgra8unorm' })\nawait b.configure({ canvas: canvasB, format: 'bgra8unorm' })\n\n// Both draw same pipeline, different uniforms\nconst pipeline = a.device.createRenderPipeline({ ... })\n\nfunction renderFrame(t) {\n  const passA = a.beginPass({ canvas: canvasA })\n  passA.setPipeline(pipeline)\n  passA.draw(3)\n  passA.end()\n\n  const passB = b.beginPass({ canvas: canvasB })\n  passB.setPipeline(pipeline)\n  passB.draw(3)\n  passB.end()\n\n  a.submit()\n  b.submit()\n  requestAnimationFrame(renderFrame)\n}\nrequestAnimationFrame(renderFrame)`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s03_sharing_contexts/renderer.ts' },
      { id: 's04_shared_uniforms', title: 's04 — shared uniforms', category: 'gpu_core', tags: 'uniform buffer bindgroup', description: 'One uniform buffer drives multiple pipelines simultaneously.', code: `import { gpu, Uniform } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst time = Uniform(gpuCtx.device, { size: 16 })\n\nconst bindGroup = gpuCtx.device.createBindGroup({\n  layout: pipeline.getBindGroupLayout(0),\n  entries: [{ binding: 0, resource: time.buffer }],\n})\n\nfunction render(t) {\n  time.write(new Float32Array([t * 0.001, 0, 0, 0]))\n  const pass = gpuCtx.beginPass({ canvas })\n  pass.setPipeline(pipeline)\n  pass.setBindGroup(0, bindGroup)\n  pass.draw(3)\n  pass.end()\n  gpuCtx.submit()\n  requestAnimationFrame(render)\n}\nrequestAnimationFrame(render)`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s04_shared_uniforms/renderer.ts' },
      { id: 's05_fixits', title: 's05 — fixits: common patterns', category: 'gpu_core', tags: 'patterns fixes common', description: 'Reusable patterns for resize handling, error recovery, and cleanup.', code: `import { gpu, onResize, onDestroy } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\n// Auto-resize\nonResize(canvas, (w, h) => {\n  gpuCtx.configure({ canvas, width: w, height: h })\n  render()\n})\n\n// Cleanup on destroy\nonDestroy(() => {\n  gpuCtx.device.destroy()\n})\n\n// Error boundary\ntry {\n  const pipeline = gpuCtx.device.createRenderPipeline({ ... })\n} catch (e) {\n  console.error('Pipeline creation failed:', e)\n  // Fallback to software renderer\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s05_fixits/renderer.ts' },
      { id: 's06_scene', title: 's06 — scene graph', category: 'gpu_core', tags: 'scene graph objects hierarchy', description: 'Build a renderable scene graph with transforms and children.', code: `import { gpu, Scene, Mesh, Camera } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst scene = Scene()\nconst camera = Camera({ fov: 60, near: 0.1, far: 100 })\n\nconst mesh = Mesh({\n  geometry: 'cube',\n  material: { color: [1, 1, 1] },\n})\n\nscene.add(mesh)\nscene.add(camera)\n\nfunction render(t) {\n  mesh.rotation.y = t * 0.001\n  scene.render(camera)\n  requestAnimationFrame(render)\n}\nrequestAnimationFrame(render)`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s06_scene_graph/renderer.ts' },
      { id: 's07_hdr_post', title: 's07 — HDR + post processing', category: 'gpu_core', tags: 'hdr post processing tone mapping', description: 'HDR rendering with tone mapping and post-processing effects.', code: `import { gpu, RenderTarget, PostProcess } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst hdrTarget = RenderTarget(gpuCtx, {\n  width: canvas.width,\n  height: canvas.height,\n  format: 'rgba16float',\n})\n\nconst bloom = PostProcess(gpuCtx, {\n  shader: 'bloom',\n  intensity: 0.3,\n})\n\nfunction render(t) {\n  const pass = gpuCtx.beginPass({ target: hdrTarget })\n  // Draw scene to HDR target\n  pass.end()\n\n  bloom.apply(hdrTarget.texture)\n  const out = gpuCtx.beginPass({ canvas })\n  // Draw fullscreen quad with bloom result\n  out.end()\n  gpuCtx.submit()\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s07_hdr_post/renderer.ts' },
      { id: 's08_ping_pong', title: 's08 — ping-pong buffers', category: 'gpu_core', tags: 'ping pong buffer compute', description: 'Double-buffered compute for iterative simulations.', code: `import { gpu, pingPong } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst { read, write, swap } = pingPong(gpuCtx, 8, 8, {\n  format: 'rgba8unorm',\n})\n\nconst computePipeline = gpuCtx.device.createComputePipeline({\n  layout: 'auto',\n  compute: {\n    module: gpuCtx.device.createShaderModule({\n      code: computeShader,\n    }),\n    entryPoint: 'main',\n  },\n})\n\nfunction simulate() {\n  const encoder = gpuCtx.device.createCommandEncoder()\n  const pass = encoder.beginComputePass()\n  pass.setPipeline(computePipeline)\n  pass.setBindGroup(0, read.bindGroup)\n  pass.dispatchWorkgroups(8, 8)\n  pass.end()\n  gpuCtx.device.queue.submit([encoder.finish()])\n  swap()\n  requestAnimationFrame(simulate)\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s08_ping_pong/renderer.ts' },
      { id: 's09_bundles', title: 's09 — render bundles', category: 'gpu_core', tags: 'render bundle recording', description: 'Record GPU command bundles for instant replay.', code: `import { gpu, Bundle } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst bundle = Bundle(gpuCtx, (pass) => {\n  pass.setPipeline(pipeline)\n  pass.setBindGroup(0, bindGroup)\n  pass.draw(6)\n})\n\nfunction render() {\n  const pass = gpuCtx.beginPass({ canvas })\n  pass.executeBundles([bundle])\n  pass.end()\n  gpuCtx.submit()\n}\n\n// Replay is near-instant\nrender()`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s09_render_bundles/renderer.ts' },
      { id: 's10_group_claim', title: 's10 — group claim', category: 'gpu_core', tags: 'group claim compute', description: 'Claim compute groups for parallel work distribution.', code: `import { gpu, claim } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst groups = claim(gpuCtx, {\n  count: 16,\n  size: [256, 1, 1],\n})\n\nfunction compute() {\n  const encoder = gpuCtx.device.createCommandEncoder()\n  const pass = encoder.beginComputePass()\n  pass.setPipeline(computePipeline)\n  groups.forEach((g) => {\n    pass.setBindGroup(0, g.bindGroup)\n    pass.dispatchWorkgroups(256, 1, 1)\n  })\n  pass.end()\n  gpuCtx.device.queue.submit([encoder.finish()])\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s10_group_claim/renderer.ts' },
      { id: 's11_compute', title: 's11 — compute shaders', category: 'gpu_core', tags: 'compute shader particles', description: 'Run compute shaders for particle simulations.', code: `import { gpu, Storage } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst particles = Storage(gpuCtx, {\n  size: 1024 * 4,\n  usage: 'storage | vertex',\n})\n\nconst computePipeline = gpuCtx.device.createComputePipeline({\n  layout: 'auto',\n  compute: {\n    module: gpuCtx.device.createShaderModule({\n      code: \`@group(0) @binding(0) var<storage, read_write> data: array<vec4f>;\n      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {\n        let i = id.x;\n        if (i >= arrayLength(&data)) { return; }\n        data[i] += vec4f(0.0, -0.001, 0.0, 0.0);\n      }\`,\n    }),\n    entryPoint: 'main',\n  },\n})\n\nfunction simulate() {\n  const encoder = gpuCtx.device.createCommandEncoder()\n  const pass = encoder.beginComputePass()\n  pass.setPipeline(computePipeline)\n  pass.setBindGroup(0, particles.bindGroup)\n  pass.dispatchWorkgroups(16, 1, 1)\n  pass.end()\n  gpuCtx.device.queue.submit([encoder.finish()])\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s11_compute/renderer.ts' },
      { id: 's12_scheduling_resize', title: 's12 — scheduling + resize', category: 'gpu_core', tags: 'scheduling resize frame', description: 'Adaptive frame scheduling with automatic resize handling.', code: `import { gpu, onResize, schedule } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nonResize(canvas, (w, h) => {\n  gpuCtx.configure({ canvas, width: w, height: h })\n})\n\nconst loop = schedule((dt) => {\n  const pass = gpuCtx.beginPass({ canvas })\n  pass.setPipeline(pipeline)\n  pass.draw(3)\n  pass.end()\n  gpuCtx.submit()\n})\n\n// Automatically adjusts to display refresh rate\nloop.start()`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s12_scheduling_resize/renderer.ts' },
      { id: 's13_headless', title: 's13 — headless rendering', category: 'gpu_core', tags: 'headless offscreen server', description: 'Render without a visible canvas — server-side or offscreen.', code: `import { gpu } from 'aigpu'\n\nconst gpuCtx = gpu({ headless: true })\n\nconst texture = gpuCtx.device.createTexture({\n  size: [512, 512],\n  format: 'rgba8unorm',\n  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,\n})\n\nconst pass = gpuCtx.beginPass({ target: texture })\npass.setPipeline(pipeline)\npass.draw(3)\npass.end()\ngpuCtx.submit()\n\n// Read back pixels\nconst buffer = gpuCtx.readBack(texture)\nconst pixels = new Uint8Array(await buffer.arrayBuffer())`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s13_headless/renderer.ts' },
      { id: 's14_raymarching', title: 's14 — raymarching', category: 'gpu_extra', tags: 'raymarching sdf ray tracing', description: 'GPU raymarching for procedural 3D scenes with SDFs.', code: `import { gpu } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst shader = \`struct Uniforms { time: f32, resolution: vec2f };\n@group(0) @binding(0) var<uniform> u: Uniforms;\n\n@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = pos.xy / u.resolution - 0.5;\n  let ro = vec3f(0, 0, -3);\n  let rd = normalize(vec3f(uv, 1.5));\n  var t = 0.0;\n  for (var i = 0; i < 64; i++) {\n    let p = ro + rd * t;\n    let d = min(length(p) - 0.5, length(p - vec3f(1,0,0)) - 0.3);\n    if (d < 0.001) { break; }\n    t += d;\n  }\n  let col = select(vec4f(0), vec4f(1), t < 20.0);\n  return col;\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s14_raymarching/renderer.ts' },
      { id: 's15_noise_fields', title: 's15 — procedural noise', category: 'gpu_extra', tags: 'noise perlin simplex procedural', description: 'Procedural noise fields for terrain, textures, and effects.', code: `import { gpu, Uniform } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst time = Uniform(gpuCtx.device, { size: 16 })\n\nconst noiseShader = \`fn noise(p: vec2f) -> f32 {\n  let i = floor(p);\n  let f = fract(p);\n  let u = f * f * (3.0 - 2.0 * f);\n  return mix(\n    mix(dot(rand(i + vec2f(0,0)), f - vec2f(0,0)),\n        dot(rand(i + vec2f(1,0)), f - vec2f(1,0)), u.x),\n    mix(dot(rand(i + vec2f(0,1)), f - vec2f(0,1)),\n        dot(rand(i + vec2f(1,1)), f - vec2f(1,1)), u.x),\n    u.y\n  );\n}\n\n@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let n = noise(pos.xy * 0.01 + u.time);\n  return vec4f(vec3f(n), 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s15_noise_fields/renderer.ts' },
      { id: 's16_particle_system', title: 's16 — particle system', category: 'gpu_extra', tags: 'particles gpu compute simulation', description: 'GPU-driven particle system with physics and collisions.', code: `import { gpu, Storage } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst MAX = 10000\nconst positions = Storage(gpuCtx, { size: MAX * 16, usage: 'storage | vertex' })\nconst velocities = Storage(gpuCtx, { size: MAX * 16, usage: 'storage' })\n\nconst computeShader = \`@group(0) @binding(0) var<storage, read_write> pos: array<vec4f>;\n@group(0) @binding(1) var<storage, read_write> vel: array<vec4f>;\n@group(0) @binding(2) var<uniform> dt: f32;\n\n@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {\n  let i = id.x;\n  if (i >= arrayLength(&pos)) { return; }\n  vel[i].y -= 9.8 * dt;\n  pos[i] += vel[i] * dt;\n  if (pos[i].y < -1.0) { pos[i] = vec4f(0, 2, 0, 1); vel[i] = vec4f(rand(i), 1, rand(i+1), 0); }\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s16_particle_system/renderer.ts' },
      { id: 's17_volumetric', title: 's17 — volumetric rendering', category: 'gpu_extra', tags: 'volumetric fog scattering', description: 'Volumetric fog and light scattering with ray marching.', code: `import { gpu, Uniform } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst volumetricShader = \`@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = pos.xy / resolution;\n  let ro = vec3f(uv * 2.0 - 1.0, -3);\n  let rd = vec3f(0, 0, 1);\n  var density = 0.0;\n  for (var i = 0; i < 64; i++) {\n    let p = ro + rd * f32(i) * 0.1;\n    let n = fbm(p.xz * 0.5 + u.time * 0.1);\n    density += n * 0.02;\n  }\n  return vec4f(vec3f(density), 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s17_volumetric/renderer.ts' },
      { id: 's18_post_process', title: 's18 — post-processing chain', category: 'gpu_extra', tags: 'post processing bloom blur', description: 'Multi-pass post-processing with bloom, blur, and tone mapping.', code: `import { gpu, RenderTarget, PostProcess } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst sceneTarget = RenderTarget(gpuCtx, { width: 1024, height: 1024, format: 'rgba16float' })\nconst blurPing = RenderTarget(gpuCtx, { width: 256, height: 256, format: 'rgba16float' })\nconst blurPong = RenderTarget(gpuCtx, { width: 256, height: 256, format: 'rgba16float' })\n\nconst brightPass = PostProcess(gpuCtx, { shader: 'brightness', threshold: 0.8 })\nconst blurH = PostProcess(gpuCtx, { shader: 'gaussian_h', radius: 4 })\nconst blurV = PostProcess(gpuCtx, { shader: 'gaussian_v', radius: 4 })\nconst composite = PostProcess(gpuCtx, { shader: 'composite', intensity: 0.4 })\n\nfunction render(t) {\n  // 1) Draw scene\n  const scenePass = gpuCtx.beginPass({ target: sceneTarget })\n  // draw scene...\n  scenePass.end()\n  // 2) Extract bright\n  brightPass.apply(sceneTarget.texture, blurPing)\n  // 3) Blur ping-pong\n  for (let i = 0; i < 3; i++) {\n    blurH.apply(blurPing.texture, blurPong)\n    blurV.apply(blurPong.texture, blurPing)\n  }\n  // 4) Composite\n  const out = gpuCtx.beginPass({ canvas })\n  composite.apply(sceneTarget.texture, null, { extra: blurPing.texture })\n  out.end()\n  gpuCtx.submit()\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s18_post_process/renderer.ts' },
      { id: 's19_domain_warping', title: 's19 — domain warping', category: 'gpu_extra', tags: 'domain warping fbm distortion', description: 'Domain warping for organic, flowing procedural patterns.', code: `import { gpu, Uniform } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst warpShader = \`fn fbm(p: vec2f) -> f32 {\n  var v = 0.0; var a = 0.5;\n  var shift = vec2f(100.0);\n  var pp = p;\n  for (var i = 0; i < 5; i++) {\n    v += a * noise(pp);\n    pp = vec2f(pp.y * 1.6 + shift.x, pp.x * 1.6 + shift.y);\n    a *= 0.5;\n  }\n  return v;\n}\n\n@fragment fn f(@builtin(position> pos: vec4f) -> @location(0) vec4f {\n  let q = vec2f(fbm(pos.xy * 0.005), fbm(pos.xy * 0.005 + vec2f(5.2, 1.3)));\n  let r = vec2f(fbm(pos.xy * 0.005 + q * 4.0 + vec2f(1.7, 9.2)),\n                fbm(pos.xy * 0.005 + q * 4.0 + vec2f(8.3, 2.8)));\n  let f = fbm(pos.xy * 0.005 + r * 2.0);\n  return vec4f(f, f * 0.8, f * 0.6, 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s19_domain_warping/renderer.ts' },
      { id: 's20_texture_gen', title: 's20 — procedural textures', category: 'gpu_extra', tags: 'procedural texture generation', description: 'Generate textures entirely on the GPU with math.', code: `import { gpu, Uniform } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst textureShader = \`@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = pos.xy / resolution;\n  // Checkerboard\n  let check = fract(floor(uv.x * 16.0) + floor(uv.y * 16.0));\n  // Circle\n  let d = length(uv - 0.5);\n  let circle = smoothstep(0.3, 0.31, d);\n  // Stripe\n  let stripe = sin(uv.x * 60.0 + u.time) * 0.5 + 0.5;\n  // Mix\n  let col = mix(vec3f(check), vec3f(circle), 0.5);\n  col = mix(col, vec3f(stripe), 0.3);\n  return vec4f(col, 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s20_texture_gen/renderer.ts' },
      { id: 's21_edge_detect', title: 's21 — edge detection', category: 'gpu_extra', tags: 'edge detection sobel filter', description: 'GPU edge detection with Sobel and custom kernels.', code: `import { gpu, Texture } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst sceneTexture = Texture(gpuCtx, { width: 512, height: 512, format: 'rgba8unorm' })\n\nconst edgeShader = \`@group(0) @binding(0) var tex: texture_2d<f32>;\n@group(0) @binding(1) var samp: sampler;\n\nconst kernel_x = array<f32, 9>(-1, 0, 1, -2, 0, 2, -1, 0, 1);\nconst kernel_y = array<f32, 9>(-1, -2, -1, 0, 0, 0, 1, 2, 1);\n\n@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = pos.xy / resolution;\n  var gx = vec3f(0.0); var gy = vec3f(0.0);\n  for (var ky = -1; ky <= 1; ky++) {\n    for (var kx = -1; kx <= 1; kx++) {\n      let s = textureSample(tex, samp, uv + vec2f(f32(kx), f32(ky)) / resolution);\n      let ki = (ky + 1) * 3 + (kx + 1);\n      gx += s.rgb * kernel_x[ki];\n      gy += s.rgb * kernel_y[ki];\n    }\n  }\n  let edge = sqrt(gx * gx + gy * gy);\n  return vec4f(edge, 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s21_edge_detect/renderer.ts' },
      { id: 's22_color_palette', title: 's22 — color palette', category: 'gpu_extra', tags: 'color palette palette rotation', description: 'GPU color palette rotation for style transfer effects.', code: `import { gpu, Uniform, Texture } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst palette = Texture.fromData(gpuCtx, {\n  data: new Uint8Array([\n    255,0,0,255, 0,255,0,255, 0,0,255,255, 255,255,0,255,\n    255,0,255,255, 0,255,255,255, 128,128,0,255, 255,128,0,255,\n  ]),\n  width: 8, height: 1,\n  format: 'rgba8unorm',\n})\n\nconst paletteShader = \`@group(0) @binding(0) var tex: texture_2d<f32>;\n@group(0) @binding(1) var palTex: texture_2d<f32>;\n@group(0) @binding(2) var samp: sampler;\n@group(0) @binding(3) var<uniform> time: f32;\n\n@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = pos.xy / resolution;\n  let src = textureSample(tex, samp, uv);\n  let idx = (src.r * 7.0 + time) % 8.0;\n  let pal = textureSample(palTex, samp, vec2f((idx + 0.5) / 8.0, 0.5));\n  return vec4f(pal.rgb, 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/s22_color_palette/renderer.ts' },
      { id: 'cockpit', title: 'Cockpit: agent flight deck', category: 'agent', tags: 'cockpit status progress activity', description: 'Aircraft instrument panel showing agent status, CPU/GPU load, and event history.', code: `import { createApp, ref, onMounted } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const status = ref('working')\n    const progress = ref(64)\n    const activity = ref(42)\n    const gpuLoad = ref(78)\n    const memUsage = ref(3.2)\n    const events = ref([])\n\n    onMounted(() => {\n      const canvas = document.getElementById('cockpit-canvas')\n      const gpuCtx = gpu()\n      gpuCtx.configure({ canvas })\n      // Draw instrument panel\n      function drawPanel() {\n        const ctx = canvas.getContext('2d')\n        ctx.fillStyle = '#000'\n        ctx.fillRect(0, 0, canvas.width, canvas.height)\n        // Status ring, progress bar, load indicators\n        drawInstruments(ctx, { status, progress, gpuLoad, memUsage })\n      }\n      drawPanel()\n    })\n\n    return { status, progress, activity, gpuLoad, memUsage, events }\n  }\n}).mount('#cockpit')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/cockpit/renderer.ts' },
      { id: 'dashboard', title: 'Dashboard: operational metrics', category: 'agent', tags: 'dashboard metrics cards', description: 'Real-time dashboard with metric cards, charts, and status indicators.', code: `import { createApp, ref, computed } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const metrics = ref({\n      tasks: 42,\n      latency: 23,\n      throughput: 1200,\n      errors: 2,\n    })\n    const status = ref('working')\n    const progress = ref(64)\n\n    const chartData = computed(() =>\n      Array.from({ length: 20 }, (_, i) =>\n        Math.sin(Date.now() * 0.001 + i * 0.5) * 50 + 50\n      )\n    )\n\n    return { metrics, status, progress, chartData }\n  }\n}).mount('#dashboard')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/dashboard/renderer.ts' },
      { id: 'replay', title: 'Replay: event time travel', category: 'agent', tags: 'replay timeline events', description: 'Step through agent events forward and backward with full state inspection.', code: `import { createApp, ref, computed } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const events = ref([\n      { type: 'patch', state: 'thinking', progress: 0 },\n      { type: 'patch', state: 'working', progress: 30 },\n      { type: 'patch', state: 'working', progress: 65 },\n      { type: 'patch', state: 'success', progress: 100 },\n    ])\n    const cursor = ref(0)\n    const currentEvent = computed(() => events.value[cursor.value])\n\n    function prev() { cursor.value = Math.max(0, cursor.value - 1) }\n    function next() { cursor.value = Math.min(events.value.length - 1, cursor.value + 1) }\n\n    return { events, cursor, currentEvent, prev, next }\n  }\n}).mount('#replay')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/replay/renderer.ts' },
      { id: 'agent_animation', title: 'Agent animation states', category: 'agent', tags: 'agent animation states particles', description: 'Animated particle states showing agent transitions and status changes.', code: `import { createApp, ref, onMounted } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const status = ref('working')\n    const progress = ref(64)\n    const activity = ref(42)\n    const transitions = ref([])\n\n    onMounted(() => {\n      const canvas = document.getElementById('agent-canvas')\n      const gpuCtx = gpu()\n      gpuCtx.configure({ canvas })\n\n      function animate(t) {\n        drawAgent(canvas, t, { status, progress, activity })\n        requestAnimationFrame(animate)\n      }\n      requestAnimationFrame(animate)\n    })\n\n    watch(status, (newVal, oldVal) => {\n      transitions.value.unshift({ from: oldVal, to: newVal, time: Date.now() })\n    })\n\n    return { status, progress, activity, transitions }\n  }\n}).mount('#agent')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/agent_animation/renderer.ts' },
      { id: 'state_tools', title: 'State tools: patch + diff', category: 'agent', tags: 'state tools patch diff', description: 'JSON patch operations with visual diff for agent state management.', code: `import { createApp, ref, computed } from 'vue'\n\ncreateApp({\n  setup() {\n    const state = ref({ task: 'compile', status: 'working', progress: 50 })\n    const patches = ref([])\n    const diffs = ref([])\n\n    const patch = (newState) => {\n      const diff = computeDiff(state.value, newState)\n      patches.value.push(diff)\n      diffs.value.push({ time: Date.now(), diff })\n      state.value = { ...state.value, ...newState }\n    }\n\n    function computeDiff(a, b) {\n      const changes = []\n      for (const key in b) {\n        if (a[key] !== b[key]) changes.push({ op: 'replace', path: '/' + key, value: b[key] })\n      }\n      return changes\n    }\n\n    return { state, patches, diffs, patch }\n  }\n}).mount('#state')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/state_tools/renderer.ts' },
      { id: 'transmission', title: 'Transmission: GPU texture pass', category: 'advanced', tags: 'transmission texture render', description: 'GPU texture transmission for multi-render-pass compositing.', code: `import { gpu, RenderTarget, Texture } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst targetA = RenderTarget(gpuCtx, { width: 512, height: 512, format: 'rgba8unorm' })\nconst targetB = RenderTarget(gpuCtx, { width: 512, height: 512, format: 'rgba8unorm' })\n\n// Pass A: render scene to texture\nfunction passA() {\n  const pass = gpuCtx.beginPass({ target: targetA })\n  pass.setPipeline(scenePipeline)\n  pass.draw(6)\n  pass.end()\n}\n\n// Pass B: post-process from texture A to B\nfunction passB() {\n  const pass = gpuCtx.beginPass({ target: targetB })\n  pass.setPipeline(postPipeline)\n  pass.setBindGroup(0, targetA.bindGroup)\n  pass.draw(3)\n  pass.end()\n}\n\n// Pass C: composite to screen\nfunction passC() {\n  const pass = gpuCtx.beginPass({ canvas })\n  pass.setPipeline(compositePipeline)\n  pass.setBindGroup(0, targetB.bindGroup)\n  pass.draw(3)\n  pass.end()\n}\n\ngpuCtx.submit()`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/transmission/renderer.ts' },
      { id: 'fluid', title: 'Fluid simulation', category: 'advanced', tags: 'fluid simulation navier stokes', description: 'Navier-Stokes fluid simulation running entirely on the GPU.', code: `import { gpu, pingPong } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst N = 512\nconst velocity = pingPong(gpuCtx, N, N, { format: 'rgba16float' })\nconst pressure = pingPong(gpuCtx, N, N, { format: 'rgba16float' })\nconst divergence = pingPong(gpuCtx, N, N, { format: 'rgba16float' })\n\nconst advect = gpuCtx.device.createComputePipeline({ ... })\nconst divergenceCompute = gpuCtx.device.createComputePipeline({ ... })\nconst pressureSolve = gpuCtx.device.createComputePipeline({ ... })\nconst gradientSubtract = gpuCtx.device.createComputePipeline({ ... })\n\nfunction simulate(dt) {\n  // Advect velocity\n  // Compute divergence\n  // Jacobi pressure solve (20 iterations)\n  // Subtract gradient\n  // Advect dye\n  velocity.swap()\n  pressure.swap()\n}`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/fluid/renderer.ts' },
      { id: 'gallery', title: 'Gallery: example showcase', category: 'advanced', tags: 'gallery showcase examples', description: 'Interactive gallery showcasing all AIGpu rendering capabilities.', code: `import { createApp, ref } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const examples = ref([\n      { id: 'fullscreen', name: 'Fullscreen Triangle' },\n      { id: 'shared_uniforms', name: 'Shared Uniforms' },\n      { id: 'compute', name: 'Compute Shaders' },\n      { id: 'raymarching', name: 'Raymarching' },\n    ])\n    const active = ref('fullscreen')\n\n    function select(id) {\n      active.value = id\n    }\n\n    return { examples, active, select }\n  }\n}).mount('#gallery')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/gallery/renderer.ts' },
      { id: 'lava', title: 'Lava: procedural fire flow', category: 'advanced', tags: 'lava fire procedural flow', description: 'Procedural lava with turbulent flow and heat dissipation.', code: `import { gpu, pingPong, Uniform } from 'aigpu'\n\nconst gpuCtx = gpu()\nawait gpuCtx.configure({ canvas })\n\nconst N = 256\nconst heat = pingPong(gpuCtx, N, N, { format: 'rgba16float' })\nconst time = Uniform(gpuCtx.device, { size: 16 })\n\nconst lavaShader = \`@group(0) @binding(0) var tex: texture_2d<f32>;\n@group(0) @binding(1) var samp: sampler;\n@group(0) @binding(2) var<uniform> time: f32;\n\n@fragment fn f(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = pos.xy / resolution;\n  let h = textureSample(tex, samp, uv).r;\n  let flow = fbm(uv * 3.0 + vec2f(time * 0.1, -time * 0.2));\n  let temp = h + flow * 0.3;\n  let r = smoothstep(0.2, 0.8, temp);\n  let g = smoothstep(0.4, 0.9, temp) * 0.5;\n  let b = smoothstep(0.6, 1.0, temp) * 0.2;\n  return vec4f(r, g, b, 1);\n}\`;`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/lava/renderer.ts' },
      { id: 'mesh_edit', title: 'Mesh editor', category: 'advanced', tags: 'mesh editor vertices edges', description: 'Interactive mesh editor with vertex manipulation on the GPU.', code: `import { createApp, ref } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const vertices = ref([\n      { x: 0, y: 0, z: 0 },\n      { x: 1, y: 0, z: 0 },\n      { x: 0.5, y: 1, z: 0 },\n    ])\n    const edges = ref([[0, 1], [1, 2], [2, 0]])\n    const selected = ref(-1)\n\n    function selectVertex(i) { selected.value = i }\n    function moveSelected(dx, dy) {\n      if (selected.value >= 0) {\n        vertices.value[selected.value].x += dx\n        vertices.value[selected.value].y += dy\n      }\n    }\n\n    return { vertices, edges, selected, selectVertex, moveSelected }\n  }\n}).mount('#mesh')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/mesh_edit/renderer.ts' },
      { id: 'dom_mount', title: 'DOM mount: hybrid rendering', category: 'advanced', tags: 'dom mount hybrid html', description: 'Hybrid GPU + DOM rendering with CSS transform overlays.', code: `import { createApp, ref, onMounted } from 'vue'\nimport { gpu } from 'aigpu'\n\ncreateApp({\n  setup() {\n    const overlays = ref([])\n    const canvasRef = ref(null)\n\n    onMounted(() => {\n      const canvas = canvasRef.value\n      const gpuCtx = gpu()\n      gpuCtx.configure({ canvas })\n\n      // GPU renders base layer\n      // DOM overlays positioned via CSS transforms\n      function updateOverlays() {\n        const state = getState()\n        overlays.value = state.particles.map(p => ({\n          x: p.x, y: p.y,\n          label: p.label,\n          style: { transform: \`translate(\${p.x}px, \${p.y}px)\` }\n        }))\n      }\n    })\n\n    return { overlays, canvasRef }\n  }\n}).mount('#dom')`, source: 'https://github.com/hautlys/AIGpu/blob/main/examples/dom_mount/renderer.ts' },
    ]);

    const frameworks = ref([
      { id: 'vue', name: 'Vue 3', lang: 'Vue SFC', desc: 'Reactive refs drive GPU state. Single-file components with Composition API.', code: `<!-- AIGpuAgent.vue -->\n<template>\n  <div class="agent">\n    <canvas ref="canvasRef" width="400" height="300" />\n    <div class="controls">\n      <select v-model="status">\n        <option>idle</option>\n        <option>thinking</option>\n        <option>working</option>\n        <option>success</option>\n        <option>error</option>\n      </select>\n      <input type="range" v-model.number="progress" min="0" max="100" />\n    </div>\n  </div>\n</template>\n\n<script setup>\nimport { ref, onMounted, watch } from 'vue'\nimport { gpu } from 'aigpu'\n\nconst canvasRef = ref(null)\nconst status = ref('working')\nconst progress = ref(64)\nconst activity = ref(42)\n\nlet gpuCtx = null\nlet pipeline = null\nlet uniformBuffer = null\n\nonMounted(() => {\n  gpuCtx = gpu()\n  gpuCtx.configure({ canvas: canvasRef.value })\n\n  uniformBuffer = gpuCtx.device.createBuffer({\n    size: 32,\n    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n  })\n\n  pipeline = gpuCtx.device.createRenderPipeline({\n    layout: 'auto',\n    vertex: {\n      module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n      entryPoint: 'main',\n    },\n    fragment: {\n      module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n      entryPoint: 'main',\n      targets: [{ format: gpuCtx.format }],\n    },\n  })\n\n  render()\n})\n\nwatch([status, progress, activity], () => {\n  gpuCtx.device.queue.writeBuffer(\n    uniformBuffer, 0,\n    new Float32Array([\n      statusToFloat(status.value),\n      progress.value / 100,\n      activity.value / 100,\n      performance.now() / 1000,\n    ])\n  )\n})\n\nfunction render() {\n  const pass = gpuCtx.beginPass({ canvas: canvasRef.value })\n  pass.setPipeline(pipeline)\n  pass.setBindGroup(0, bindGroup)\n  pass.draw(3)\n  pass.end()\n  gpuCtx.submit()\n  requestAnimationFrame(render)\n}\n\nfunction statusToFloat(s) {\n  return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] || 0\n}\n</script>` },
      { id: 'react', name: 'React', lang: 'TSX', desc: 'useRef for canvas. useEffect for lifecycle. GPU state via props/callbacks.', code: `// AIGpuAgent.tsx\nimport { useRef, useEffect, useState, useCallback } from 'react'\nimport { gpu } from 'aigpu'\n\ninterface AgentProps {\n  initialStatus?: string\n  onStatusChange?: (status: string) => void\n}\n\nexport function AIGpuAgent({\n  initialStatus = 'working',\n  onStatusChange,\n}: AgentProps) {\n  const canvasRef = useRef<HTMLCanvasElement>(null)\n  const gpuRef = useRef<ReturnType<typeof gpu> | null>(null)\n  const [status, setStatus] = useState(initialStatus)\n  const [progress, setProgress] = useState(64)\n  const [activity, setActivity] = useState(42)\n\n  useEffect(() => {\n    if (!canvasRef.current) return\n\n    const gpuCtx = gpu()\n    gpuRef.current = gpuCtx\n\n    gpuCtx.configure({ canvas: canvasRef.current })\n\n    const uniformBuffer = gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    const pipeline = gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: gpuCtx.format }],\n      },\n    })\n\n    let animId: number\n    function render() {\n      const pass = gpuCtx.beginPass({ canvas: canvasRef.current! })\n      pass.setPipeline(pipeline)\n      pass.draw(3)\n      pass.end()\n      gpuCtx.submit()\n      animId = requestAnimationFrame(render)\n    }\n    render()\n\n    return () => {\n      cancelAnimationFrame(animId)\n      gpuCtx.device.destroy()\n    }\n  }, [])\n\n  useEffect(() => {\n    if (!gpuRef.current) return\n    gpuRef.current.device.queue.writeBuffer(\n      uniformBuffer, 0,\n      new Float32Array([\n        statusToFloat(status),\n        progress / 100,\n        activity / 100,\n        performance.now() / 1000,\n      ])\n    )\n  }, [status, progress, activity])\n\n  const handleStatusChange = useCallback((e) => {\n    const newStatus = e.target.value\n    setStatus(newStatus)\n    onStatusChange?.(newStatus)\n  }, [onStatusChange])\n\n  return (\n    <div className="agent">\n      <canvas ref={canvasRef} width={400} height={300} />\n      <div className="controls">\n        <select value={status} onChange={handleStatusChange}>\n          <option value="idle">idle</option>\n          <option value="thinking">thinking</option>\n          <option value="working">working</option>\n          <option value="success">success</option>\n          <option value="error">error</option>\n        </select>\n        <input\n          type="range"\n          min={0}\n          max={100}\n          value={progress}\n          onChange={(e) => setProgress(Number(e.target.value))}\n        />\n      </div>\n    </div>\n  )\n}\n\nfunction statusToFloat(s: string): number {\n  return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] ?? 0\n}` },
      { id: 'purejs', name: 'Pure JS', lang: 'JavaScript', desc: 'Zero dependencies. Direct GPU API. Works anywhere with WebGPU.', code: `// agent.js\nimport { gpu } from 'aigpu'\n\nclass AIGpuAgent {\n  constructor(canvas, options = {}) {\n    this.canvas = canvas\n    this.status = options.status || 'idle'\n    this.progress = options.progress || 0\n    this.activity = options.activity || 0\n\n    this.gpuCtx = gpu()\n    this.gpuCtx.configure({ canvas })\n\n    this.uniformBuffer = this.gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    this.pipeline = this.gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: this.gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: this.gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: this.gpuCtx.format }],\n      },\n    })\n\n    this.render()\n  }\n\n  patch(state) {\n    if (state.status !== undefined) this.status = state.status\n    if (state.progress !== undefined) this.progress = state.progress\n    if (state.activity !== undefined) this.activity = state.activity\n\n    this.gpuCtx.device.queue.writeBuffer(\n      this.uniformBuffer, 0,\n      new Float32Array([\n        this._statusToFloat(this.status),\n        this.progress / 100,\n        this.activity / 100,\n        performance.now() / 1000,\n      ])\n    )\n  }\n\n  render() {\n    const pass = this.gpuCtx.beginPass({ canvas: this.canvas })\n    pass.setPipeline(this.pipeline)\n    pass.setBindGroup(0, this.bindGroup)\n    pass.draw(3)\n    pass.end()\n    this.gpuCtx.submit()\n    this._rafId = requestAnimationFrame(() => this.render())\n  }\n\n  destroy() {\n    cancelAnimationFrame(this._rafId)\n    this.gpuCtx.device.destroy()\n  }\n\n  _statusToFloat(s) {\n    return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] ?? 0\n  }\n}\n\n// Usage\nconst agent = new AIGpuAgent(document.querySelector('canvas'))\nagent.patch({ status: 'working', progress: 50 })\n\n// Accepts plain objects — no framework needed\nws.onmessage = (e) => agent.patch(JSON.parse(e.data))` },
      { id: 'svelte', name: 'Svelte', lang: 'Svelte', desc: 'Reactive statements auto-sync GPU state. Compile-time optimized.', code: `<!-- AIGpuAgent.svelte -->\n<script>\n  import { onMount, onDestroy } from 'svelte'\n  import { gpu } from 'aigpu'\n\n  export let status = 'working'\n  export let progress = 64\n  export let activity = 42\n\n  let canvas\n  let gpuCtx\n  let pipeline\n  let uniformBuffer\n  let bindGroup\n  let rafId\n\n  onMount(() => {\n    gpuCtx = gpu()\n    gpuCtx.configure({ canvas })\n\n    uniformBuffer = gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    pipeline = gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: gpuCtx.format }],\n      },\n    })\n\n    bindGroup = gpuCtx.device.createBindGroup({\n      layout: pipeline.getBindGroupLayout(0),\n      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],\n    })\n\n    render()\n  })\n\n  onDestroy(() => {\n    cancelAnimationFrame(rafId)\n    gpuCtx?.device?.destroy()\n  })\n\n  // Reactive: auto-update GPU when state changes\n  $: if (gpuCtx && uniformBuffer) {\n    gpuCtx.device.queue.writeBuffer(\n      uniformBuffer, 0,\n      new Float32Array([\n        statusToFloat(status),\n        progress / 100,\n        activity / 100,\n        performance.now() / 1000,\n      ])\n    )\n  }\n\n  function render() {\n    const pass = gpuCtx.beginPass({ canvas })\n    pass.setPipeline(pipeline)\n    pass.setBindGroup(0, bindGroup)\n    pass.draw(3)\n    pass.end()\n    gpuCtx.submit()\n    rafId = requestAnimationFrame(render)\n  }\n\n  function statusToFloat(s) {\n    return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] ?? 0\n  }\n</script>\n\n<div class="agent">\n  <canvas bind:this={canvas} width="400" height="300" />\n  <div class="controls">\n    <select bind:value={status}>\n      <option value="idle">idle</option>\n      <option value="thinking">thinking</option>\n      <option value="working">working</option>\n      <option value="success">success</option>\n      <option value="error">error</option>\n    </select>\n    <input type="range" min="0" max="100" bind:value={progress} />\n  </div>\n</div>` },
    ]);

    const filteredExamples = computed(() => {
      let list = examples.value;
      if (filter.value !== 'all') list = list.filter((e) => e.category === filter.value);
      if (search.value) {
        const q = search.value.toLowerCase();
        list = list.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.includes(q));
      }
      return list;
    });

    function examplesByCategory(cat) {
      return examples.value.filter((e) => e.category === cat);
    }

    let eventIndex = 0;
    const events = [
      { type: 'patch', state: 'thinking', progress: 10, activity: 25 },
      { type: 'patch', state: 'working', progress: 35, activity: 60 },
      { type: 'patch', state: 'working', progress: 55, activity: 78 },
      { type: 'patch', state: 'working', progress: 72, activity: 42 },
      { type: 'patch', state: 'success', progress: 100, activity: 0 },
      { type: 'patch', state: 'error', progress: 33, activity: 10 },
    ];

    function applyPatch() {
      const entry = { status: status.value, progress: progress.value, activity: activity.value, time: new Date().toLocaleTimeString() };
      eventLog.value = `> patch ${JSON.stringify(entry)}\n` + eventLog.value;
    }

    function nextEvent() {
      const e = events[eventIndex % events.length];
      status.value = e.state;
      progress.value = e.progress;
      activity.value = e.activity;
      eventLog.value = `> replay[${eventIndex % events.length}] ${e.type} → ${e.state} ${e.progress}%\n` + eventLog.value;
      eventIndex++;
    }

    function copyCode(code, event) {
      navigator.clipboard.writeText(code).then(() => {
        const btn = event.target;
        btn.classList.add('copied');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'Copy source'; }, 1600);
      });
    }

    function openExample(ex) {
      modalType.value = 'example';
      modalExample.value = ex;
      modalOpen.value = true;
      nextTick(() => {
        const canvases = document.querySelectorAll('.modal-canvas');
        canvases.forEach((c) => drawCanvas(c, ex.id, performance.now(), { status: status.value, progress: progress.value }));
      });
    }

    function openFramework(fw) {
      modalType.value = 'framework';
      modalFramework.value = fw;
      modalOpen.value = true;
      nextTick(() => {
        const canvases = document.querySelectorAll('.integration-canvas-large');
        canvases.forEach((c) => drawCanvas(c, 'fw_' + fw.id, performance.now(), { status: status.value, progress: progress.value }));
      });
    }

    function closeModal() {
      modalOpen.value = false;
      modalExample.value = null;
      modalFramework.value = null;
    }

    let mainRaf;
    function animateAll(time) {
      document.querySelectorAll('[data-visual]').forEach((canvas) => {
        const visualId = canvas.getAttribute('data-visual');
        if (canvas.id === 'playground-canvas') {
          drawCanvas(canvas, 'playground', time, { status: status.value, progress: progress.value });
        } else {
          drawCanvas(canvas, visualId, time, { status: status.value, progress: progress.value });
        }
      });
      mainRaf = requestAnimationFrame(animateAll);
    }

    onMounted(() => {
      mainRaf = requestAnimationFrame(animateAll);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOpen.value) closeModal();
      });
    });

    onUnmounted(() => {
      cancelAnimationFrame(mainRaf);
    });

    return { status, progress, activity, filter, search, categories, examples, filteredExamples, frameworks, eventLog, modalOpen, modalType, modalExample, modalFramework, applyPatch, nextEvent, copyCode, openExample, openFramework, closeModal, examplesByCategory };
  },
}).mount('#app');
