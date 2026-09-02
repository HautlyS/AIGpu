const palette = {
  idle: [114, 233, 255],
  thinking: [158, 139, 255],
  working: [114, 233, 255],
  waiting: [255, 179, 107],
  success: [103, 239, 170],
  error: [255, 119, 153],
};

const playgroundState = { status: "working", progress: 0.72, activity: 0.9, phase: 0 };
const events = [
  { status: "thinking", progress: 0.15, activity: 0.62 },
  { status: "working", progress: 0.42, activity: 0.9 },
  { status: "working", progress: 0.72, activity: 0.9 },
  { status: "waiting", progress: 0.72, activity: 0.18 },
  { status: "success", progress: 1, activity: 0.25 },
];
let eventIndex = 2;

// roundRect polyfill for older browsers
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  else { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
}

function setupCanvas(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
  };
  resize();
  new ResizeObserver(resize).observe(canvas);
  return ctx;
}

function drawAgent(ctx, now, compact = false) {
  const width = ctx.canvas.width, height = ctx.canvas.height;
  const scale = Math.min(width, height) / 520;
  const cx = width / 2, cy = height / 2;
  const [r, g, b] = palette[playgroundState.status] || palette.working;
  const pulse = 1 + Math.sin(now * (1.3 + playgroundState.activity * 1.7) + playgroundState.phase) * (0.035 + playgroundState.activity * 0.025);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0e1b";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 245 * scale);
  glow.addColorStop(0, `rgba(${r},${g},${b},${0.2 + playgroundState.activity * 0.12})`);
  glow.addColorStop(0.45, `rgba(${r},${g},${b},0.05)`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, (90 + i * 25) * scale, (31 + i * 8) * scale, now * 0.24 + i * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.7 - i * 0.17})`;
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();
  }
  const ring = 102 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * playgroundState.progress);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, ring, -Math.PI / 2 + Math.PI * 2 * playgroundState.progress, -Math.PI / 2 + Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 5 * scale;
  ctx.stroke();
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 42 * scale);
  core.addColorStop(0, `rgba(255,255,255,${0.9 - playgroundState.activity * 0.12})`);
  core.addColorStop(0.2, `rgba(${r},${g},${b},.95)`);
  core.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 46 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!compact) {
    ctx.fillStyle = "rgba(214,220,255,.55)";
    ctx.font = `${Math.max(10, 11 * scale)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`status://${playgroundState.status}`, cx, cy + 155 * scale);
    ctx.fillStyle = `rgba(${r},${g},${b},.9)`;
    ctx.fillText(`${Math.round(playgroundState.progress * 100)}%  \u00b7  activity ${Math.round(playgroundState.activity * 100)}%`, cx, cy + 176 * scale);
  }
}

