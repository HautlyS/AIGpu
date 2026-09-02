const palette = {
  idle: [114, 233, 255],
  thinking: [158, 139, 255],
  working: [114, 233, 255],
  waiting: [255, 179, 107],
  success: [103, 239, 170],
  error: [255, 119, 153],
};

const state = { status: "working", progress: 0.72, activity: 0.9, phase: 0 };
const events = [
  { status: "thinking", progress: 0.15, activity: 0.62 },
  { status: "working", progress: 0.42, activity: 0.9 },
  { status: "working", progress: 0.72, activity: 0.9 },
  { status: "waiting", progress: 0.72, activity: 0.18 },
  { status: "success", progress: 1, activity: 0.25 },
];
let eventIndex = 2;

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
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const scale = Math.min(width, height) / 520;
  const cx = width / 2;
  const cy = height / 2;
  const [r, g, b] = palette[state.status] || palette.working;
  const pulse = 1 + Math.sin(now * (1.3 + state.activity * 1.7) + state.phase) * (0.035 + state.activity * 0.025);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0e1b";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 245 * scale);
  glow.addColorStop(0, `rgba(${r},${g},${b},${0.2 + state.activity * 0.12})`);
  glow.addColorStop(0.45, `rgba(${r},${g},${b},0.05)`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, (90 + i * 25) * scale, (31 + i * 8) * scale, now * 0.24 + i * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.7 - i * 0.17})`;
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();
  }
  const ring = 102 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.progress);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, ring, -Math.PI / 2 + Math.PI * 2 * state.progress, -Math.PI / 2 + Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 5 * scale;
  ctx.stroke();
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 42 * scale);
  core.addColorStop(0, `rgba(255,255,255,${0.9 - state.activity * 0.12})`);
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
    ctx.fillText(`status://${state.status}`, cx, cy + 155 * scale);
    ctx.fillStyle = `rgba(${r},${g},${b},.9)`;
    ctx.fillText(`${Math.round(state.progress * 100)}%  ·  activity ${Math.round(state.activity * 100)}%`, cx, cy + 176 * scale);
  }
}

