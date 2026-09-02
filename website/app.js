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

const asciiBlackHole = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const chars = '·:.:=+*#%@';
  for (let i = 0; i < 200; i++) {
    const angle = (i / 200) * Math.PI * 2;
    const dist = 20 + Math.abs(Math.sin(angle * 3 + t)) * 100;
    const warp = Math.sin(t * 0.5) * 0.3;
    const x = cx + Math.cos(angle + warp) * dist;
    const y = cy + Math.sin(angle + warp) * dist * 0.6;
    const ci = Math.floor((dist / 120) * (chars.length - 1));
    ctx.fillStyle = `rgba(255,255,255,${0.1 + (1 - dist / 120) * 0.5})`;
    ctx.font = `${8 + Math.floor(dist / 30)}px monospace`;
    ctx.fillText(chars[ci], x, y);
  }
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '10px monospace';
  ctx.fillText('EVENT HORIZON', cx - 35, cy + 35);
};

const asciiEarth = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.35;
  const chars = ' .:-=+*#%@';
  const offset = t * 0.3;
  for (let y = -r; y < r; y += 6) {
    for (let x = -r; x < r; x += 6) {
      if (x * x + y * y > r * r) continue;
      const lat = Math.asin(y / r);
      const lon = Math.atan2(x, Math.sqrt(r * r - x * x - y * y)) + offset;
      const land = Math.sin(lon * 3) * Math.cos(lat * 4) > 0.2;
      const night = Math.cos(lon + offset) < -0.2;
      const val = land ? (night ? 0.2 : 0.7) : 0.1;
      const ci = Math.floor(val * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.1 + val * 0.5})`;
      ctx.font = '6px monospace';
      ctx.fillText(chars[ci], cx + x, cy + y);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '10px monospace';
  ctx.fillText('PROCEDURAL PLANET', 10, h - 10);
};

const asciiInstanced = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cols = 12, rows = 8;
  const cellW = w / cols, cellH = h / rows;
  const chars = ['+--+', '|##|', '+--+'];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ox = Math.sin(t * 2 + x * 0.5 + y * 0.3) * 4;
      const oy = Math.cos(t * 1.5 + y * 0.5 + x * 0.3) * 4;
      const alpha = 0.15 + Math.abs(Math.sin(t + x + y)) * 0.35;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = '10px monospace';
      for (let row = 0; row < 3; row++) {
        ctx.fillText(chars[row], x * cellW + ox + 4, y * cellH + row * 12 + oy + 12);
      }
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '10px monospace';
  ctx.fillText(`INSTANCES: ${cols * rows}`, 10, h - 10);
};

const asciiOcean = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cols = 50, rows = 20;
  const cellW = w / cols, cellH = h / rows;
  const chars = ' .·:ⁱパーテblings░▒▓';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wave = Math.sin(x * 0.15 + t * 1.5 + y * 0.1) * 0.5 + 0.5;
      const foam = Math.abs(Math.sin(x * 0.3 + t * 2)) > 0.9 ? 0.8 : 0;
      const val = Math.min(1, wave + foam);
      const ci = Math.floor(val * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.05 + val * 0.45})`;
      ctx.font = `${cellH - 2}px monospace`;
      ctx.fillText(chars[ci], x * cellW + 1, y * cellH + cellH - 2);
    }
  }
};

const asciiFractal = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const chars = '·.:;i1tfLCG08#';
  for (let i = 0; i < 400; i++) {
    const a = i * 0.1 + t * 0.5;
    const r = i * 0.4 + Math.sin(a * 3) * 20;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (x < 0 || x > w || y < 0 || y > h) continue;
    const ci = i % chars.length;
    const alpha = Math.max(0.05, 0.6 - i * 0.0015);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = `${8 + (i % 5)}px monospace`;
    ctx.fillText(chars[ci], x, y);
  }
};