// ─── All Example Canvas Renderers ───────────────────────────────────────────
const renderers = {
  s02_fullscreen(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const angle = now * 0.4;
    const x1 = w / 2 + Math.cos(angle) * w * 0.4;
    const y1 = h / 2 + Math.sin(angle) * h * 0.4;
    const grad = ctx.createRadialGradient(x1, y1, 0, w / 2, h / 2, w * 0.6);
    grad.addColorStop(0, "rgba(114,233,255,0.5)");
    grad.addColorStop(0.4, "rgba(158,139,255,0.2)");
    grad.addColorStop(1, "#0c1428");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(114,233,255,0.08)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("GPU FULLSCREEN", w / 2, h - 12);
  },

  s03_sharing(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c1428";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const camAngle = now * 0.3;
    for (let i = 0; i < 2; i++) {
      const ox = (i === 0 ? -1 : 1) * w * 0.2;
      const angle = camAngle + i * 0.5;
      const size = 30 + Math.sin(now + i) * 5;
      ctx.save();
      ctx.translate(cx + ox, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = i === 0 ? "rgba(114,233,255,0.7)" : "rgba(158,139,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-size, -size, size * 2, size * 2);
      ctx.beginPath();
      ctx.moveTo(-size, -size); ctx.lineTo(-size * 0.6, -size * 0.6);
      ctx.moveTo(size, -size); ctx.lineTo(size * 0.6, -size * 0.6);
      ctx.moveTo(size, size); ctx.lineTo(size * 0.6, size * 0.6);
      ctx.moveTo(-size, size); ctx.lineTo(-size * 0.6, size * 0.6);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,179,107,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, cy); ctx.lineTo(cx + w * 0.12, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,179,107,0.6)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("shared: camera", cx, cy + 55);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.fillText("SHARING", w / 2, h - 12);
  },

  s04_shared_uniforms(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0e1530";
    ctx.fillRect(0, 0, w, h);
    const t = now * 0.5;
    for (let side = 0; side < 2; side++) {
      const ox = (side === 0 ? -1 : 1) * w * 0.25;
      ctx.beginPath();
      for (let x = -w * 0.18; x < w * 0.18; x += 2) {
        const y = Math.sin(x * 0.05 + t) * 20 + Math.sin(x * 0.08 - t * 0.7) * 10;
        if (x === -w * 0.18) ctx.moveTo(w / 2 + ox + x, h / 2 + y);
        else ctx.lineTo(w / 2 + ox + x, h / 2 + y);
      }
      ctx.strokeStyle = side === 0 ? "rgba(114,233,255,0.8)" : "rgba(255,126,242,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(103,239,170,0.6)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("globals.set({ time })", w / 2, h * 0.78);
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.fillText("SHARED UNIFORMS", w / 2, h - 12);
  },

  s05_fixits(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1a0c14";
    ctx.fillRect(0, 0, w, h);
    const pulse = 0.5 + Math.sin(now * 3) * 0.3;
    ctx.save();
    ctx.translate(w / 2, h / 2 - 20);
    ctx.beginPath();
    ctx.moveTo(0, -30); ctx.lineTo(-25, 15); ctx.lineTo(25, 15); ctx.closePath();
    ctx.strokeStyle = `rgba(255,119,153,${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,119,153,${pulse * 0.3})`;
    ctx.fill();
    ctx.fillStyle = `rgba(255,119,153,${pulse})`;
    ctx.font = "bold 20px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("!", 0, 10);
    ctx.restore();
    ctx.fillStyle = "rgba(255,119,153,0.7)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText('missing binding: set(color) before draw()', w / 2, h / 2 + 40);
    ctx.fillStyle = "rgba(255,179,107,0.5)";
    ctx.fillText("ownership flip: lib -> user rejected", w / 2, h / 2 + 55);
    ctx.fillStyle = "rgba(255,119,153,0.5)";
    ctx.fillText("FIXITS", w / 2, h - 12);
  },

  s06_scene(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const angle = now * 0.6;
    const size = 50;
    const cos = Math.cos, sin = Math.sin;
    const project = (x, y, z) => {
      const rx = x * cos(angle) - z * sin(angle);
      const rz = x * sin(angle) + z * cos(angle);
      const ry = y * cos(angle * 0.3) - rz * sin(angle * 0.3);
      const rz2 = y * sin(angle * 0.3) + rz * cos(angle * 0.3);
      const perspective = 200 / (200 + rz2);
      return [cx + rx * perspective, cy + ry * perspective, rz2];
    };
    const verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v => project(v[0]*size, v[1]*size, v[2]*size));
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    ctx.strokeStyle = "rgba(114,233,255,0.7)";
    ctx.lineWidth = 1.5;
    for (const [a, b] of edges) {
      ctx.beginPath();
      ctx.moveTo(verts[a][0], verts[a][1]);
      ctx.lineTo(verts[b][0], verts[b][1]);
      ctx.stroke();
    }
    const lx = cos(now * 0.4) * 60, ly = -40 + sin(now * 0.3) * 20;
    ctx.beginPath();
    ctx.arc(cx + lx, cy + ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,179,107,0.8)";
    ctx.fill();
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("SCENE", w / 2, h - 12);
  },

  s07_hdr_post(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0c1428");
    grad.addColorStop(0.3 + Math.sin(now * 0.3) * 0.2, "rgba(158,139,255,0.6)");
    grad.addColorStop(0.7, "rgba(114,233,255,0.4)");
    grad.addColorStop(1, "#0c1428");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const bloom = ctx.createRadialGradient(w * 0.6, h * 0.3, 0, w * 0.6, h * 0.3, w * 0.35);
    bloom.addColorStop(0, "rgba(255,255,255,0.15)");
    bloom.addColorStop(0.3, "rgba(114,233,255,0.08)");
    bloom.addColorStop(1, "transparent");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(158,139,255,0.5)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText("pass 1: rgba16float", 12, 20);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.fillText("pass 2: post composite", 12, 34);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("HDR POST", w / 2, h - 12);
  },

  s08_ping_pong(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, w, h);
    const t = (now * 0.8) % 2;
    const read = t < 1;
    const lx = w * 0.25, rx = w * 0.75;
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? lx : rx;
      const isActive = i === 0 ? read : !read;
      const alpha = isActive ? 0.7 : 0.2;
      ctx.fillStyle = `rgba(114,233,255,${alpha * 0.15})`;
      ctx.strokeStyle = `rgba(114,233,255,${alpha})`;
      ctx.lineWidth = 1.5;
      const size = 50;
      ctx.fillRect(x - size, h / 2 - size, size * 2, size * 2);
      ctx.strokeRect(x - size, h / 2 - size, size * 2, size * 2);
      ctx.fillStyle = `rgba(114,233,255,${alpha})`;
      ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText(read ? (i === 0 ? "READ" : "write") : (i === 0 ? "write" : "READ"), x, h / 2 + 4);
    }
    const arrowX = read ? lx + 60 : rx - 60;
    const arrowDir = read ? 1 : -1;
    ctx.strokeStyle = "rgba(103,239,170,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(arrowX, h / 2);
    ctx.lineTo(arrowX + arrowDir * 30, h / 2);
    ctx.moveTo(arrowX + arrowDir * 25, h / 2 - 5);
    ctx.lineTo(arrowX + arrowDir * 30, h / 2);
    ctx.lineTo(arrowX + arrowDir * 25, h / 2 + 5);
    ctx.stroke();
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.fillText("swap()", w / 2, h / 2 + 70);
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("PING-PONG", w / 2, h - 12);
  },

  s09_bundles(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c1428";
    ctx.fillRect(0, 0, w, h);
    const recordPhase = (now * 0.5) % 3;
    const replaying = recordPhase > 1.5;
    for (let i = 0; i < 3; i++) {
      const x = w * 0.2 + i * w * 0.3;
      const y = h * 0.5;
      const size = 25 + Math.sin(now + i) * 5;
      const alpha = replaying ? 0.8 : (i === 0 ? 0.5 : 0.2);
      ctx.fillStyle = `rgba(158,139,255,${alpha * 0.2})`;
      ctx.strokeStyle = `rgba(158,139,255,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `rgba(158,139,255,${alpha})`;
      ctx.font = "8px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText(i === 0 ? "record" : `replay ${i}`, x, y + size + 16);
    }
    ctx.fillStyle = "rgba(255,179,107,0.6)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(replaying ? "bundle.replay()" : "bundle.record()", w / 2, 30);
    ctx.fillStyle = "rgba(158,139,255,0.5)";
    ctx.fillText("BUNDLES", w / 2, h - 12);
  },

  s10_group_claim(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    const count = 6;
    const barW = w * 0.1, gap = w * 0.03;
    const startX = (w - count * (barW + gap)) / 2;
    for (let i = 0; i < count; i++) {
      const x = startX + i * (barW + gap);
      const offset = Math.sin(now * 1.5 + i * 0.8) * 0.3 + 0.5;
      const barH = offset * (h * 0.5);
      const y = h * 0.7 - barH;
      ctx.fillStyle = `rgba(114,233,255,${0.2 + offset * 0.3})`;
      ctx.fillRect(x, y, barW, barH);
      ctx.strokeStyle = `rgba(114,233,255,${0.4 + offset * 0.3})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barW, barH);
      ctx.fillStyle = "rgba(114,233,255,0.5)";
      ctx.font = "8px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText(`offset:${(offset * 100).toFixed(0)}`, x + barW / 2, h * 0.75);
    }
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("GROUP CLAIM", w / 2, h - 12);
  },

  s11_compute(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, w, h);
    const count = 60;
    for (let i = 0; i < count; i++) {
      const seed = i * 137.508;
      const px = ((seed * 7.3 + now * 20 * (0.3 + (i % 5) * 0.15)) % w + w) % w;
      const py = ((seed * 3.7 + now * 10 * (0.2 + (i % 3) * 0.1)) % h + h) % h;
      const size = 1.5 + Math.sin(now + i) * 0.8;
      const alpha = 0.3 + Math.sin(now * 1.5 + i * 0.5) * 0.2;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? `rgba(114,233,255,${alpha})` : i % 3 === 1 ? `rgba(158,139,255,${alpha})` : `rgba(103,239,170,${alpha})`;
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(114,233,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 15; i++) {
      const seed = i * 137.508;
      const x1 = ((seed * 7.3 + now * 20 * (0.3 + (i % 5) * 0.15)) % w + w) % w;
      const y1 = ((seed * 3.7 + now * 10 * (0.2 + (i % 3) * 0.1)) % h + h) % h;
      const x2 = ((seed * 11.3 + now * 20 * (0.3 + ((i + 3) % 5) * 0.15)) % w + w) % w;
      const y2 = ((seed * 5.1 + now * 10 * (0.2 + ((i + 2) % 3) * 0.1)) % h + h) % h;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("COMPUTE", w / 2, h - 12);
  },

  s12_scheduling_resize(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0e1530";
    ctx.fillRect(0, 0, w, h);
    const t = (now * 0.3) % 2;
    const grow = t < 1 ? t : 1;
    const size = 20 + grow * 50;
    ctx.strokeStyle = `rgba(114,233,255,${0.3 + grow * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w / 2 - size, h / 2 - size, size * 2, size * 2);
    ctx.strokeStyle = `rgba(114,233,255,${0.1 + grow * 0.05})`;
    ctx.lineWidth = 0.5;
    const step = size * 2 / 8;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(w / 2 - size + i * step, h / 2 - size); ctx.lineTo(w / 2 - size + i * step, h / 2 + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2 - size, h / 2 - size + i * step); ctx.lineTo(w / 2 + size, h / 2 - size + i * step); ctx.stroke();
    }
    ctx.fillStyle = "rgba(114,233,255,0.6)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(`target.resize([${Math.round(size / 3)}, ${Math.round(size / 3)}])`, w / 2, h / 2 + size + 20);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.fillText("RESIZE", w / 2, h - 12);
  },

  s13_headless(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const size = 60;
    ctx.fillStyle = "rgba(103,239,170,0.1)";
    ctx.strokeStyle = "rgba(103,239,170,0.6)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
    ctx.strokeRect(cx - size, cy - size, size * 2, size * 2);
    const pixSize = size * 2 / 8;
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const v = Math.sin(px * 0.8 + py * 0.6) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(103,239,170,${v * 0.4})`;
        ctx.fillRect(cx - size + px * pixSize + 1, cy - size + py * pixSize + 1, pixSize - 2, pixSize - 2);
      }
    }
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("effect.draw({ target })", w / 2, cy + size + 20);
    ctx.fillText("no frame loop \u2014 one-shot render", w / 2, cy + size + 34);
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("HEADLESS", w / 2, h - 12);
  },

  cockpit(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a1424";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.45);
    glow.addColorStop(0, "rgba(114,233,255,0.25)");
    glow.addColorStop(0.5, "rgba(114,233,255,0.04)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.35 - i * 20, h * 0.15 - i * 6, now * 0.3 + i * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(114,233,255,${0.6 - i * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    const progress = (Math.sin(now * 0.5) + 1) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = "rgba(114,233,255,0.9)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    core.addColorStop(0, "rgba(255,255,255,0.9)");
    core.addColorStop(0.3, "rgba(114,233,255,0.8)");
    core.addColorStop(1, "transparent");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(114,233,255,0.6)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("OPS", cx, h - 12);
  },

  dashboard(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a1424";
    ctx.fillRect(0, 0, w, h);
    const agents = [
      { name: "planner", status: "working", progress: 0.72, color: [114, 233, 255] },
      { name: "researcher", status: "thinking", progress: 0.45, color: [158, 139, 255] },
      { name: "reviewer", status: "idle", progress: 0.1, color: [103, 239, 170] },
    ];
    const cardW = w * 0.28, gap = w * 0.03;
    const startX = (w - agents.length * cardW - (agents.length - 1) * gap) / 2;
    agents.forEach((a, i) => {
      const x = startX + i * (cardW + gap);
      const y = h * 0.2;
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.strokeStyle = `rgba(${a.color.join(",")},0.3)`;
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardW, h * 0.55, 6);
      ctx.fill();
      ctx.stroke();
      const pulse = 1 + Math.sin(now * 2 + i) * 0.2;
      ctx.beginPath();
      ctx.arc(x + 16, y + 20, 5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${a.color.join(",")},0.8)`;
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "left";
      ctx.fillText(a.name, x + 28, y + 24);
      const barY = y + 40;
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 12, barY, cardW - 24, 6);
      const animProgress = a.progress + Math.sin(now * 0.5 + i) * 0.1;
      ctx.fillStyle = `rgba(${a.color.join(",")},0.6)`;
      ctx.fillRect(x + 12, barY, (cardW - 24) * Math.max(0, Math.min(1, animProgress)), 6);
      ctx.fillStyle = `rgba(${a.color.join(",")},0.5)`;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(a.status, x + 12, barY + 24);
    });
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("DASHBOARD", w / 2, h - 12);
  },

  replay(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#12182c";
    ctx.fillRect(0, 0, w, h);
    const lx = w * 0.15, rx = w * 0.85;
    const ly = h * 0.65, ry = h * 0.35;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    const lineGrad = ctx.createLinearGradient(lx, ly, rx, ry);
    lineGrad.addColorStop(0, "rgba(158,139,255,0.8)");
    lineGrad.addColorStop(0.5, "rgba(114,233,255,0.8)");
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const nodes = [
      { t: 0.2, color: [114, 233, 255] },
      { t: 0.45, color: [158, 139, 255] },
      { t: 0.7, color: [103, 239, 170] },
    ];
    for (const { t, color } of nodes) {
      const nx = lx + (rx - lx) * t;
      const ny = ly + (ry - ly) * t;
      const pulse = 1 + Math.sin(now * 2 + t * 6) * 0.2;
      ctx.beginPath();
      ctx.arc(nx, ny, 6 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.join(",")},0.3)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${color.join(",")},0.9)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const scanT = (now * 0.3) % 1;
    const sx = lx + (rx - lx) * scanT;
    const sy = ly + (ry - ly) * scanT;
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.fillStyle = "rgba(158,139,255,0.6)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("REPLAY", w / 2, h - 12);
  },

  transmission(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c1428";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const angle = now * 0.4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const s = 40;
    const skew = Math.sin(now * 0.3) * 8;
    ctx.strokeStyle = "rgba(114,233,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.strokeRect(-s + skew, -s - skew * 0.5, s * 2, s * 2);
    ctx.beginPath();
    ctx.moveTo(-s, -s); ctx.lineTo(-s + skew, -s - skew * 0.5);
    ctx.moveTo(s, -s); ctx.lineTo(s + skew, -s - skew * 0.5);
    ctx.moveTo(s, s); ctx.lineTo(s + skew, s - skew * 0.5);
    ctx.moveTo(-s, s); ctx.lineTo(-s + skew, s - skew * 0.5);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const ry = -s + (i / 4) * s * 2;
      const refract = Math.sin(now + i) * 12;
      ctx.strokeStyle = `rgba(158,139,255,${0.2 + Math.sin(now + i) * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-s - 20, ry);
      ctx.lineTo(-s, ry);
      ctx.lineTo(-s + 15 + refract, ry + refract * 0.5);
      ctx.lineTo(s - 15 + refract, ry + refract * 0.5);
      ctx.lineTo(s, ry);
      ctx.lineTo(s + 20, ry);
      ctx.stroke();
    }
    ctx.restore();
    const ior = 1.5 + Math.sin(now * 0.2) * 0.1;
    ctx.fillStyle = "rgba(158,139,255,0.6)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(`IOR: ${ior.toFixed(2)}`, w / 2, h - 24);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("TRANSMISSION", w / 2, h - 12);
  },

  gallery(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    const colors = [
      [114, 233, 255], [158, 139, 255], [255, 126, 242], [255, 179, 107],
      [103, 239, 170], [255, 119, 153], [114, 233, 255], [158, 139, 255],
    ];
    const names = ["anime", "enterprise", "psychedelic", "calm", "celebration", "glitch", "minimal", "cosmic"];
    const cols = 4, rows = 2;
    const cw = w / cols, ch = (h - 24) / rows;
    for (let i = 0; i < 8; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cw, y = row * ch;
      const pulse = 0.15 + Math.sin(now * 1.2 + i * 0.8) * 0.1;
      const [r, g, b] = colors[i];
      ctx.fillStyle = `rgba(${r},${g},${b},${pulse})`;
      ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
      ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.font = "8px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText(names[i], x + cw / 2, y + ch - 8);
    }
    ctx.fillStyle = "rgba(158,139,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("GALLERY", w / 2, h - 8);
  },

  fluid(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, w, h);
    const cols = 12, rows = 8;
    const cw = w / cols, ch = h / rows;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = gx * cw + cw / 2;
        const y = gy * ch + ch / 2;
        const angle = Math.sin(gx * 0.5 + now) * Math.cos(gy * 0.4 + now * 0.7) * Math.PI;
        const len = 8 + Math.sin(now + gx + gy) * 4;
        const dx = Math.cos(angle) * len;
        const dy = Math.sin(angle) * len;
        const alpha = 0.2 + Math.abs(Math.sin(now + gx * 0.3 + gy * 0.5)) * 0.3;
        ctx.strokeStyle = `rgba(114,233,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + dx - Math.cos(angle - 0.4) * 3, y + dy - Math.sin(angle - 0.4) * 3);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("FLUID", w / 2, h - 12);
  },

  lava(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      for (let x = 0; x < w; x += 6) {
        const n = Math.sin(x * 0.02 + now) * Math.cos(y * 0.02 + now * 0.7) +
                  Math.sin(x * 0.04 - now * 0.5) * Math.cos(y * 0.03 + now * 0.3) * 0.5;
        const v = (n + 1) / 2;
        const r = Math.floor(v * 255);
        const g = Math.floor(v * 80 + 20);
        const b = Math.floor((1 - v) * 30);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 6, 6);
      }
    }
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.4);
    glow.addColorStop(0, "rgba(255,100,0,0.2)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,179,107,0.6)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("LAVA TSL", w / 2, h - 12);
  },

  agent_animation(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) / 400;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    const [r, g, b] = [114, 233, 255];
    const pulse = 1 + Math.sin(now * 1.5) * 0.04;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180 * scale);
    glow.addColorStop(0, "rgba(114,233,255,0.2)");
    glow.addColorStop(0.5, "rgba(114,233,255,0.04)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, (70 + i * 20) * scale, (25 + i * 7) * scale, now * 0.24 + i * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.6 - i * 0.15})`;
      ctx.lineWidth = Math.max(1, 1.2 * scale);
      ctx.stroke();
    }
    const progress = (Math.sin(now * 0.5) + 1) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 80 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = "round";
    ctx.stroke();
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 35 * scale);
    core.addColorStop(0, "rgba(255,255,255,0.85)");
    core.addColorStop(0.2, `rgba(${r},${g},${b},0.9)`);
    core.addColorStop(1, "transparent");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 35 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("agentAnimation()", w / 2, h - 12);
  },

  mesh_edit(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const angle = now * 0.3;
    const pts = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + angle;
      const r = 50 + Math.sin(now + i * 0.7) * 10;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    ctx.strokeStyle = "rgba(114,233,255,0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      for (let j = i + 2; j < count; j++) {
        if (j - i === count - 1) continue;
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
    const selIdx = Math.floor((now * 2) % count);
    const [sx, sy] = pts[selIdx];
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,179,107,0.8)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,179,107,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,179,107,0.5)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(`vertex[${selIdx}] selected`, w / 2, h - 24);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("MESH EDIT", w / 2, h - 12);
  },

  dom_mount(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c1428";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const cw = w * 0.5, ch = h * 0.4;
    ctx.strokeStyle = "rgba(114,233,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const progress = (Math.sin(now * 0.7) + 1) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = "rgba(114,233,255,0.8)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = "rgba(103,239,170,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + cw / 2 + 10, cy - 10);
    ctx.lineTo(cx + cw / 2 + 30, cy - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(103,239,170,0.6)";
    ctx.font = "8px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText("controller.set()", cx + cw / 2 + 12, cy - 16);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("<canvas>", cx, cy + ch / 2 + 16);
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("DOM MOUNT", w / 2, h - 12);
  },

  state_tools(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    const boxes = [
      { label: "store", x: 0.12, color: [114, 233, 255] },
      { label: "registry", x: 0.37, color: [158, 139, 255] },
      { label: "recorder", x: 0.62, color: [255, 179, 107] },
      { label: "replay", x: 0.87, color: [103, 239, 170] },
    ];
    const cy = h * 0.4;
    boxes.forEach((b, i) => {
      const x = w * b.x;
      const pulse = 0.5 + Math.sin(now * 1.5 + i * 1.2) * 0.2;
      ctx.fillStyle = `rgba(${b.color.join(",")},${pulse * 0.1})`;
      ctx.strokeStyle = `rgba(${b.color.join(",")},${pulse})`;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x - 35, cy - 18, 70, 36, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `rgba(${b.color.join(",")},${pulse + 0.2})`;
      ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText(b.label, x, cy + 3);
      if (i < boxes.length - 1) {
        const nx = w * boxes[i + 1].x;
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 38, cy);
        ctx.lineTo(nx - 38, cy);
        ctx.stroke();
      }
    });
    ctx.fillStyle = "rgba(255,179,107,0.5)";
    ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("STATE TOOLS", w / 2, h - 12);
  },
};

