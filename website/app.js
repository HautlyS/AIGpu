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

const heroContext = setupCanvas(document.querySelector("#hero-canvas"));
const playgroundContext = setupCanvas(document.querySelector("#playground-canvas"));
let previous = performance.now();
function animate(now) {
  const delta = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  state.phase += delta * (0.8 + state.activity * 2);
  if (heroContext) drawAgent(heroContext, now / 1000, true);
  if (playgroundContext) drawAgent(playgroundContext, now / 1000);
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