const asciiTransmission = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const chars = '·:.:=+*#%@';
  const size = Math.min(w, h) * 0.3;
  for (let y = -size; y < size; y += 7) {
    for (let x = -size; x < size; x += 7) {
      const inBox = Math.abs(x) < size * 0.6 && Math.abs(y) < size * 0.6;
      const refractX = x + Math.sin(t + y * 0.05) * 8;
      const refractY = y + Math.cos(t + x * 0.05) * 8;
      const val = Math.sin(refractX * 0.08 + t) * Math.cos(refractY * 0.08) * 0.5 + 0.5;
      const ci = Math.floor(val * (chars.length - 1));
      const alpha = inBox ? 0.3 + val * 0.4 : 0.08 + val * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = '7px monospace';
      ctx.fillText(chars[ci], cx + x, cy + y);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - size * 0.6, cy - size * 0.6, size * 1.2, size * 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '10px monospace';
  ctx.fillText('SCREEN-SPACE REFRACTION', 10, h - 10);
};

const asciiRadiance = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const chars = '·:.:=+*#%@';
  for (let cascade = 0; cascade < 6; cascade++) {
    const r = 20 + cascade * 25;
    const segments = 16 + cascade * 8;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 + t * 0.3 * (cascade % 2 ? 1 : -1);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const ci = cascade % chars.length;
      const alpha = 0.1 + (cascade / 6) * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = `${9 + cascade}px monospace`;
      ctx.fillText(chars[ci], x, y);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = '10px monospace';
  ctx.fillText('6-CASCADE GI', 10, h - 10);
};

const asciiDepthMap = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cols = 32, rows = 18;
  const cellW = w / cols, cellH = h / rows;
  const chars = ' ·∶:░▒▓█';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const depth = Math.sin(x * 0.2 + t * 0.5) * Math.cos(y * 0.25 + t * 0.3) * 0.5 + 0.5;
      const ci = Math.floor(depth * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.08 + depth * 0.5})`;
      ctx.font = `${cellH - 2}px monospace`;
      ctx.fillText(chars[ci], x * cellW + 2, y * cellH + cellH - 2);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '10px monospace';
  ctx.fillText('DEPTH ESTIMATION // ONNX', 10, h - 10);
};

const asciiClipping = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.35;
  const chars = '·:.:=+*#%@';
  const clipY = Math.sin(t * 0.8) * r * 0.6;
  for (let y = -r; y < r; y += 7) {
    for (let x = -r; x < r; x += 7) {
      if (x * x + y * y > r * r) continue;
      if (y > clipY) continue;
      const val = (Math.sin(x * 0.1 + t) * Math.cos(y * 0.1) * 0.5 + 0.5);
      const ci = Math.floor(val * (chars.length - 1));
      ctx.fillStyle = `rgba(255,255,255,${0.1 + val * 0.45})`;
      ctx.font = '7px monospace';
      ctx.fillText(chars[ci], cx + x, cy + y);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + clipY);
  ctx.lineTo(cx + r, cy + clipY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '10px monospace';
  ctx.fillText('SDF CLIPPING PLANE', 10, h - 10);
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

/* ==================== HAUTLY ENTITY RENDERERS ==================== */

const hautlyNoise = (x, y, s) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + s * 43.5453) * 43758.5453;
  return n - Math.floor(n);
};

const hautlySmoothNoise = (x, y, t) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = hautlyNoise(ix, iy, t), b = hautlyNoise(ix + 1, iy, t);
  const c = hautlyNoise(ix, iy + 1, t), d = hautlyNoise(ix + 1, iy + 1, t);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

const HAUTLY_MOOD_COLORS = {
  idle:      { core: [100, 200, 255], ring: [60, 120, 200],  aura: [30, 80, 160],   eye: [255, 255, 255], particle: [150, 200, 255] },
  listening: { core: [120, 220, 180], ring: [60, 180, 120],  aura: [30, 100, 60],   eye: [255, 255, 200], particle: [150, 255, 200] },
  thinking:  { core: [180, 140, 255], ring: [120, 80, 220],  aura: [80, 40, 160],   eye: [255, 240, 255], particle: [200, 160, 255] },
  speaking:  { core: [255, 200, 80],  ring: [220, 160, 40],  aura: [160, 100, 20],  eye: [255, 255, 220], particle: [255, 220, 120] },
  excited:   { core: [255, 100, 120], ring: [255, 60, 80],   aura: [200, 30, 50],   eye: [255, 255, 255], particle: [255, 150, 160] },
  sleepy:    { core: [120, 140, 180], ring: [80, 100, 140],  aura: [50, 60, 90],    eye: [180, 200, 220], particle: [100, 120, 160] },
  error:     { core: [255, 60, 60],   ring: [200, 30, 30],   aura: [150, 20, 20],   eye: [255, 200, 200], particle: [255, 100, 100] },
  healing:   { core: [100, 255, 150], ring: [60, 200, 100],  aura: [30, 150, 60],   eye: [220, 255, 230], particle: [150, 255, 180] },
};

const HAUTLY_PARTICLE_CHARS = {
  idle: ['.', '+', '~'], listening: ['o', 'O', '.'], thinking: ['?', '.', '\u00b7'],
  speaking: ['~', '!', '*'], excited: ['*', '!', '+', '#'], sleepy: ['z', 'Z', '.'],
  error: ['!', 'x', '#'], healing: ['+', '*', 'o'],
};

const HAUTLY_FORM_CHARS = {
  idle: ' .,:;i1tfLCG08#',
  thinking: ' \u00b7\u2236:\u2591\u2592\u2593\u2588',
  speaking: ' .oO0@*#',
  excited: ' *+.#@%&',
  sleepy: ' .\u00b7\u00b7::---',
  error: ' !@#$%^&',
  healing: ' +*.:oO@',
};

let hautlyMouseX = 0, hautlyMouseY = 0, hautlyMouseOver = false;

function drawHautlyOrb(ctx, w, h, t, state) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.28;
  const breathScale = 1 + Math.sin(t * 1.2 * Math.PI * 2) * 0.04;
  const pulse = Math.pow(Math.sin(t * Math.PI * 2) * 0.5 + 0.5, 3);
  const colors = HAUTLY_MOOD_COLORS[state.mood] || HAUTLY_MOOD_COLORS.idle;

  // Mouse attraction
  let mx = 0, my = 0;
  if (hautlyMouseOver) {
    const mdx = (hautlyMouseX - cx) / r;
    const mdy = (hautlyMouseY - cy) / r;
    const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
    if (mdist > 0.01) {
      mx = (mdx / mdist) * Math.min(0.06, mdist * 0.03);
      my = (mdy / mdist) * Math.min(0.06, mdist * 0.03);
    }
  }

  // Eye direction based on mouse
  let eyeOffX = mx * 2, eyeOffY = my * 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (r * breathScale) + mx;
      const dy = (y - cy) / (r * breathScale) + my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Core orb
      if (dist < 1.0) {
        // Eyes
        const eyeY = -0.05;
        const eyeSize = 0.08;
        if (Math.abs(dy - eyeY) < eyeSize && dist < 0.4) {
          const le = Math.abs(dx - 0.15) < 0.1;
          const re = Math.abs(dx + 0.15) < 0.1;
          if (le || re) {
            const ex = le ? 0.15 : -0.15;
            const inPupil = Math.abs(dx - ex - eyeOffX * 0.04) < 0.035 && Math.abs(dy - eyeY - eyeOffY * 0.04) < 0.035;
            if (inPupil) {
              ctx.fillStyle = `rgb(0,0,0)`;
              ctx.fillRect(x, y, 1, 1);
              continue;
            }
            ctx.fillStyle = `rgba(${colors.eye.join(',')}, 0.9)`;
            ctx.fillRect(x, y, 1, 1);
            continue;
          }
        }

        // Ring
        const ringDist = Math.abs(dist - 0.82);
        if (ringDist < 0.06) {
          const ci = Math.floor(((angle / Math.PI + 1) * 0.5 + t * 0.5) * 10) % 10;
          const ch = '\u00b7:;|=+*#%@'[ci];
          ctx.fillStyle = `rgba(${colors.ring.join(',')}, 0.8)`;
          ctx.font = `${Math.max(8, Math.floor(r * 0.06))}px monospace`;
          ctx.fillText(ch, x, y);
          continue;
        }

        // Core body
        const glow = Math.pow(1 - dist, 0.5);
        const ci = Math.floor(glow * (HAUTLY_FORM_CHARS[state.mood] || HAUTLY_FORM_CHARS.idle).length * 0.8);
        const chars = HAUTLY_FORM_CHARS[state.mood] || HAUTLY_FORM_CHARS.idle;
        const ch = chars[Math.min(ci, chars.length - 1)];
        const intensity = 0.3 + glow * 0.5 + pulse * 0.2;
        ctx.fillStyle = `rgba(${colors.core.join(',')}, ${intensity})`;
        ctx.font = `${Math.max(7, Math.floor(r * 0.055))}px monospace`;
        ctx.fillText(ch, x, y);
        continue;
      }

      // Outer glow / aura
      if (dist < 1.7) {
        const auraAlpha = Math.max(0, 1 - (dist - 1.0) / 0.7) * (0.3 + Math.sin(t * 1.2 * Math.PI * 2) * 0.2);
        const n = hautlySmoothNoise(x * 0.15, y * 0.15, t * 0.6);
        if (n < auraAlpha * 0.7) {
          const ci = Math.floor(n * 5);
          ctx.fillStyle = `rgba(${colors.aura.join(',')}, ${auraAlpha * 0.6})`;
          ctx.font = `${Math.max(7, Math.floor(r * 0.04))}px monospace`;
          ctx.fillText('\u00b7.:*+'[ci], x, y);
          continue;
        }
      }

      // Particles orbiting
      for (let p = 0; p < 12; p++) {
        const pa = (p / 12) * Math.PI * 2 + t * (0.3 + p * 0.05);
        const pr = 1.1 + Math.sin(t * 0.8 + p) * 0.15;
        const px = cx + Math.cos(pa) * pr * r - mx * r;
        const py = cy + Math.sin(pa) * pr * r - my * r;
        if (Math.abs(x - px) < 1.2 && Math.abs(y - py) < 1.2) {
          const pchars = HAUTLY_PARTICLE_CHARS[state.mood] || HAUTLY_PARTICLE_CHARS.idle;
          ctx.fillStyle = `rgba(${colors.particle.join(',')}, ${0.3 + Math.abs(Math.sin(t + p * 0.5)) * 0.5})`;
          ctx.font = `${9 + (p % 3)}px monospace`;
          ctx.fillText(pchars[p % pchars.length], x, y);
          break;
        }
      }
    }
  }
}

const HAUTLY_MOCK_RESPONSES = [
  "I see you're working on something interesting!",
  "The code looks clean. Nice patterns.",
  "I'm analyzing the structure...",
  "Found 3 potential improvements.",
  "Ready to help when you need me.",
  "That's a clever approach to the problem.",
  "I notice the imports could be optimized.",
  "The type safety here is solid.",
  "Want me to review the tests?",
  "This architecture scales well.",
];

/* ==================== CANVAS MAP ==================== */

const drawCanvas = (canvas, rendererId, time, state) => {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (!ctx) return;
  const t = time * 0.001;
  const renderers = {
    hero: () => drawHautlyOrb(ctx, w, h, t, { mood: state.status === 'working' ? 'speaking' : state.status === 'thinking' ? 'thinking' : state.status === 'success' ? 'excited' : state.status === 'error' ? 'error' : 'idle', form: 'orb' }),
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
    fw_nextjs: () => asciiWave(ctx, w, h, t, '~/\\'),
    fw_threetsl: () => asciiGrid(ctx, w, h, t, { cols: 16, rows: 8, chars: '{}' }),
    fw_nextjs: () => asciiWave(ctx, w, h, t, '~/\\'),
    fw_threetsl: () => asciiGrid(ctx, w, h, t, { cols: 16, rows: 8, chars: '{}' }),
    vgpu_gradient: () => asciiWave(ctx, w, h, t, '.:;-=+*#%@'),
    vgpu_triangle_led: () => asciiParticles(ctx, w, h, t, { count: 80, chars: '/\\|' }),
    vgpu_anti_aliasing: () => asciiGrid(ctx, w, h, t, { cols: 20, rows: 10, chars: '::--++' }),
    vgpu_black_hole: () => asciiBlackHole(ctx, w, h, t),
    vgpu_optimized_black_hole: () => asciiBlackHole(ctx, w, h, t),
    vgpu_earth: () => asciiEarth(ctx, w, h, t),
    vgpu_fluid_sim: () => asciiFire(ctx, w, h, t),
    vgpu_instanced: () => asciiInstanced(ctx, w, h, t),
    vgpu_batch: () => asciiInstanced(ctx, w, h, t),
    vgpu_fft_ocean: () => asciiOcean(ctx, w, h, t),
    vgpu_fft_surface: () => asciiOcean(ctx, w, h, t),
    vgpu_raymarch_fractal: () => asciiFractal(ctx, w, h, t),
    vgpu_glass_fractal: () => asciiFractal(ctx, w, h, t),
    vgpu_env_map: () => asciiRings(ctx, w, h, t, 'idle'),
    vgpu_transmission: () => asciiTransmission(ctx, w, h, t),
    vgpu_clipping: () => asciiClipping(ctx, w, h, t),
    vgpu_radiance: () => asciiRadiance(ctx, w, h, t),
    vgpu_agent_radiance: () => asciiRadiance(ctx, w, h, t),
    vgpu_depth: () => asciiDepthMap(ctx, w, h, t),
    vgpu_mnist: () => asciiGrid(ctx, w, h, t, { cols: 12, rows: 12, chars: '0123456789' }),
    vgpu_particle_orbit: () => asciiSpiral(ctx, w, h, t),
    hautly: () => drawHautlyOrb(ctx, w, h, t, { mood: 'idle', form: 'orb' }),
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

    // Hautly entity state
    const hautlyMood = ref('idle');
    const hautlyForm = ref('orb');
    const hautlyEnergy = ref(0.5);
    const hautlySpeech = ref('');
    const hautlySpeechVisible = ref('');
    const hautlyTyping = ref(false);
    const hautlyAgent = ref('opencode');
    const hautlyChatLog = ref([
      { role: 'hautly', text: 'Hello! I am Hautly, your alive orb companion. Click me or pick a mood.' },
    ]);
    let hautlyTypeTimer = null;
    let hautlySpeechTimer = null;

    const hautlyForms = ['orb', 'crystal', 'jelly', 'phoenix', 'nebula'];
    const hautlyMoods = ['idle', 'listening', 'thinking', 'speaking', 'excited', 'sleepy', 'error', 'healing'];

    // Hautly gallery items
    const hautlyGallery = computed(() => {
      const items = [];
      for (const form of hautlyForms) {
        for (const mood of ['idle', 'thinking', 'speaking', 'excited']) {
          items.push({ form, mood });
        }
      }
      return items;
    });

    function hautlySetForm(f) {
      hautlyForm.value = f;
    }

    function hautlySetMood(m) {
      hautlyMood.value = m;
    }

    function hautlySpeak() {
      const msgs = [
        "Hello! I'm alive and breathing.",
        "The codebase looks great today.",
        "I'm tracking your mouse cursor!",
        "Ready to assist with anything.",
        "GPU-accelerated ASCII art at your service.",
      ];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      hautlyShowSpeech(msg);
      hautlyChatLog.value.push({ role: 'user', text: msg });
      setTimeout(() => {
        const reply = HAUTLY_MOCK_RESPONSES[Math.floor(Math.random() * HAUTLY_MOCK_RESPONSES.length)];
        hautlyShowSpeech(reply);
        hautlyChatLog.value.push({ role: 'hautly', text: reply });
        // Keep chat log manageable
        if (hautlyChatLog.value.length > 12) hautlyChatLog.value.shift();
      }, 1200);
    }

    function hautlyShowSpeech(text) {
      clearTimeout(hautlyTypeTimer);
      clearTimeout(hautlySpeechTimer);
      hautlySpeech.value = text;
      hautlySpeechVisible.value = '';
      hautlyTyping.value = true;
      let i = 0;
      function typeChar() {
        if (i < text.length) {
          hautlySpeechVisible.value = text.slice(0, i + 1);
          i++;
          hautlyTypeTimer = setTimeout(typeChar, 25 + Math.random() * 20);
        } else {
          hautlyTyping.value = false;
          hautlySpeechTimer = setTimeout(() => { hautlySpeech.value = ''; }, 4000);
        }
      }
      typeChar();
    }

    function hautlySimulateAgent() {
      const events = [
        { mood: 'thinking', text: 'Analyzing codebase...' },
        { mood: 'speaking', text: 'Found 5 files to review.' },
        { mood: 'excited', text: 'Refactoring complete!' },
        { mood: 'idle', text: 'Ready for next task.' },
      ];
      let i = 0;
      function nextEvent() {
        if (i >= events.length) return;
        const ev = events[i];
        hautlyMood.value = ev.mood;
        hautlyShowSpeech(ev.text);
        hautlyChatLog.value.push({ role: 'hautly', text: ev.text });
        i++;
        setTimeout(nextEvent, 2500);
      }
      hautlyChatLog.value.push({ role: 'user', text: 'Run agent simulation' });
      nextEvent();
    }

    function hautlyMouseMove(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      hautlyMouseX = ((e.clientX - rect.left) / rect.width) * 800;
      hautlyMouseY = ((e.clientY - rect.top) / rect.height) * 480;
      hautlyMouseOver = true;
    }

    function hautlyMouseLeave() {
      hautlyMouseOver = false;
    }

    function hautlyClick() {
      const clickMsgs = [
        "*bloop* That tickles!",
        "I'm here! What do you need?",
        "Click detected. Energy boosted!",
        "Hello, human!",
        "My particles are dancing!",
      ];
      const msg = clickMsgs[Math.floor(Math.random() * clickMsgs.length)];
      hautlyShowSpeech(msg);
      hautlyEnergy.value = Math.min(1, hautlyEnergy.value + 0.1);
      // Brief excited flash
      const prev = hautlyMood.value;
      hautlyMood.value = 'excited';
      setTimeout(() => { hautlyMood.value = prev; }, 800);
    }

    // Gallery hover animation loop
    let galleryAnimFrame = 0;
    function hautlyGalleryHover(item, e) {
      const canvas = e.currentTarget.querySelector('.hautly-gallery-canvas');
      if (!canvas) return;
      canvas.setAttribute('data-animating', 'true');
      const ctx = canvas.getContext('2d');
      const startTime = performance.now();
      function animate() {
        if (canvas.matches(':hover')) {
          const t = (performance.now() - startTime) / 1000;
          drawHautlyOrb(ctx, 320, 200, t, { mood: item.mood, form: item.form });
          galleryAnimFrame = requestAnimationFrame(animate);
        } else {
          canvas.removeAttribute('data-animating');
        }
      }
      animate();
    }

    function hautlyGalleryLeave(item) {
      cancelAnimationFrame(galleryAnimFrame);
      document.querySelectorAll('.hautly-gallery-canvas[data-animating]').forEach(c => {
        c.removeAttribute('data-animating');
      });
    }

    const categories = [
      { id: 'gpu_core', label: 'GPU Core' },
      { id: 'agent', label: 'Agent' },
      { id: 'hautly', label: 'Hautly Entity' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'gpu_extra', label: 'GPU Extras' },
      { id: 'vgpu_gallery', label: 'vgpu Gallery' },
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

      // ==================== HAUTLY ENTITY EXAMPLES ====================
      { id: 'hautly_orb', title: 'Hautly Orb: alive companion', category: 'hautly', tags: 'hautly orb companion ascii alive', description: 'The core Hautly orb entity with breathing, eye tracking, and particle aura. Click to interact.', code: `import { hautlyWeb } from '@hautly/entity/web'\n\nconst h = hautlyWeb({\n  target: '#app',\n  form: 'orb',\n  initial: { mood: 'idle', energy: 0.5 },\n  interactive: true,\n  onClick: (engine) => {\n    engine.set({ mood: 'excited' });\n    h.say('Hello! Click detected.');\n    setTimeout(() => engine.set({ mood: 'idle' }), 1000);\n  },\n});\n\n// React to state changes\nh.update({ mood: 'thinking', energy: 0.8 });\nh.say('I am analyzing your code...');`, source: 'https://github.com/hautlys/AIGpu/blob/main/packages/hautly-entity/src/hautly-core.ts' },
      { id: 'hautly_terminal', title: 'Hautly Terminal: ANSI companion', category: 'hautly', tags: 'hautly terminal ansi linux windows', description: 'Hautly running in any ANSI terminal. Works on Linux, macOS, and Windows Terminal.', code: `import { hautlyTerminal } from '@hautly/entity/terminal'\n\nconst h = await hautlyTerminal({\n  form: 'orb',\n  mood: 'idle',\n  fps: 15,\n});\n\nh.say('Hello from the terminal!');\nh.update({ mood: 'thinking' });\n\n// Connect to an agent\nh.say('Waiting for agent events...');`, source: 'https://github.com/hautlys/AIGpu/blob/main/packages/hautly-entity/src/hautly-terminal.ts' },
      { id: 'hautly_crystal', title: 'Hautly Crystal: faceted entity', category: 'hautly', tags: 'hautly crystal faceted refraction', description: 'Crystal form with faceted surfaces and internal refraction patterns.', code: `import { hautlyWeb } from '@hautly/entity/web'\n\nconst h = hautlyWeb({\n  target: '#app',\n  form: 'crystal',\n  initial: { mood: 'thinking' },\n});\n\n// Crystal reacts to mood changes\nh.update({ mood: 'excited' });\nsetTimeout(() => h.update({ mood: 'idle' }), 2000);`, source: 'https://github.com/hautlys/AIGpu/blob/main/packages/hautly-entity/src/hautly-renderers.ts' },
      { id: 'hautly_agent', title: 'Hautly + Opencode: coding companion', category: 'hautly', tags: 'hautly opencode claude codex agent companion', description: 'Hautly connected as a living companion to coding agents via native adapters.', code: `import { createTerminalHautly } from '@hautly/entity/terminal'\nimport { createOpencodeAdapter } from '@hautly/entity/agents'\n\nconst h = createTerminalHautly({ form: 'orb' });\nconst adapter = createOpencodeAdapter({ engine: h.engine });\n\n// Hautly reacts to every agent event\nadapter.emit({ agentId: 'op', type: 'thinking', message: 'Analyzing...' });\nadapter.emit({ agentId: 'op', type: 'tool:call', tool: 'read_file' });\nadapter.emit({ agentId: 'op', type: 'message:assistant', message: 'Done!' });\n\nconst stop = h.start();`, source: 'https://github.com/hautlys/AIGpu/blob/main/packages/hautly-entity/src/hautly-agents.ts' },
      { id: 'hautly_vue', title: 'Hautly Vue: reactive entity', category: 'hautly', tags: 'hautly vue svelte react framework', description: 'Hautly as a Vue 3 component with reactive state binding.', code: `<!-- HautlyEntity.vue -->\n<script setup>\nimport { ref } from 'vue'\nimport { HautlyEntity } from '@hautly/entity/vue'\n\nconst mood = ref('idle')\nconst energy = ref(0.5)\n\nfunction click() {\n  mood.value = 'excited'\n  energy.value = Math.min(1, energy.value + 0.2)\n  setTimeout(() => mood.value = 'idle', 1000)\n}\n</script>\n\n<template>\n  <HautlyEntity\n    form="orb"\n    :mood="mood"\n    :energy="energy"\n    :width="400"\n    :height="300"\n    @click="click"\n  />\n</template>`, source: 'https://github.com/hautlys/AIGpu/blob/main/packages/hautly-entity/src/hautly-vue.ts' },

      // ==================== vgpu GALLERY EXAMPLES ====================
      { id: 'vgpu_gradient', title: 'Simple Gradient', category: 'vgpu_gallery', tags: 'gradient fragment shader vignette', description: 'Map screen coordinates to color with a tiny fullscreen fragment shader.', code: `// vgpu original: gradient example\nimport { effect, frameLoop, init, surface } from 'aigpu'\nimport fragment from './shader.wgsl'\n\nexport async function createRenderer(canvas: HTMLCanvasElement) {\n  const gpu = await init()\n  const output = surface(gpu, canvas, { dpr: [1, 2] })\n  const shader = effect(gpu, fragment)\n  frameLoop(gpu, (currentFrame) => currentFrame.pass(output, shader))\n  return { dispose: () => gpu.dispose() }\n}\n\n// shader.wgsl\n@fragment\nfn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {\n  let vignette = smoothstep(1.2, 0.2, distance(uv, vec2f(0.5)));\n  return vec4f(uv.x, uv.y, 0.46 + 0.16 * vignette, 1.0);\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/gradient' },
      { id: 'vgpu_triangle_led', title: 'Triangle LED Hero', category: 'vgpu_gallery', tags: 'triangle led raycast lighting', description: 'Analytic edge-glow triangle with LED emitters, floor radiance, and interactive color.', code: `// vgpu original: triangle LED hero\nimport { draw, geometry } from 'aigpu'\n\nconst canvas = document.querySelector('canvas')\nconst gpu = await init()\n\n// LED emitter geometry\nconst ledGeo = geometry(gpu, {\n  vertices: new Float32Array([...]),\n  stepMode: 'instance',\n})\n\n// Direct triangle raycast shader\nconst raycast = effect(gpu, raycastShader)\nconst ledEmit = effect(gpu, ledShader)\nconst floorNoise = effect(gpu, floorShader)\n\nfunction render(t) {\n  draw(gpu, (pass) => {\n    pass.effect(floorNoise)\n    pass.effect(ledEmit, ledGeo)\n    pass.effect(raycast)\n  })\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/triangle-led-front' },
      { id: 'vgpu_anti_aliasing', title: 'Anti-Aliasing', category: 'vgpu_gallery', tags: 'anti-aliasing msaa ssaa fxaa', description: 'One high-contrast scene through Off, MSAA 4x, SSAA 2x, and FXAA.', code: `// vgpu original: anti-aliasing comparison\nimport { init, target, effect } from 'aigpu'\n\nconst gpu = await init()\n\n// MSAA 4x target\nconst msaaTarget = target(gpu, {\n  width: 1024,\n  height: 768,\n  sampleCount: 4,\n  format: 'bgra8unorm',\n})\n\n// FXAA post-process\nconst fxaa = effect(gpu, fxaaShader)\n\nfunction render() {\n  const pass = gpu.beginPass({ target: msaaTarget })\n  pass.effect(scene)\n  pass.end()\n  // Resolve MSAA → FXAA\n  fxaa.apply(msaaTarget.texture)\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/anti-aliasing' },
      { id: 'vgpu_black_hole', title: 'Black Hole', category: 'vgpu_gallery', tags: 'black-hole raymarching lensing hdr', description: 'Raymarched gravitational lensing with Keplerian accretion disk and Doppler beaming.', code: `// vgpu original: black hole\nimport { init, effect, frameLoop, surface } from 'aigpu'\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\n\n// Multi-pass: scene → bright pass → blur → composite\nconst scene = effect(gpu, blackHoleShader)\nconst brightPass = effect(gpu, brightShader)\nconst blurH = effect(gpu, blurHShader)\nconst blurV = effect(gpu, blurVShader)\nconst composite = effect(gpu, compositeShader)\n\nconst sceneTarget = target(gpu, { width: 1024, height: 1024, format: 'rgba16float' })\nconst blurA = target(gpu, { width: 256, height: 256, format: 'rgba16float' })\nconst blurB = target(gpu, { width: 256, height: 256, format: 'rgba16float' })\n\nframeLoop(gpu, (frame) => {\n  frame.pass(sceneTarget, scene)\n  frame.pass(blurA, brightPass)\n  for (let i = 0; i < 4; i++) {\n    frame.pass(blurB, blurH)\n    frame.pass(blurA, blurV)\n  }\n  frame.pass(output, composite)\n})`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/black-hole' },
      { id: 'vgpu_earth', title: 'Earth', category: 'vgpu_gallery', tags: 'planet procedural hdr bloom lighting', description: 'Procedural planet with GPU-baked albedo, night lights, clouds, and atmosphere.', code: `// vgpu original: earth\nimport { init, effect, compute, storage, frameLoop } from 'aigpu'\n\nconst gpu = await init()\n\n// Bake planet surface\nconst bakeSurface = effect(gpu, bakeSurfaceShader)\nconst bakeClouds = effect(gpu, bakeCloudsShader)\n\n// Atmosphere + bloom chain\nconst atmosphere = effect(gpu, atmosphereShader)\nconst sky = effect(gpu, skyShader)\nconst brightPass = effect(gpu, brightShader)\nconst blurH = effect(gpu, blurHShader)\nconst blurV = effect(gpu, blurVShader)\nconst composite = effect(gpu, compositeShader)\n\nframeLoop(gpu, (frame) => {\n  frame.effect(bakeSurface)\n  frame.effect(bakeClouds)\n  frame.pass(sceneTarget, earth)\n  frame.pass(sceneTarget, atmosphere)\n  frame.pass(sceneTarget, sky)\n  // HDR bloom chain\n  frame.pass(blurA, brightPass)\n  for (let i = 0; i < 3; i++) {\n    frame.pass(blurB, blurH)\n    frame.pass(blurA, blurV)\n  }\n  frame.pass(output, composite)\n})`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/earth' },
      { id: 'vgpu_fluid_sim', title: 'Interactive Fluid', category: 'vgpu_gallery', tags: 'fluid simulation compute navier-stokes', description: 'Pressure-projected fluid solver with velocity advection, dye, and pointer stirring.', code: `// vgpu original: interactive fluid\nimport { init, compute, pingPongStorage, storage, effect } from 'aigpu'\n\nconst gpu = await init()\nconst N = [128, 72]\nconst dyeN = [512, 288]\n\nconst velocity = pingPongStorage(gpu, N, { format: 'rgba16float' })\nconst pressure = pingPongStorage(gpu, N, { format: 'rgba16float' })\nconst dye = pingPongStorage(gpu, dyeN, { format: 'rgba16float' })\n\nconst advectVelocity = compute(gpu, advectVelocityShader)\nconst computeCurl = compute(gpu, curlShader)\nconst applyVorticity = compute(gpu, vorticityShader)\nconst computeDivergence = compute(gpu, divergenceShader)\nconst pressureSolve = compute(gpu, pressureShader)\nconst project = compute(gpu, projectShader)\nconst advectDye = compute(gpu, advectDyeShader)\nconst display = effect(gpu, displayShader)\n\nfunction simulate(dt) {\n  advectVelocity.dispatch(velocity)\n  computeCurl.dispatch(velocity)\n  applyVorticity.dispatch(velocity)\n  computeDivergence.dispatch(velocity)\n  for (let i = 0; i < 20; i++) pressureSolve.dispatch(pressure)\n  project.dispatch(velocity, pressure)\n  advectDye.dispatch(dye, velocity)\n  velocity.swap()\n  pressure.swap()\n  dye.swap()\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/fluid' },
      { id: 'vgpu_instanced', title: 'Instanced Rendering', category: 'vgpu_gallery', tags: 'instancing indirect 125k cubes performance', description: 'One cube mesh + one instance stream, 125,000 independently animated cubes.', code: `// vgpu original: instanced rendering\nimport { init, draw, geometry, bundle } from 'aigpu'\n\nconst gpu = await init()\nconst cubeGeo = geometry(gpu, {\n  vertices: cubeVertices,\n  indices: cubeIndices,\n  stepMode: 'instance',\n  instanceCount: 125000,\n})\n\nconst scenePipeline = gpu.device.createRenderPipeline({ ... })\n\n// Record render bundle for instant replay\nconst renderBundle = bundle(gpu, (pass) => {\n  pass.setPipeline(scenePipeline)\n  pass.setBindGroup(0, uniformBindGroup)\n  pass.drawIndexed(cubeIndices.length, 125000)\n})\n\nfunction render(t) {\n  gpu.device.queue.writeBuffer(timeBuffer, 0, new Float32Array([t]))\n  const pass = gpu.beginPass({ canvas })\n  pass.executeBundles([renderBundle])\n  pass.end()\n  gpu.submit()\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/instanced-rendering' },
      { id: 'vgpu_batch', title: 'Batch Rendering', category: 'vgpu_gallery', tags: 'batch rendering render bundles primitives', description: 'Four primitive ranges in one mesh, recorded once as a render bundle.', code: `// vgpu original: batch rendering\nimport { init, geometry, bundle } from 'aigpu'\n\nconst gpu = await init()\n\n// One mesh with 4 primitive ranges\nconst batchGeo = geometry(gpu, {\n  vertices: combinedVertices,\n  ranges: [\n    { offset: 0, count: 3 },       // triangle\n    { offset: 3, count: 4 },       // quad\n    { offset: 7, count: 5 },       // pentagon\n    { offset: 12, count: 6 },      // hexagon\n  ],\n})\n\n// Record bundle once\nconst renderBundle = bundle(gpu, (pass) => {\n  pass.setPipeline(pipeline)\n  pass.setBindGroup(0, bindGroup)\n  pass.draw(3)   // triangle\n  pass.draw(4)   // quad\n  pass.draw(5)   // pentagon\n  pass.draw(6)   // hexagon\n})\n\n// Replay every frame — near-zero cost\nfunction render() {\n  const pass = gpu.beginPass({ canvas })\n  pass.executeBundles([renderBundle])\n  pass.end()\n  gpu.submit()\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/batch-rendering' },
      { id: 'vgpu_fft_ocean', title: 'Particles Ocean', category: 'vgpu_gallery', tags: 'ocean fft particles frequency spectrum', description: 'Deep-water surface driven by inverse FFT. Phillips spectrum + Stockham passes + 500K particles.', code: `// vgpu original: particles ocean (FFT)\nimport { init, compute, storage, effect } from 'aigpu'\n\nconst gpu = await init()\nconst N = 256\n\n// Frequency-space spectrum\nconst spectrumInit = compute(gpu, spectrumInitShader)\nconst spectrumUpdate = compute(gpu, spectrumUpdateShader)\n\n// Inverse FFT (Stockham passes)\nconst ifftRow = compute(gpu, ifftRowShader)\nconst ifftCol = compute(gpu, ifftColShader)\n\n// Normal + foam\nconst normalFoam = compute(gpu, normalFoamShader)\n\n// Particle rendering\nconst particles = effect(gpu, particleShader)\n\n// Bloom chain\nconst bright = effect(gpu, brightShader)\nconst blurH = effect(gpu, blurHShader)\nconst blurV = effect(gpu, blurVShader)\nconst bloomComposite = effect(gpu, bloomCompositeShader)\n\nfunction simulate(t) {\n  spectrumUpdate.dispatch(t)\n  ifftRow.dispatch()\n  ifftCol.dispatch()\n  normalFoam.dispatch()\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/fft-ocean' },
      { id: 'vgpu_fft_surface', title: 'FFT Ocean Surface', category: 'vgpu_gallery', tags: 'ocean fft surface compute displacement', description: 'Displaced ocean surface with real inverse FFT, per-pixel normals, foam, Fresnel sky.', code: `// vgpu original: FFT ocean surface\nimport { init, compute, effect, frameLoop } from 'aigpu'\n\nconst gpu = await init()\n\nconst spectrumInit = compute(gpu, spectrumInitShader)\nconst spectrumUpdate = compute(gpu, spectrumUpdateShader)\nconst fftRow = compute(gpu, fftRowShader)\nconst fftCol = compute(gpu, fftColShader)\nconst bakeSurface = compute(gpu, bakeShader)\n\nconst oceanSurface = effect(gpu, oceanSurfaceShader)\nconst sky = effect(gpu, skyShader)\nconst skydome = effect(gpu, skydomeShader)\nconst composite = effect(gpu, compositeShader)\n\nframeLoop(gpu, (frame) => {\n  spectrumUpdate.dispatch(frame.time)\n  fftRow.dispatch()\n  fftCol.dispatch()\n  bakeSurface.dispatch()\n  frame.pass(sceneTarget, oceanSurface)\n  frame.pass(sceneTarget, sky)\n  frame.pass(output, composite)\n})`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/fft-ocean-surface' },
      { id: 'vgpu_raymarch_fractal', title: 'Raymarched Fractal', category: 'vgpu_gallery', tags: 'raymarching fractal sierpinski tetrahedron', description: 'Raymarched Sierpinski tetrahedron with directional light and HDR bloom.', code: `// vgpu original: raymarched fractal\nimport { init, effect, frameLoop, surface, target } from 'aigpu'\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\n\nconst sceneTarget = target(gpu, { width: 1024, height: 1024, format: 'rgba16float' })\n\nconst fractal = effect(gpu, fractalShader)\nconst brightPass = effect(gpu, brightShader)\nconst blurH = effect(gpu, blurHShader)\nconst blurV = effect(gpu, blurVShader)\nconst composite = effect(gpu, compositeShader)\n\nframeLoop(gpu, (frame) => {\n  frame.pass(sceneTarget, fractal)\n  frame.pass(blurA, brightPass)\n  for (let i = 0; i < 3; i++) {\n    frame.pass(blurB, blurH)\n    frame.pass(blurA, blurV)\n  }\n  frame.pass(output, composite)\n})\n\n// fractal.wgsl — SDF + raymarching\n@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = (pos.xy - resolution * 0.5) / resolution.y;\n  let ro = vec3f(0, 0, -3);\n  let rd = normalize(vec3f(uv, 1.5));\n  var t = 0.0;\n  for (var i = 0; i < 128; i++) {\n    let p = ro + rd * t;\n    let d = sierpinski(p);\n    if (d < 0.001) { break; }\n    t += d;\n  }\n  let col = select(vec4f(0), vec4f(1), t < 20.0);\n  return col;\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/raymarched-fractal' },
      { id: 'vgpu_glass_fractal', title: 'Glass Fractal', category: 'vgpu_gallery', tags: 'glass fractal frosted transmission refraction', description: 'Beveled glass tetrahedron with morphing fractal mesh, screen-space transmission.', code: `// vgpu original: glass fractal\nimport { init, effect, geometry, target, frameLoop } from 'aigpu'\n\nconst gpu = await init()\n\n// Multi-pass: fractal → glass → floor → composite\nconst fractalMesh = effect(gpu, fractalMeshShader)\nconst glassTransmission = effect(gpu, glassShader)\nconst floorAO = effect(gpu, floorAOShader)\nconst fractalWireframe = effect(gpu, wireframeShader)\n\nconst sceneTarget = target(gpu, { width: 1024, height: 1024, format: 'rgba16float' })\nconst transmissionTarget = target(gpu, { width: 512, height: 512, format: 'rgba16float' })\n\nframeLoop(gpu, (frame) => {\n  frame.pass(sceneTarget, fractalMesh)\n  frame.pass(transmissionTarget, glassTransmission)\n  frame.pass(sceneTarget, floorAO)\n  frame.pass(sceneTarget, fractalWireframe)\n  frame.pass(output, composite)\n})`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/glass-fractal' },
      { id: 'vgpu_env_map', title: 'Environment Map', category: 'vgpu_gallery', tags: 'environment map hdr lighting reflections ibl', description: '360-degree equirectangular map as background and every reflection on a mirror cube.', code: `// vgpu original: environment map\nimport { init, effect, geometry, target } from 'aigpu'\n\nconst gpu = await init()\n\n// Equirectangular environment map\nconst envMap = texture(gpu, { url: 'env.hdr' })\n\nconst metal = effect(gpu, metalShader)\nconst sky = effect(gpu, skyShader)\nconst blur = effect(gpu, blurShader)\nconst present = effect(gpu, presentShader)\n\nconst cubeGeo = geometry(gpu, {\n  vertices: cubeVertices,\n  indices: cubeIndices,\n})\n\nfunction render(t) {\n  const pass = gpu.beginPass({ canvas })\n  pass.effect(sky, { envMap })\n  pass.effect(metal, { geometry: cubeGeo, envMap })\n  pass.end()\n  gpu.submit()\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/environment-map' },
      { id: 'vgpu_transmission', title: 'Transmission', category: 'vgpu_gallery', tags: 'transmission refraction glass screen-space', description: 'Glass cube refracts scene behind it in screen space with Snell, dispersion, Fresnel.', code: `// vgpu original: transmission\nimport { init, effect, geometry, target } from 'aigpu'\n\nconst gpu = await init()\n\nconst sceneTarget = target(gpu, { width: 1024, height: 1024, format: 'rgba8unorm' })\nconst blurPyramid = target(gpu, { width: 256, height: 256, format: 'rgba8unorm' })\n\nconst scene = effect(gpu, sceneShader)\nconst glass = effect(gpu, glassShader)\nconst blur = effect(gpu, blurShader)\nconst present = effect(gpu, presentShader)\n\nfunction render(t) {\n  // 1) Render scene\n  pass(sceneTarget, scene)\n  // 2) Build blur pyramid\n  for (let i = 0; i < 5; i++) blur.apply(sceneTarget.texture)\n  // 3) Glass reads blur pyramid with Snell refraction\n  pass(sceneTarget, glass)\n  // 4) Composite\n  pass(output, present)\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/transmission' },
      { id: 'vgpu_clipping', title: 'Clipping', category: 'vgpu_gallery', tags: 'clipping sdf slicing cross-section', description: 'Signed-distance test slices an animated icosphere with moving cross-section disk.', code: `// vgpu original: clipping\nimport { init, effect, frameLoop, surface } from 'aigpu'\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst clipped = effect(gpu, clippedShader)\n\nframeLoop(gpu, (frame) => {\n  frame.pass(output, clipped)\n})\n\n// clipped.wgsl — SDF slice + fitted disk\n@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {\n  let uv = (pos.xy - resolution * 0.5) / resolution.y;\n  let ro = vec3f(0, 0, -3);\n  let rd = normalize(vec3f(uv, 1.5));\n  let clipY = sin(time * 0.8) * 0.6;\n  var t = 0.0;\n  for (var i = 0; i < 64; i++) {\n    let p = ro + rd * t;\n    let d = icosphere(p);\n    if (d < 0.001 || p.y > clipY) { break; }\n    t += d;\n  }\n  let col = select(vec4f(0), vec4f(1), t < 20.0);\n  return col;\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/clipping' },
      { id: 'vgpu_radiance', title: 'Radiance Cascades', category: 'vgpu_gallery', tags: 'radiance cascades global illumination jfa sdf', description: 'Draw light with pointer — JFA distance field feeds 6 radiance cascades for 2D GI.', code: `// vgpu original: radiance cascades\nimport { init, compute, effect, storage } from 'aigpu'\n\nconst gpu = await init()\n\nconst sdfBuffer = storage(gpu, { size: width * height * 4, usage: 'storage' })\nconst cascadeBuffers = Array.from({ length: 6 }, (_, i) =>\n  storage(gpu, { size: width * height * 16 * (4 ** i), usage: 'storage' })\n)\n\n// Jump-flooded distance field\nconst jfaInit = compute(gpu, jfaInitShader)\nconst jfaPass = compute(gpu, jfaPassShader)\nconst sdfFinalize = compute(gpu, sdfFinalizeShader)\n\n// 6-cascade merge (base 4, geometric intervals)\nconst radianceCascade = compute(gpu, rcShader)\nconst present = effect(gpu, presentShader)\n\nfunction simulate(t) {\n  jfaInit.dispatch()\n  for (let i = 0; i < 8; i++) jfaPass.dispatch()\n  sdfFinalize.dispatch()\n  for (let c = 0; c < 6; c++) radianceCascade.dispatch(c)\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/radiance-cascades' },
      { id: 'vgpu_agent_radiance', title: 'Agent Radiance Cascades', category: 'vgpu_gallery', tags: 'agent radiance cascades gi hdr emitters', description: 'Agent mark becomes selectable loading field — dots are HDR emitters + occluders for GI.', code: `// vgpu original: agent radiance cascades\nimport { init, compute, effect, storage } from 'aigpu'\n\nconst gpu = await init()\n\n// Agent mark — 10 dots as HDR emitters\nconst agentDots = compute(gpu, agentDotsShader)\nconst sdfBuffer = storage(gpu, { size: width * height * 4, usage: 'storage' })\n\nconst jfaInit = compute(gpu, jfaInitShader)\nconst jfaPass = compute(gpu, jfaPassShader)\nconst sdfFinalize = compute(gpu, sdfFinalizeShader)\nconst radianceCascade = compute(gpu, rcShader)\nconst present = effect(gpu, presentShader)\n\nfunction simulate() {\n  agentDots.dispatch()\n  jfaInit.dispatch()\n  for (let i = 0; i < 8; i++) jfaPass.dispatch()\n  sdfFinalize.dispatch()\n  for (let c = 0; c < 6; c++) radianceCascade.dispatch(c)\n}`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/agent-radiance-cascades' },
      { id: 'vgpu_depth', title: 'Depth Estimation', category: 'vgpu_gallery', tags: 'depth estimation onnx machine-learning', description: 'Estimate depth from photo/webcam with ONNX Runtime Web on WebGPU.', code: `// vgpu original: depth estimation\nimport { init, effect, storage, target } from 'aigpu'\nimport * as ort from 'onnxruntime-web'\n\nconst gpu = await init()\nconst session = await ort.InferenceSession.create('depth-anything.onnx', {\n  executionProviders: ['webgpu'],\n})\n\nconst inputBuffer = storage(gpu, { size: 518 * 518 * 3 * 4, usage: 'storage | copy-src' })\nconst depthBuffer = storage(gpu, { size: 518 * 518 * 4, usage: 'storage | copy-dst' })\n\n// Zero-copy wrap — vgpu buffer ↔ ONNX tensor\nconst inputTensor = new ort.Tensor('float32', inputBuffer.data, [1, 3, 518, 518])\n\nasync function estimateDepth(imageData) {\n  gpu.device.queue.writeBuffer(inputBuffer, 0, imageData)\n  const results = await session.run({ input: inputTensor })\n  return results.output.data\n}\n\nconst sideBySide = effect(gpu, sideBySideShader)\nconst reduceRange = effect(gpu, reduceRangeShader)`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/depth-estimation' },
      { id: 'vgpu_mnist', title: 'MNIST Classifier', category: 'vgpu_gallery', tags: 'mnist classifier onnx digits machine-learning', description: 'Draw a digit, classify with ONNX on WebGPU. GPU-resident logits through buffer wrap.', code: `// vgpu original: MNIST classifier\nimport { init, effect, storage } from 'aigpu'\nimport * as ort from 'onnxruntime-web'\n\nconst gpu = await init()\nconst session = await ort.InferenceSession.create('mnist.onnx', {\n  executionProviders: ['webgpu'],\n})\n\n// Canvas input → GPU buffer\nconst inputBuffer = storage(gpu, { size: 28 * 28 * 4, usage: 'storage | copy-src' })\nconst logitsBuffer = storage(gpu, { size: 10 * 4, usage: 'storage | copy-dst' })\n\nconst inputTensor = new ort.Tensor('float32', inputBuffer.data, [1, 1, 28, 28])\n\nasync function classify(canvas) {\n  const ctx = canvas.getContext('2d')\n  const data = ctx.getImageData(0, 0, 28, 28)\n  gpu.device.queue.writeBuffer(inputBuffer, 0, data.data)\n  const results = await session.run({ input: inputTensor })\n  const logits = results.output.data\n  return Array.from(logits).indexOf(Math.max(...logits))\n}\n\nconst visualize = effect(gpu, visualizeShader)`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/mnist-classifier' },
      { id: 'vgpu_particle_orbit', title: 'Particle Orbit', category: 'vgpu_gallery', tags: 'particle orbit typegpu interop shared device', description: 'TypeGPU + vgpu shared device: light-seeking dust + orbiting lights + HDR bloom + CRT.', code: `// vgpu original: particle orbit (TypeGPU interop)\nimport { init, effect, compute, storage, target } from 'aigpu'\nimport { createRuntime } from 'typegpu'\n\n// Shared device between vgpu and TypeGPU\nconst gpu = await init()\nconst typegpu = createRuntime(gpu.device)\n\n// TypeGPU: particle simulation\nconst dustSim = typegpu.createComputePipeline({ ... })\nconst particles = typegpu.createBuffer(...)\n\n// vgpu: rendering (zero-copy shared buffer)\nconst nebula = effect(gpu, nebulaShader)\nconst stars = effect(gpu, starsShader)\nconst atmosphere = effect(gpu, atmosphereShader)\nconst trails = effect(gpu, trailsShader)\n\n// Radiance cascades for GI\nconst rcEmitter = compute(gpu, rcEmitterShader)\nconst rcDirections = compute(gpu, rcDirectionsShader)\nconst sdfSample = compute(gpu, sdfSampleShader)\nconst jfaInit = compute(gpu, jfaInitShader)\nconst jfaPass = compute(gpu, jfaPassShader)\nconst sdfFinalize = compute(gpu, sdfFinalizeShader)\nconst radianceCascade = compute(gpu, rcShader)\n\n// HDR bloom + CRT finish\nconst bright = effect(gpu, brightShader)\nconst blurH = effect(gpu, blurHShader)\nconst blurV = effect(gpu, blurVShader)\nconst post = effect(gpu, postShader)\n\nframeLoop(gpu, (frame) => {\n  // TypeGPU runs particle sim\n  typegpu.cmd(dustSim).dispatch(particles)\n  // vgpu renders particles (zero-copy)\n  frame.pass(sceneTarget, nebula)\n  frame.pass(sceneTarget, stars)\n  frame.pass(sceneTarget, trails)\n  // Bloom + CRT\n  frame.pass(blurA, bright)\n  for (let i = 0; i < 3; i++) {\n    frame.pass(blurB, blurH)\n    frame.pass(blurA, blurV)\n  }\n  frame.pass(output, post)\n})`, source: 'https://github.com/vercel-labs/vgpu/tree/main/examples/particle-orbit' },
    ]);

    const frameworks = ref([
      { id: 'vue', name: 'Vue 3', lang: 'Vue SFC', desc: 'Reactive refs drive GPU state. Single-file components with Composition API.', code: `<!-- AIGpuAgent.vue -->\n<template>\n  <div class="agent">\n    <canvas ref="canvasRef" width="400" height="300" />\n    <div class="controls">\n      <select v-model="status">\n        <option>idle</option>\n        <option>thinking</option>\n        <option>working</option>\n        <option>success</option>\n        <option>error</option>\n      </select>\n      <input type="range" v-model.number="progress" min="0" max="100" />\n    </div>\n  </div>\n</template>\n\n<script setup>\nimport { ref, onMounted, watch } from 'vue'\nimport { gpu } from 'aigpu'\n\nconst canvasRef = ref(null)\nconst status = ref('working')\nconst progress = ref(64)\nconst activity = ref(42)\n\nlet gpuCtx = null\nlet pipeline = null\nlet uniformBuffer = null\n\nonMounted(() => {\n  gpuCtx = gpu()\n  gpuCtx.configure({ canvas: canvasRef.value })\n\n  uniformBuffer = gpuCtx.device.createBuffer({\n    size: 32,\n    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n  })\n\n  pipeline = gpuCtx.device.createRenderPipeline({\n    layout: 'auto',\n    vertex: {\n      module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n      entryPoint: 'main',\n    },\n    fragment: {\n      module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n      entryPoint: 'main',\n      targets: [{ format: gpuCtx.format }],\n    },\n  })\n\n  render()\n})\n\nwatch([status, progress, activity], () => {\n  gpuCtx.device.queue.writeBuffer(\n    uniformBuffer, 0,\n    new Float32Array([\n      statusToFloat(status.value),\n      progress.value / 100,\n      activity.value / 100,\n      performance.now() / 1000,\n    ])\n  )\n})\n\nfunction render() {\n  const pass = gpuCtx.beginPass({ canvas: canvasRef.value })\n  pass.setPipeline(pipeline)\n  pass.setBindGroup(0, bindGroup)\n  pass.draw(3)\n  pass.end()\n  gpuCtx.submit()\n  requestAnimationFrame(render)\n}\n\nfunction statusToFloat(s) {\n  return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] || 0\n}\n</script>` },
      { id: 'react', name: 'React', lang: 'TSX', desc: 'useRef for canvas. useEffect for lifecycle. GPU state via props/callbacks.', code: `// AIGpuAgent.tsx\nimport { useRef, useEffect, useState, useCallback } from 'react'\nimport { gpu } from 'aigpu'\n\ninterface AgentProps {\n  initialStatus?: string\n  onStatusChange?: (status: string) => void\n}\n\nexport function AIGpuAgent({\n  initialStatus = 'working',\n  onStatusChange,\n}: AgentProps) {\n  const canvasRef = useRef<HTMLCanvasElement>(null)\n  const gpuRef = useRef<ReturnType<typeof gpu> | null>(null)\n  const [status, setStatus] = useState(initialStatus)\n  const [progress, setProgress] = useState(64)\n  const [activity, setActivity] = useState(42)\n\n  useEffect(() => {\n    if (!canvasRef.current) return\n\n    const gpuCtx = gpu()\n    gpuRef.current = gpuCtx\n\n    gpuCtx.configure({ canvas: canvasRef.current })\n\n    const uniformBuffer = gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    const pipeline = gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: gpuCtx.format }],\n      },\n    })\n\n    let animId: number\n    function render() {\n      const pass = gpuCtx.beginPass({ canvas: canvasRef.current! })\n      pass.setPipeline(pipeline)\n      pass.draw(3)\n      pass.end()\n      gpuCtx.submit()\n      animId = requestAnimationFrame(render)\n    }\n    render()\n\n    return () => {\n      cancelAnimationFrame(animId)\n      gpuCtx.device.destroy()\n    }\n  }, [])\n\n  useEffect(() => {\n    if (!gpuRef.current) return\n    gpuRef.current.device.queue.writeBuffer(\n      uniformBuffer, 0,\n      new Float32Array([\n        statusToFloat(status),\n        progress / 100,\n        activity / 100,\n        performance.now() / 1000,\n      ])\n    )\n  }, [status, progress, activity])\n\n  const handleStatusChange = useCallback((e) => {\n    const newStatus = e.target.value\n    setStatus(newStatus)\n    onStatusChange?.(newStatus)\n  }, [onStatusChange])\n\n  return (\n    <div className="agent">\n      <canvas ref={canvasRef} width={400} height={300} />\n      <div className="controls">\n        <select value={status} onChange={handleStatusChange}>\n          <option value="idle">idle</option>\n          <option value="thinking">thinking</option>\n          <option value="working">working</option>\n          <option value="success">success</option>\n          <option value="error">error</option>\n        </select>\n        <input\n          type="range"\n          min={0}\n          max={100}\n          value={progress}\n          onChange={(e) => setProgress(Number(e.target.value))}\n        />\n      </div>\n    </div>\n  )\n}\n\nfunction statusToFloat(s: string): number {\n  return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] ?? 0\n}` },
      { id: 'purejs', name: 'Pure JS', lang: 'JavaScript', desc: 'Zero dependencies. Direct GPU API. Works anywhere with WebGPU.', code: `// agent.js\nimport { gpu } from 'aigpu'\n\nclass AIGpuAgent {\n  constructor(canvas, options = {}) {\n    this.canvas = canvas\n    this.status = options.status || 'idle'\n    this.progress = options.progress || 0\n    this.activity = options.activity || 0\n\n    this.gpuCtx = gpu()\n    this.gpuCtx.configure({ canvas })\n\n    this.uniformBuffer = this.gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    this.pipeline = this.gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: this.gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: this.gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: this.gpuCtx.format }],\n      },\n    })\n\n    this.render()\n  }\n\n  patch(state) {\n    if (state.status !== undefined) this.status = state.status\n    if (state.progress !== undefined) this.progress = state.progress\n    if (state.activity !== undefined) this.activity = state.activity\n\n    this.gpuCtx.device.queue.writeBuffer(\n      this.uniformBuffer, 0,\n      new Float32Array([\n        this._statusToFloat(this.status),\n        this.progress / 100,\n        this.activity / 100,\n        performance.now() / 1000,\n      ])\n    )\n  }\n\n  render() {\n    const pass = this.gpuCtx.beginPass({ canvas: this.canvas })\n    pass.setPipeline(this.pipeline)\n    pass.setBindGroup(0, this.bindGroup)\n    pass.draw(3)\n    pass.end()\n    this.gpuCtx.submit()\n    this._rafId = requestAnimationFrame(() => this.render())\n  }\n\n  destroy() {\n    cancelAnimationFrame(this._rafId)\n    this.gpuCtx.device.destroy()\n  }\n\n  _statusToFloat(s) {\n    return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] ?? 0\n  }\n}\n\n// Usage\nconst agent = new AIGpuAgent(document.querySelector('canvas'))\nagent.patch({ status: 'working', progress: 50 })\n\n// Accepts plain objects — no framework needed\nws.onmessage = (e) => agent.patch(JSON.parse(e.data))` },
      { id: 'svelte', name: 'Svelte', lang: 'Svelte', desc: 'Reactive statements auto-sync GPU state. Compile-time optimized.', code: `<!-- AIGpuAgent.svelte -->\n<script>\n  import { onMount, onDestroy } from 'svelte'\n  import { gpu } from 'aigpu'\n\n  export let status = 'working'\n  export let progress = 64\n  export let activity = 42\n\n  let canvas\n  let gpuCtx\n  let pipeline\n  let uniformBuffer\n  let bindGroup\n  let rafId\n\n  onMount(() => {\n    gpuCtx = gpu()\n    gpuCtx.configure({ canvas })\n\n    uniformBuffer = gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    pipeline = gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: gpuCtx.format }],\n      },\n    })\n\n    bindGroup = gpuCtx.device.createBindGroup({\n      layout: pipeline.getBindGroupLayout(0),\n      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],\n    })\n\n    render()\n  })\n\n  onDestroy(() => {\n    cancelAnimationFrame(rafId)\n    gpuCtx?.device?.destroy()\n  })\n\n  // Reactive: auto-update GPU when state changes\n  $: if (gpuCtx && uniformBuffer) {\n    gpuCtx.device.queue.writeBuffer(\n      uniformBuffer, 0,\n      new Float32Array([\n        statusToFloat(status),\n        progress / 100,\n        activity / 100,\n        performance.now() / 1000,\n      ])\n    )\n  }\n\n  function render() {\n    const pass = gpuCtx.beginPass({ canvas })\n    pass.setPipeline(pipeline)\n    pass.setBindGroup(0, bindGroup)\n    pass.draw(3)\n    pass.end()\n    gpuCtx.submit()\n    rafId = requestAnimationFrame(render)\n  }\n\n  function statusToFloat(s) {\n    return { idle: 0, thinking: 0.2, working: 0.5, success: 0.8, error: 1.0 }[s] ?? 0\n  }\n</script>\n\n<div class="agent">\n  <canvas bind:this={canvas} width="400" height="300" />\n  <div class="controls">\n    <select bind:value={status}>\n      <option value="idle">idle</option>\n      <option value="thinking">thinking</option>\n      <option value="working">working</option>\n      <option value="success">success</option>\n      <option value="error">error</option>\n    </select>\n    <input type="range" min="0" max="100" bind:value={progress} />\n  </div>\n</div>` },
      { id: 'nextjs', name: 'Next.js', lang: 'TypeScript', desc: 'Server-only + client boundaries. Dynamic imports. SSR-safe GPU rendering.', code: `// app/agent/page.tsx (Server Component)\nimport dynamic from 'next/dynamic'\n\n// Dynamic import — client-only GPU code\nconst AIGpuAgent = dynamic(\n  () => import('./AIGpuAgent'),\n  { ssr: false }\n)\n\nexport default function AgentPage() {\n  return (\n    <div>\n      <h1>Agent Dashboard</h1>\n      <AIGpuAgent status="working" progress={64} />\n    </div>\n  )\n}\n\n// app/agent/AIGpuAgent.tsx (Client Component)\n'use client'\n\nimport { useRef, useEffect, useState } from 'react'\nimport { gpu } from 'aigpu'\n\nexport default function AIGpuAgent({\n  status: initialStatus = 'working',\n  progress: initialProgress = 64,\n}: {\n  status?: string\n  progress?: number\n}) {\n  const canvasRef = useRef<HTMLCanvasElement>(null)\n  const [status, setStatus] = useState(initialStatus)\n  const [progress, setProgress] = useState(initialProgress)\n\n  useEffect(() => {\n    if (!canvasRef.current) return\n\n    const gpuCtx = gpu()\n    gpuCtx.configure({ canvas: canvasRef.current })\n\n    const uniformBuffer = gpuCtx.device.createBuffer({\n      size: 32,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    })\n\n    const pipeline = gpuCtx.device.createRenderPipeline({\n      layout: 'auto',\n      vertex: {\n        module: gpuCtx.device.createShaderModule({ code: vertexShader }),\n        entryPoint: 'main',\n      },\n      fragment: {\n        module: gpuCtx.device.createShaderModule({ code: fragmentShader }),\n        entryPoint: 'main',\n        targets: [{ format: gpuCtx.format }],\n      },\n    })\n\n    let animId: number\n    function render() {\n      const pass = gpuCtx.beginPass({ canvas: canvasRef.current! })\n      pass.setPipeline(pipeline)\n      pass.draw(3)\n      pass.end()\n      gpuCtx.submit()\n      animId = requestAnimationFrame(render)\n    }\n    render()\n\n    return () => {\n      cancelAnimationFrame(animId)\n      gpuCtx.device.destroy()\n    }\n  }, [])\n\n  useEffect(() => {\n    if (!canvasRef.current) return\n    // Update GPU state via uniform buffer\n  }, [status, progress])\n\n  return (\n    <div className="agent">\n      <canvas ref={canvasRef} width={400} height={300} />\n      <div className="controls">\n        <select value={status} onChange={(e) => setStatus(e.target.value)}>\n          <option value="idle">idle</option>\n          <option value="working">working</option>\n          <option value="success">success</option>\n        </select>\n        <input\n          type="range"\n          min={0}\n          max={100}\n          value={progress}\n          onChange={(e) => setProgress(Number(e.target.value))}\n        />\n      </div>\n    </div>\n  )\n}` },
      { id: 'threetsl', name: 'three.js TSL', lang: 'TypeScript', desc: 'Wire plain WGSL modules into three.js node material. 12 surface slots.', code: `// three.js TSL integration — WGSL in node material\nimport * as THREE from 'three'\nimport { wgslToTSL } from 'aigpu/three-tsl'\n\n// Import your WGSL shader modules\nimport lavaVertex from './lava-vertex.wgsl'\nimport lavaFragment from './lava-fragment.wgsl'\nimport noiseModule from './noise.wgsl'\n\n// Convert WGSL → three.js TSL nodes\nconst lavaNodes = wgslToTSL({\n  vertex: lavaVertex,\n  fragment: lavaFragment,\n  modules: [noiseModule],\n})\n\n// Create node material with 12 surface slots\nconst lavaMaterial = new THREE.NodeMaterial()\nlavaMaterial.colorNode = lavaNodes.color\nlavaMaterial.normalNode = lavaNodes.normal\nlavaMaterial.roughnessNode = lavaNodes.roughness\nlavaMaterial.metalnessNode = lavaNodes.metalness\nlavaMaterial.emissiveNode = lavaNodes.emissive\nlavaMaterial.opacityNode = lavaNodes.opacity\nlavaMaterial.positionNode = lavaNodes.position\nlavaMaterial.transformNormalNode = lavaNodes.transformNormal\nlavaMaterial.transformPositionNode = lavaNodes.transformPosition\nlavaMaterial.environmentNode = lavaNodes.environment\nlavaMaterial.shadowNode = lavaNodes.shadow\nlavaMaterial.lightNode = lavaNodes.light\n\n// Scene setup\nconst scene = new THREE.Scene()\nconst geometry = new THREE.SphereGeometry(1, 64, 64)\nconst mesh = new THREE.Mesh(geometry, lavaMaterial)\nscene.add(mesh)\n\n// Render loop\nconst renderer = new THREE.WebGLRenderer({ canvas })\nfunction animate(t) {\n  lavaMaterial.uniforms.time.value = t * 0.001\n  renderer.render(scene, camera)\n  requestAnimationFrame(animate)\n}` },
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
      // Existing data-visual canvases
      document.querySelectorAll('[data-visual]').forEach((canvas) => {
        const visualId = canvas.getAttribute('data-visual');
        if (canvas.id === 'playground-canvas') {
          drawCanvas(canvas, 'playground', time, { status: status.value, progress: progress.value });
        } else {
          drawCanvas(canvas, visualId, time, { status: status.value, progress: progress.value });
        }
      });

      // Hautly main entity canvas
      const hautlyCanvas = document.getElementById('hautly-canvas');
      if (hautlyCanvas) {
        const ctx = hautlyCanvas.getContext('2d');
        if (ctx) {
          const t = time / 1000;
          drawHautlyOrb(ctx, 800, 480, t, { mood: hautlyMood.value, form: hautlyForm.value });
        }
      }

      // Hautly gallery canvases (only animate on hover for performance)
      document.querySelectorAll('.hautly-gallery-canvas:not([data-animating])').forEach((canvas) => {
        const entity = canvas.getAttribute('data-entity');
        if (!entity) return;
        const [form, mood] = entity.split('-');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw a static initial frame
          drawHautlyOrb(ctx, 320, 200, 0, { mood, form });
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

    return {
      status, progress, activity, filter, search, categories, examples, filteredExamples,
      frameworks, eventLog, modalOpen, modalType, modalExample, modalFramework,
      applyPatch, nextEvent, copyCode, openExample, openFramework, closeModal, examplesByCategory,
      hautlyMood, hautlyForm, hautlyEnergy, hautlySpeech, hautlySpeechVisible, hautlyTyping,
      hautlyAgent, hautlyChatLog, hautlyForms, hautlyMoods, hautlyGallery,
      hautlySetForm, hautlySetMood, hautlySpeak, hautlySimulateAgent,
      hautlyMouseMove, hautlyMouseLeave, hautlyClick, hautlyGalleryHover, hautlyGalleryLeave,
    };
  },
}).mount('#app');