// ─── Vue 3 App ──────────────────────────────────────────────────────────────
const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

const examples = [
  // GPU Core — by-example series (all import from aigpu/node)
  { id: "s02_fullscreen", title: "Minimal fullscreen effect", category: "GPU Core", tags: "gpu", description: "The smallest GPU fragment shader through effect(). Time-based gradient with grid overlay.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s02-fullscreen", code: `import { init, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst colorTarget = target(gpu, { size: [8, 8], format: "rgba8unorm" });\nconst wave = effect(gpu, WGSL, { label: "wave", set: { speed: 2 } });\nwave.set({ time: Math.PI / 4 });\nframe(gpu, (f) => f.pass({ target: colorTarget }, (p) => p.draw(wave)));` },
  { id: "s03_sharing", title: "Shared bind groups", category: "GPU Core", tags: "gpu", description: "Two draws share one camera Uniform while each keeps its own per-draw params.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s03-sharing", code: `import { init, Uniform, draw, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst camera = new Uniform(gpu.device, { size: 16, label: "camera" });\ncamera.write(new Float32Array([1, 0, 0, 0]));\n\nconst cube = draw(gpu, { shader: CUBE, label: "cube" });\nconst floor = draw(gpu, { shader: FLOOR, label: "floor" });\ncube.set({ camera, params: { color: [1, 0, 0, 1] } });\nfloor.set({ camera, params: { color: [0, 1, 0, 1] } });\n\nframe(gpu, (f) => {\n  f.pass({ target, clear: [0, 0, 0, 1] }, (p) => { p.draw(cube); p.draw(floor); });\n});` },
  { id: "s04_shared_uniforms", title: "Cross-effect shared uniforms", category: "GPU Core", tags: "gpu", description: "Multiple effects consume the same uniforms() group. Changes propagate atomically.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s04-shared-uniforms", code: `import { init, effect, frame, target, uniforms } from "aigpu/node";\n\nconst gpu = await init();\nconst globals = uniforms(gpu, { time: 0, resolution: [800, 600] });\nconst wave = effect(gpu, waveWGSL, { bindings: { globals } });\nconst tint = effect(gpu, tintWGSL, { bindings: { globals } });\nframe(gpu, (f) => {\n  globals.set({ time: f.time });\n  f.pass(out, wave, tint);\n});` },
  { id: "s05_fixits", title: "Developer fix-it errors", category: "GPU Core", tags: "gpu", description: "Actionable error messages for missing bindings and ownership violations.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s05-fixits", code: `import { init, effect, target } from "aigpu/mock";\n\nconst gpu = await init();\n// Throws: "missing binding: set(color) before draw()"\nconst vis = effect(gpu, shader);\nvis.draw({ target: t }); // Error with fix-it message` },
  { id: "s06_scene", title: "3D scene with camera and lights", category: "GPU Core", tags: "gpu", description: "Perspective camera, orbit rotation, box geometry, and per-pixel diffuse lighting.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s06-scene", code: `import { init, draw, frame, geometry, target } from "aigpu/node";\nimport { box, orbit, perspectiveCamera } from "aigpu/scene";\n\nconst gpu = await init();\nconst colorTarget = target(gpu, { size: [32, 32], format: "rgba8unorm", depth: true });\nconst cam = perspectiveCamera({ fov: 45, aspect: 1, position: [2, 2, 3], target: [0, 0, 0] });\nconst cube = draw(gpu, { shader: LIT_WGSL, geometry: geometry(gpu, box({ size: 1 })), targets: [colorTarget] });\ncube.set({ camera: { viewProjection: cam.viewProjection }, model: { model: orbit(0) }, light: { direction: [-1, -1, -1], intensity: 1 } });\nframe(gpu, (f) => f.pass({ target: colorTarget, clear: [0.05, 0.05, 0.08, 1] }, (p) => p.draw(cube)));` },
  { id: "s07_hdr_post", title: "HDR render targets + post", category: "GPU Core", tags: "gpu", description: "Two-pass pipeline: render to rgba16float, then composite via post effect.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s07-hdr-post", code: `import { init, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst sceneTarget = target(gpu, { size: [800, 600], format: "rgba16float" });\nconst post = effect(gpu, postWGSL);\nframe(gpu, (f) => {\n  f.pass(sceneTarget, sceneEffect);\n  f.pass(out, post, { src: sceneTarget });\n});` },
  { id: "s08_ping_pong", title: "Ping-pong double buffering", category: "GPU Core", tags: "gpu", description: "pingPong() alternates read/write textures for iterative GPU effects.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s08-ping-pong", code: `import { init, effect, frame, pingPong } from "aigpu/node";\n\nconst gpu = await init();\nconst buf = pingPong(gpu, 8, 8, { format: "rgba8unorm" });\nconst fill = effect(gpu, FILL, { label: "fill" });\nconst copy = effect(gpu, COPY, { label: "copy" });\n\nframe(gpu, (f) => f.pass({ target: buf.write }, (p) => p.draw(fill)));\nbuf.swap();\nframe(gpu, (f) => f.pass({ target: buf.write }, (p) => {\n  copy.set({ src: buf.read, texel: buf.read.texelSize });\n  p.draw(copy);\n}));` },
  { id: "s09_bundles", title: "Render bundles", category: "GPU Core", tags: "gpu", description: "Pre-record draw commands into a bundle for replay. Uniform-driven bundles stay live.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s09-bundles", code: `import { init, bundle, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst floor = bundle(gpu, (rec) => {\n  rec.setPipeline(floorPipeline);\n  rec.draw(6);\n});\nframe(gpu, (f) => {\n  f.replay(floor); // Replays with current uniforms\n  f.pass(out, overlay);\n});` },
  { id: "s10_group_claim", title: "Raw bind group claim", category: "GPU Core", tags: "gpu", description: "Bypass set() entirely: hand-craft a GPUBindGroup with dynamic offsets.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s10-group-claim", code: `import { init, draw, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst bg = gpu.device.createBindGroup({ ... });\nframe(gpu, (f) => {\n  const d = draw(gpu, { shader, geometry });\n  d.group(0, bg); // Raw bind group at slot 0\n  d.draw({ target: t, dynamicOffsets: [0, 256] });\n});` },
  { id: "s11_compute", title: "GPU compute shader", category: "GPU Core", tags: "gpu", description: "Dispatch a compute kernel with storage buffers. Physics simulation with gravity.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s11-compute", code: `import { init, compute } from "aigpu/node";\n\nconst gpu = await init();\nconst src = gpu.device.createBuffer({ size: 16, usage: ["storage", "copy_dst", "copy_src"] });\nconst dst = gpu.device.createBuffer({ size: 16, usage: ["storage", "copy_dst", "copy_src"] });\nsrc.write(new Float32Array([1, 2, 3, 4]));\n\nconst sim = compute(gpu, SIM, { label: "sim" });\nsim.set({ dt: 0.5, src, dst });\nsim.dispatch(1);` },
  { id: "s12_scheduling_resize", title: "Runtime target resize", category: "GPU Core", tags: "gpu", description: "target.resize() reallocates the backing texture. texelSize auto-updates.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s12-scheduling-resize", code: `import { init, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nlet t = target(gpu, { size: [4, 4], format: "rgba8unorm" });\nconst vis = effect(gpu, shader);\nframe(gpu, (f) => {\n  f.pass(t, vis);\n  if (f.frameCount === 60) t.resize([8, 8]);\n});` },
  { id: "s13_headless", title: "Headless one-shot render", category: "GPU Core", tags: "gpu", description: "effect.draw() without a frame loop. One-shot render for CI and pixel tests.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s13-headless", code: `import { init, effect, target } from "aigpu/node";\n\nconst gpu = await init();\nconst colorTarget = target(gpu, { size: [8, 8], format: "rgba8unorm" });\nconst p = effect(gpu, GRADIENT, { label: "gradient" });\np.set({ time: 1.25, speed: 1 });\np.draw({ target: colorTarget });\n// colorTarget is ready for pixel inspection` },

  // Agent Animation — AIGpu exclusive
  { id: "cockpit", title: "Agent cockpit", category: "Agent", tags: "agents", description: "Framework-free agentAnimation() API. Status events drive a live GPU visual.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/agent-cockpit", code: `import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";\n\nconst gpu = await init();\nconst visual = agentAnimation(gpu, { initial: { status: "thinking" } });\nconst canvasSurface = surface(gpu, document.querySelector("canvas"));\nconst time = clock(gpu);\n\nframeLoop(gpu, (frame) => {\n  visual.tick(time.time);\n  frame.pass(canvasSurface, visual.effect);\n});\n\nvisual.set({ status: "working", progress: 0.6 });` },
  { id: "dashboard", title: "Multi-agent ops dashboard", category: "Agent", tags: "agents", description: "createAgentRegistry() manages multiple agents with stable card objects.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/agent-ops-dashboard", code: `import { createAgentRegistry } from "aigpu/tools";\n\nconst registry = createAgentRegistry();\nregistry.ensure("planner", { status: "idle", progress: 0, activity: 0 });\nregistry.ensure("researcher", { status: "idle", progress: 0, activity: 0 });\nregistry.ensure("reviewer", { status: "idle", progress: 0, activity: 0 });\n\n// Get stable card objects for any UI\nconst cards = registry.ids.map((id) => {\n  const state = registry.get(id).snapshot.state;\n  return { id, label: id, status: state.status, progress: state.progress };\n});\n\nregistry.subscribe((snapshot, event) => render(snapshot.agents));` },
  { id: "replay", title: "Event recording and replay", category: "Agent", tags: "agents", description: "recordAgentEvents() captures events, replayAgentEvents() replays at speed.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/event-replay", code: `import { createAgentStore, recordAgentEvents, replayAgentEvents } from "aigpu/tools";\n\nconst store = createAgentStore({ status: "thinking" });\nconst recorder = recordAgentEvents((listener) =>\n  store.subscribe((_snapshot, event) => listener(event)),\n  { now: () => 0 }\n);\nstore.set({ status: "working", progress: 0.4 });\nstore.set({ status: "success", progress: 1 });\nrecorder.stop();\n\nconst replay = replayAgentEvents(recorder.events, deliver, { speed: 4 });\nreplay.play();` },
  { id: "agent_animation", title: "Built-in agent animation shader", category: "Agent", tags: "agents gpu", description: "The core WGSL agent status shader. 6 statuses, orbital rings, progress arc.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/agent-cockpit", code: `import { agentAnimation, init, surface, frameLoop } from "aigpu";\n\nconst gpu = await init();\nconst out = surface(gpu, canvas);\nconst agent = agentAnimation(gpu, {\n  initial: { status: "idle" },\n  colors: { working: [114, 233, 255] }\n});\nframeLoop(gpu, (f) => f.pass(out, agent));\nagent.set({ status: "working", progress: 0.6 });` },
  { id: "state_tools", title: "Agent state tools", category: "Agent", tags: "agents", description: "createAgentStore, createAgentRegistry, recordAgentEvents, replayAgentEvents.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/event-replay", code: `import { createAgentStore, createAgentRegistry } from "aigpu/tools";\n\n// Single agent state bridge\nconst store = createAgentStore({ status: "idle" });\nstore.set({ status: "working", progress: 0.5 });\nstore.dispatch({ type: "progress", patch: { progress: 0.8 } });\nstore.subscribe((snap, evt) => console.log(snap, evt));\n\n// Multi-agent registry\nconst reg = createAgentRegistry();\nreg.ensure("agent-1", { status: "thinking" });` },

  // Advanced — GPU
  { id: "transmission", title: "Glass transmission shader", category: "Advanced", tags: "gpu", description: "Physically-based glass with environment-mapped sky, IOR, roughness, dispersion.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/transmission", code: `import GUI from "lil-gui";\nimport { surface, type Gpu, type Surface } from "aigpu";\nimport { cameraView } from "./camera";\nimport { createScene, renderScene, DEFAULT_CONTROLS } from "./scene";\n\nfunction createRenderer({ canvas }) {\n  let gpu: Gpu, output: Surface, scene: Scene;\n  const controls = { ...DEFAULT_CONTROLS };\n  // ... setup, resize, animate\n  output = surface(gpu, canvas);\n  scene = createScene(gpu, controls);\n  function frame() {\n    renderScene(gpu, output, scene, controls);\n    requestAnimationFrame(frame);\n  }\n  requestAnimationFrame(frame);\n}` },
  { id: "fluid", title: "GPU fluid simulation", category: "Advanced", tags: "gpu", description: "WGSL compute shaders for divergence, pressure projection, velocity advection.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/fluid", code: `// WGSL compute shaders — divergence, pressure, advection\n// Uses @aigpu/wgsl module imports for shared utilities\nimport { compute, storage, frame } from "aigpu/node";\nimport { init } from "aigpu/node";\n\nconst gpu = await init();\nconst grid = storage(gpu, gridData);\nconst divergenceJob = compute(gpu, divergenceWGSL, { bindings: { grid } });\nconst projectJob = compute(gpu, projectWGSL, { bindings: { grid } });\nframe(gpu, (f) => {\n  f.run(divergenceJob);\n  f.run(projectJob);\n});` },
  { id: "lava", title: "Three.js TSL bridge", category: "Advanced", tags: "gpu", description: "Import WGSL via @aigpu/wgsl, connect to three.js MeshPhysicalNodeMaterial.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/three-tsl", code: `import * as THREE from "three/webgpu";\nimport { wgsl, wgslFn } from "three/tsl";\nimport lavaWGSL from "./lava.wgsl";\n\nconst lavaGlow = wgslFn(lavaWGSL, "lavaGlow");\nconst crustHeight = wgslFn(lavaWGSL, "crustHeight");\n\nconst material = new THREE.MeshPhysicalNodeMaterial();\nmaterial.emissiveNode = lavaGlow({ time, uv });\nmaterial.displacementNode = crustHeight({ time, uv });` },
  { id: "mesh_edit", title: "Mesh editing operators", category: "Advanced", tags: "gpu", description: "Half-edge mesh with extrude, bevel, subdivide, bridge, dissolve, heal.", source: "https://github.com/hautlys/AIGpu/tree/main/packages/render/src/edit", code: `import { toEditable, extrude, bevel, recomputeNormals } from "@aigpu/render/edit";\nimport { geometry, box } from "aigpu/scene";\n\nconst gpu = await init();\nconst geo = geometry(gpu, box({ size: 1 }));\nconst mesh = toEditable(geo);\nextrude(mesh, { selection: topFace, distance: 0.5 });\nbevel(mesh, { selection: topEdges, width: 0.1 });\nrecomputeNormals(mesh);` },
  { id: "gallery", title: "Visual gallery (8 recipes)", category: "Agent", tags: "agents gpu", description: "8 WGSL recipes: anime, enterprise, psychedelic, calm, celebration, glitch, minimal, cosmic.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/visual-gallery", code: `import { compile } from "@aigpu/wgsl";\nimport { readFile } from "node:fs/promises";\nimport type { AgentAnimationPatch, AgentStatus } from "aigpu";\n\nconst recipe = await readFile("./shaders/anime-hologram.wgsl", "utf-8");\nconst shader = compile(recipe);\nconst agent = agentAnimation(gpu, { shader });\nagent.set({ status: "success", progress: 1.0 });` },

  // Framework
  { id: "dom_mount", title: "DOM canvas mount", category: "Framework", tags: "ui", description: "mountAgentCanvas() / mountAgentCanvasSelector() — framework-free DOM mount.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/framework-integrations", code: `import { mountAgentCanvasSelector } from "aigpu";\n\nconst controller = mountAgentCanvasSelector("#agent-canvas", {\n  initial: { status: "thinking" }\n});\ncontroller.set({ progress: 0.6 });\n// Cleanup:\ncontroller.destroy();` },
];