// Example canvas renderers — each draws a unique GPU-like effect
const exampleRenderers = {
  cockpit(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a1424";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // Radial glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.45);
    glow.addColorStop(0, "rgba(114,233,255,0.25)");
    glow.addColorStop(0.5, "rgba(114,233,255,0.04)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Orbiting rings
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.35 - i * 20, h * 0.15 - i * 6, now * 0.3 + i * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(114,233,255,${0.6 - i * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Progress arc
    const progress = (Math.sin(now * 0.5) + 1) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = "rgba(114,233,255,0.9)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    // Core dot
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    core.addColorStop(0, "rgba(255,255,255,0.9)");
    core.addColorStop(0.3, "rgba(114,233,255,0.8)");
    core.addColorStop(1, "transparent");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Label
    ctx.fillStyle = "rgba(114,233,255,0.6)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("OPS", cx, h - 12);
  },

  replay(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#12182c";
    ctx.fillRect(0, 0, w, h);
    // Timeline line
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
    // Nodes along the line
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
    // Scanning beam
    const scanT = (now * 0.3) % 1;
    const sx = lx + (rx - lx) * scanT;
    const sy = ly + (ry - ly) * scanT;
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    // Label
    ctx.fillStyle = "rgba(158,139,255,0.6)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("REPLAY", w / 2, h - 12);
  },

  neural(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#211329";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // Background glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.4);
    glow.addColorStop(0, "rgba(255,126,242,0.3)");
    glow.addColorStop(0.5, "rgba(158,139,255,0.08)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Rings
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 2; i++) {
      const rx = 60 + i * 35;
      const ry = 25 + i * 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, now * 0.2 + i * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "rgba(158,139,255,0.6)" : "rgba(114,233,255,0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // Core
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    core.addColorStop(0, "rgba(255,255,255,0.95)");
    core.addColorStop(0.25, "rgba(255,126,242,0.8)");
    core.addColorStop(1, "transparent");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Label
    ctx.fillStyle = "rgba(255,126,242,0.6)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("WGSL", cx, h - 12);
  },

  fullscreen(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Gradient sweep
    const angle = now * 0.4;
    const x1 = w / 2 + Math.cos(angle) * w * 0.4;
    const y1 = h / 2 + Math.sin(angle) * h * 0.4;
    const grad = ctx.createRadialGradient(x1, y1, 0, w / 2, h / 2, w * 0.6);
    grad.addColorStop(0, "rgba(114,233,255,0.5)");
    grad.addColorStop(0.4, "rgba(158,139,255,0.2)");
    grad.addColorStop(1, "#0c1428");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Grid overlay
    ctx.strokeStyle = "rgba(114,233,255,0.08)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Label
    ctx.fillStyle = "rgba(114,233,255,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("GPU", w / 2, h - 12);
  },

  compute(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, w, h);
    // Particle field
    const count = 60;
    for (let i = 0; i < count; i++) {
      const seed = i * 137.508;
      const px = ((seed * 7.3 + now * 20 * (0.3 + (i % 5) * 0.15)) % w + w) % w;
      const py = ((seed * 3.7 + now * 10 * (0.2 + (i % 3) * 0.1)) % h + h) % h;
      const size = 1.5 + Math.sin(now + i) * 0.8;
      const alpha = 0.3 + Math.sin(now * 1.5 + i * 0.5) * 0.2;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0
        ? `rgba(114,233,255,${alpha})`
        : i % 3 === 1
        ? `rgba(158,139,255,${alpha})`
        : `rgba(103,239,170,${alpha})`;
      ctx.fill();
    }
    // Connection lines
    ctx.strokeStyle = "rgba(114,233,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 15; i++) {
      const seed = i * 137.508;
      const x1 = ((seed * 7.3 + now * 20 * (0.3 + (i % 5) * 0.15)) % w + w) % w;
      const y1 = ((seed * 3.7 + now * 10 * (0.2 + (i % 3) * 0.1)) % h + h) % h;
      const x2 = ((seed * 11.3 + now * 20 * (0.3 + ((i + 3) % 5) * 0.15)) % w + w) % w;
      const y2 = ((seed * 5.1 + now * 10 * (0.2 + ((i + 2) % 3) * 0.1)) % h + h) % h;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Label
    ctx.fillStyle = "rgba(103,239,170,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("COMPUTE", w / 2, h - 12);
  },

  gallery(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1b";
    ctx.fillRect(0, 0, w, h);
    // 8 color swatches animating
    const colors = [
      [114, 233, 255], [158, 139, 255], [255, 126, 242], [255, 179, 107],
      [103, 239, 170], [255, 119, 153], [114, 233, 255], [158, 139, 255],
    ];
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
    }
    // Label
    ctx.fillStyle = "rgba(158,139,255,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("GALLERY", w / 2, h - 8);
  },
};

function renderText() {
  const percent = `${Math.round(state.progress * 100)}%`;
  const status = document.querySelector("#stage-status");
  const progressLabel = document.querySelector("#stage-progress-label");
  const progressBar = document.querySelector("#stage-progress-bar");
  const log = document.querySelector("#event-log");
  const heroState = document.querySelector("#hero-state");
  const heroProgress = document.querySelector("#hero-progress");
  if (status) status.textContent = state.status;
  if (progressLabel) progressLabel.textContent = percent;
  if (progressBar) progressBar.style.width = percent;
  if (log) log.textContent = `{ status: "${state.status}", progress: ${state.progress.toFixed(2)}, activity: ${state.activity.toFixed(2)} }`;
  if (heroState) heroState.textContent = state.status;
  if (heroProgress) heroProgress.textContent = percent;
  const statusSelect = document.querySelector("#status-select");
  const progressRange = document.querySelector("#progress-range");
  const activityRange = document.querySelector("#activity-range");
  if (statusSelect) statusSelect.value = state.status;
  if (progressRange) progressRange.value = String(Math.round(state.progress * 100));
  if (activityRange) activityRange.value = String(Math.round(state.activity * 100));
  const progressOutput = document.querySelector("#progress-output");
  const activityOutput = document.querySelector("#activity-output");
  if (progressOutput) progressOutput.textContent = percent;
  if (activityOutput) activityOutput.textContent = `${Math.round(state.activity * 100)}%`;
}

// Setup example canvases
const exampleCanvases = [];
document.querySelectorAll(".example-canvas").forEach((canvas) => {
  const ctx = setupCanvas(canvas);
  const type = canvas.dataset.visual;
  if (ctx && type && exampleRenderers[type]) {
    exampleCanvases.push({ ctx, type });
  }
});

const heroContext = setupCanvas(document.querySelector("#hero-canvas"));
const playgroundContext = setupCanvas(document.querySelector("#playground-canvas"));
let previous = performance.now();
function animate(now) {
  const delta = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  state.phase += delta * (0.8 + state.activity * 2);
  if (heroContext) drawAgent(heroContext, now / 1000, true);
  if (playgroundContext) drawAgent(playgroundContext, now / 1000);
  for (const { ctx, type } of exampleCanvases) {
    exampleRenderers[type](ctx, now / 1000);
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function apply(patch) {
  Object.assign(state, patch);
  state.progress = Math.max(0, Math.min(1, Number(state.progress) || 0));
  state.activity = Math.max(0, Math.min(1, Number(state.activity) || 0));
  renderText();
}

document.querySelector("#apply-state")?.addEventListener("click", () => {
  apply({
    status: document.querySelector("#status-select")?.value || "working",
    progress: Number(document.querySelector("#progress-range")?.value || 0) / 100,
    activity: Number(document.querySelector("#activity-range")?.value || 0) / 100,
  });
});
document.querySelector("#next-event")?.addEventListener("click", () => {
  apply(events[eventIndex % events.length]);
  eventIndex += 1;
});
for (const input of ["progress-range", "activity-range"]) {
  document.querySelector(`#${input}`)?.addEventListener("input", (event) => {
    const output = document.querySelector(input === "progress-range" ? "#progress-output" : "#activity-output");
    if (output) output.textContent = `${event.target.value}%`;
  });
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const filter = button.dataset.filter;
    document.querySelectorAll(".example-card").forEach((card) => {
      card.classList.toggle("is-hidden", filter !== "all" && !card.dataset.tags.split(" ").includes(filter));
    });
  });
});

document.querySelectorAll(".copy-trigger").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copy || "";
    try {
      await navigator.clipboard.writeText(value);
      const original = button.innerHTML;
      button.innerHTML = "Copied ✓";
      setTimeout(() => { button.innerHTML = original; }, 1200);
    } catch {
      window.prompt("Copy this snippet:", value);
    }
  });
});

renderText();