const categories = [
  { id: "gpu", label: "GPU" },
  { id: "agents", label: "Agents" },
  { id: "ui", label: "UI" },
];

const frameworks = [
  { name: "HTML / JavaScript", desc: "Mount a canvas directly with an explicit controller and no component runtime.", code: 'import { mountAgentCanvas } from "aigpu";\n\nconst controller = mountAgentCanvas(canvas, {\n  initial: { status: "thinking" }\n});\ncontroller.set({ progress: 0.6 });' },
  { name: "React", desc: "Use a small optional hook. The core package never imports React.", code: 'import { useAgentCanvas } from "@aigpu/react";\n\nexport function Agent({ progress }) {\n  const { canvasRef, mounted } = useAgentCanvas({\n    label: "react-agent",\n    initial: { status: "thinking", activity: 0.7 },\n    patch: { status: "working", progress, activity: 0.9 },\n  });\n  return (\n    <div role="status" aria-live="polite">\n      <canvas ref={canvasRef} aria-label="React agent" />\n      <span>{mounted ? "working" : "initializing"}</span>\n    </div>\n  );\n}' },
  { name: "Vue 3", desc: "Connect the composable to refs and watchers while cleanup stays automatic.", code: '<script setup lang="ts">\nimport { ref, watch } from "vue";\nimport { useAgentCanvas } from "@aigpu/vue";\n\nconst status = ref("working");\nconst progress = ref(0.45);\nconst { canvas, controller, mounted } = useAgentCanvas({\n  label: "vue-agent",\n  initial: { status: "thinking", activity: 0.7 },\n});\nwatch([status, progress], () =>\n  controller.value?.set({ status: status.value, progress: progress.value })\n);\n</script>\n\n<template>\n  <div role="status" aria-live="polite">\n    <canvas ref="canvas" aria-label="Vue agent" />\n    <span>{{ mounted ? status : "initializing" }}</span>\n  </div>\n</template>' },
  { name: "Svelte", desc: "Use the standard action contract with no Svelte runtime import in the adapter.", code: '<script lang="ts">\n  import { agentCanvas } from "@aigpu/svelte";\n  let status = "thinking" as const;\n  let progress = 0.2;\n  $: options = {\n    initial: { status: "thinking" as const, activity: 0.7 },\n    patch: { status, progress, activity: status === "working" ? 0.9 : 0.25 },\n  };\n</script>\n\n<div role="status" aria-live="polite">\n  <canvas use:agentCanvas={options} aria-label="Svelte agent" />\n  <span>{status}</span>\n</div>' },
];

createApp({
  setup() {
    const filter = ref("all");
    const search = ref("");
    const status = ref("working");
    const progress = ref(72);
    const activity = ref(90);
    const eventLog = ref('{ status: "working", progress: 0.72 }');

    function examplesByCategory(cat) {
      return examples.filter((e) => e.tags.includes(cat));
    }

    const filteredExamples = computed(() => {
      let list = examples;
      if (filter.value !== "all") {
        list = list.filter((e) => e.tags.includes(filter.value));
      }
      const q = search.value.toLowerCase().trim();
      if (q) {
        list = list.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q)
        );
      }
      return list;
    });

    async function copyCode(code, event) {
      try {
        await navigator.clipboard.writeText(code);
        const btn = event.currentTarget;
        const orig = btn.innerHTML;
        btn.innerHTML = "Copied \u2713";
        setTimeout(() => { btn.innerHTML = orig; }, 1200);
      } catch {
        window.prompt("Copy this snippet:", code);
      }
    }

    function applyPatch() {
      playgroundState.status = status.value;
      playgroundState.progress = progress.value / 100;
      playgroundState.activity = activity.value / 100;
      eventLog.value = `{ status: "${playgroundState.status}", progress: ${playgroundState.progress.toFixed(2)}, activity: ${playgroundState.activity.toFixed(2)} }`;
    }

    function nextEvent() {
      const e = events[eventIndex % events.length];
      playgroundState.status = e.status;
      playgroundState.progress = e.progress;
      playgroundState.activity = e.activity;
      status.value = e.status;
      progress.value = Math.round(e.progress * 100);
      activity.value = Math.round(e.activity * 100);
      eventLog.value = `{ status: "${e.status}", progress: ${e.progress.toFixed(2)}, activity: ${e.activity.toFixed(2)} }`;
      eventIndex++;
    }

    // Canvas animation loop
    let raf;

    function animate(now) {
      state.phase += 0.016 * (0.8 + playgroundState.activity * 2);

      const heroCanvas = document.querySelector("#hero-canvas");
      if (heroCanvas && heroCanvas._ctx) drawAgent(heroCanvas._ctx, now / 1000, true);

      const pgCanvas = document.querySelector("#playground-canvas");
      if (pgCanvas && pgCanvas._ctx) drawAgent(pgCanvas._ctx, now / 1000);

      document.querySelectorAll(".example-canvas").forEach((canvas) => {
        if (!canvas._ctx) canvas._ctx = setupCanvas(canvas);
        const type = canvas.dataset.visual;
        if (canvas._ctx && type && renderers[type]) renderers[type](canvas._ctx, now / 1000);
      });

      raf = requestAnimationFrame(animate);
    }

    onMounted(() => {
      const heroCanvas = document.querySelector("#hero-canvas");
      if (heroCanvas) heroCanvas._ctx = setupCanvas(heroCanvas);
      const pgCanvas = document.querySelector("#playground-canvas");
      if (pgCanvas) pgCanvas._ctx = setupCanvas(pgCanvas);
      raf = requestAnimationFrame(animate);
    });

    onUnmounted(() => { if (raf) cancelAnimationFrame(raf); });

    return {
      filter, search, status, progress, activity, eventLog,
      examples, categories, frameworks, filteredExamples,
      examplesByCategory, copyCode, applyPatch, nextEvent,
    };
  },
}).mount("#app");
