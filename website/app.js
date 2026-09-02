const playgroundState = { status: "working", progress: 0.72, activity: 0.9, phase: 0 };
const events = [
  { status: "thinking", progress: 0.15, activity: 0.62 },
  { status: "working", progress: 0.42, activity: 0.9 },
  { status: "working", progress: 0.72, activity: 0.9 },
  { status: "waiting", progress: 0.72, activity: 0.18 },
  { status: "success", progress: 1, activity: 0.25 },
];
let eventIndex = 2;

const CHARS = " .:-=+*#%@";
const BRAILLE = "\u2800\u2801\u2803\u2807\u280f\u281f\u283f\u287f\u28ff";

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

function asciiAt(ctx, char, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, x, y);
}

function drawAsciiRing(ctx, cx, cy, radius, now, speed, chars) {
  const count = chars.length;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + now * speed;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const brightness = Math.floor(((Math.sin(now * 2 + i * 0.5) + 1) / 2) * 255);
    asciiAt(ctx, chars[i], x, y, 12, `rgb(${brightness},${brightness},${brightness})`);
  }
}

function drawAsciiWave(ctx, startX, startY, width, now, amplitude, frequency, chars) {
  for (let i = 0; i < width; i += 8) {
    const t = i / width;
    const y = startY + Math.sin(t * frequency + now) * amplitude;
    const charIdx = Math.floor(((Math.sin(t * frequency + now) + 1) / 2) * (chars.length - 1));
    asciiAt(ctx, chars[charIdx], startX + i, y, 11, "#fff");
  }
}

function drawAsciiBar(ctx, x, y, width, height, value, now) {
  const filled = Math.floor(value * width / 8);
  for (let i = 0; i < width; i += 8) {
    const idx = Math.floor(i / 8);
    const char = idx < filled ? "#" : ".";
    const bright = idx < filled ? 255 : 60;
    asciiAt(ctx, char, x + i, y, 10, `rgb(${bright},${bright},${bright})`);
  }
}

// ─── ASCII Canvas Renderers ─────────────────────────────────────────────────
const renderers = {
  // S02 — Fullscreen: ASCII gradient sweep
  s02_fullscreen(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cols = 50, rows = 25;
    const cw = w / cols, ch = h / rows;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const dx = (gx - cols / 2) / cols;
        const dy = (gy - rows / 2) / rows;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 20 - now * 3) * 0.5 + 0.5;
        const charIdx = Math.floor(wave * (CHARS.length - 1));
        asciiAt(ctx, CHARS[charIdx], gx * cw + cw / 2, gy * ch + ch / 2, Math.min(cw, ch) * 0.7, "#fff");
      }
    }
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("GPU FULLSCREEN", w / 2, h - 10);
  },

  // S03 — Sharing: two wireframe cubes sharing rotation
  s03_sharing(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const angle = now * 0.4;
    // ASCII cube faces
    const faces = ["+---+", "|   |", "+---+"];
    for (let i = 0; i < 2; i++) {
      const ox = (i === 0 ? -1 : 1) * w * 0.22;
      const phase = angle + i * 0.5;
      const skew = Math.sin(phase) * 8;
      ctx.fillStyle = "#fff";
      ctx.font = "11px monospace"; ctx.textAlign = "center";
      for (let row = 0; row < 3; row++) {
        const line = faces[row];
        const yOff = (row - 1) * 14 + Math.sin(now + i) * 3;
        asciiAt(ctx, line, cx + ox + skew, cy + yOff, 11, i === 0 ? "#fff" : "#888");
      }
    }
    // Shared label
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("<-- shared: camera uniform -->", cx, cy + 60);
    ctx.fillText("SHARING", w / 2, h - 10);
  },

  // S04 — Shared uniforms: two synced waves
  s04_shared_uniforms(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    drawAsciiWave(ctx, w * 0.1, h * 0.35, w * 0.8, now, 25, 8, "._-=+*#");
    drawAsciiWave(ctx, w * 0.1, h * 0.65, w * 0.8, now + 0.5, 20, 10, "._-=+*#");
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("globals.set({ time })", w / 2, h * 0.85);
    ctx.fillText("SHARED UNIFORMS", w / 2, h - 10);
  },

  // S05 — Fixits: pulsing error art
  s05_fixits(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const pulse = Math.sin(now * 4) > 0 ? "#fff" : "#555";
    const warn = [
      "    /\\    ",
      "   /  \\   ",
      "  / !! \\  ",
      " /______\\ ",
    ];
    ctx.font = "13px monospace"; ctx.textAlign = "center";
    warn.forEach((line, i) => asciiAt(ctx, line, w / 2, h / 2 - 40 + i * 18, 13, pulse));
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace";
    ctx.fillText('missing binding: set(color) before draw()', w / 2, h / 2 + 50);
    ctx.fillText("ownership flip: lib -> user rejected", w / 2, h / 2 + 64);
    ctx.fillStyle = "#555";
    ctx.fillText("FIXITS", w / 2, h - 10);
  },

  // S06 — Scene: rotating ASCII 3D box
  s06_scene(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const angle = now * 0.5;
    const cos = Math.cos, sin = Math.sin;
    const size = 40;
    const project = (x, y, z) => {
      const rx = x * cos(angle) - z * sin(angle);
      const rz = x * sin(angle) + z * cos(angle);
      const ry = y * cos(angle * 0.3) - rz * sin(angle * 0.3);
      const rz2 = y * sin(angle * 0.3) + rz * cos(angle * 0.3);
      const p = 200 / (200 + rz2);
      return [cx + rx * p, cy + ry * p, rz2];
    };
    const verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v => project(v[0]*size, v[1]*size, v[2]*size));
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    // Draw vertices as ASCII
    verts.forEach((v, i) => {
      const depth = v[2];
      const bright = Math.floor(Math.max(40, 255 - depth * 0.5));
      asciiAt(ctx, "@", v[0], v[1], 10, `rgb(${bright},${bright},${bright})`);
    });
    // Draw edges
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 0.5;
    for (const [a, b] of edges) {
      ctx.beginPath();
      ctx.moveTo(verts[a][0], verts[a][1]);
      ctx.lineTo(verts[b][0], verts[b][1]);
      ctx.stroke();
    }
    // Light
    asciiAt(ctx, "*", cx + cos(now * 0.3) * 70, cy - 40, 14, "#fff");
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("SCENE", w / 2, h - 10);
  },

  // S07 — HDR post: two-pass ASCII gradient
  s07_hdr_post(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cols = 40, rows = 20;
    const cw = w / cols, ch = h / rows;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const t = gx / cols;
        const wave = Math.sin(t * 10 + now * 2) * 0.5 + 0.5;
        const depth = Math.abs(gy / rows - 0.5);
        const v = wave * (1 - depth * 0.5);
        const charIdx = Math.floor(v * (CHARS.length - 1));
        asciiAt(ctx, CHARS[charIdx], gx * cw + cw / 2, gy * ch + ch / 2, Math.min(cw, ch) * 0.6, "#fff");
      }
    }
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "left";
    ctx.fillText("pass 1: rgba16float", 10, 16);
    ctx.fillText("pass 2: post composite", 10, 28);
    ctx.textAlign = "center";
    ctx.fillText("HDR POST", w / 2, h - 10);
  },

  // S08 — Ping-pong: alternating ASCII blocks
  s08_ping_pong(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const t = (now * 0.8) % 2;
    const read = t < 1;
    const lx = w * 0.25, rx = w * 0.75;
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? lx : rx;
      const isActive = i === 0 ? read : !read;
      const label = isActive ? "READ" : "write";
      const block = isActive
        ? ["+------+", "| #### |", "| #### |", "| #### |", "+------+"]
        : ["+------+", "| ......", "| ......", "| ......", "+------+"];
      ctx.font = "11px monospace"; ctx.textAlign = "center";
      block.forEach((line, row) => {
        asciiAt(ctx, line, x, h / 2 - 30 + row * 14, 11, isActive ? "#fff" : "#444");
      });
      asciiAt(ctx, label, x, h / 2 + 55, 10, isActive ? "#fff" : "#444");
    }
    // Arrow
    const arrowX = read ? lx + 70 : rx - 70;
    asciiAt(ctx, read ? "-->" : "<--", w / 2, h / 2, 12, "#888");
    asciiAt(ctx, "swap()", w / 2, h / 2 + 70, 10, "#555");
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("PING-PONG", w / 2, h - 10);
  },

  // S09 — Bundles: record/replay ASCII
  s09_bundles(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const phase = (now * 0.5) % 3;
    const replaying = phase > 1.5;
    const slots = ["[REC]", "[RP1]", "[RP2]"];
    for (let i = 0; i < 3; i++) {
      const x = w * 0.2 + i * w * 0.3;
      const active = replaying || i === 0;
      const box = active ? ["+------+", "| #### |", "+------+"] : ["+------+", "| ......", "+------+"];
      ctx.font = "11px monospace"; ctx.textAlign = "center";
      box.forEach((line, row) => asciiAt(ctx, line, x, h / 2 - 20 + row * 14, 11, active ? "#fff" : "#333"));
      asciiAt(ctx, slots[i], x, h / 2 + 35, 10, active ? "#fff" : "#333");
    }
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace"; ctx.textAlign = "center";
    ctx.fillText(replaying ? "bundle.replay()" : "bundle.record()", w / 2, 24);
    ctx.fillStyle = "#555";
    ctx.fillText("BUNDLES", w / 2, h - 10);
  },

  // S10 — Group claim: dynamic offset bars
  s10_group_claim(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const count = 6;
    const barW = w * 0.12;
    const startX = (w - count * barW) / 2;
    for (let i = 0; i < count; i++) {
      const x = startX + i * barW;
      const offset = Math.sin(now * 1.5 + i * 0.8) * 0.3 + 0.5;
      const rows = Math.floor(offset * 8);
      for (let r = 0; r < 8; r++) {
        const char = r < rows ? "#" : ".";
        const bright = r < rows ? 255 : 60;
        asciiAt(ctx, char, x + barW / 2, h * 0.7 - r * 16, 12, `rgb(${bright},${bright},${bright})`);
      }
      asciiAt(ctx, `off:${(offset * 100).toFixed(0)}`, x + barW / 2, h * 0.7 + 20, 8, "#555");
    }
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("GROUP CLAIM", w / 2, h - 10);
  },

  // S11 — Compute: ASCII particles
  s11_compute(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const particles = 40;
    for (let i = 0; i < particles; i++) {
      const seed = i * 137.508;
      const px = ((seed * 7.3 + now * 30 * (0.3 + (i % 5) * 0.12)) % w + w) % w;
      const py = ((seed * 3.7 + now * 15 * (0.2 + (i % 3) * 0.1)) % h + h) % h;
      const chars = ".*+#@";
      const char = chars[i % chars.length];
      asciiAt(ctx, char, px, py, 10, "#fff");
    }
    // Connection lines (ASCII)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 10; i++) {
      const seed = i * 137.508;
      const x1 = ((seed * 7.3 + now * 30 * (0.3 + (i % 5) * 0.12)) % w + w) % w;
      const y1 = ((seed * 3.7 + now * 15 * (0.2 + (i % 3) * 0.1)) % h + h) % h;
      const x2 = ((seed * 11.3 + now * 30 * (0.3 + ((i + 3) % 5) * 0.12)) % w + w) % w;
      const y2 = ((seed * 5.1 + now * 15 * (0.2 + ((i + 2) % 3) * 0.1)) % h + h) % h;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("COMPUTE", w / 2, h - 10);
  },

  // S12 — Resize: growing ASCII grid
  s12_scheduling_resize(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const t = (now * 0.3) % 2;
    const grow = t < 1 ? t : 1;
    const gridSize = Math.floor(4 + grow * 4);
    const cellW = Math.min(20, (w * 0.6) / gridSize);
    const startX = w / 2 - (gridSize * cellW) / 2;
    const startY = h / 2 - (gridSize * cellW) / 2;
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const x = startX + gx * cellW + cellW / 2;
        const y = startY + gy * cellW + cellW / 2;
        asciiAt(ctx, "+", x, y, Math.min(cellW * 0.6, 10), "#555");
      }
    }
    // Border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX - 4, startY - 4, gridSize * cellW + 8, gridSize * cellW + 8);
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText(`target.resize([${gridSize}, ${gridSize}])`, w / 2, startY + gridSize * cellW + 24);
    ctx.fillStyle = "#555";
    ctx.fillText("RESIZE", w / 2, h - 10);
  },

  // S13 — Headless: static pixel grid
  s13_headless(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const grid = 8;
    const cell = 14;
    const startX = cx - (grid * cell) / 2;
    const startY = cy - (grid * cell) / 2;
    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        const v = Math.sin(gx * 0.8 + gy * 0.6) * 0.5 + 0.5;
        const charIdx = Math.floor(v * (CHARS.length - 1));
        asciiAt(ctx, CHARS[charIdx], startX + gx * cell + cell / 2, startY + gy * cell + cell / 2, 10, "#fff");
      }
    }
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX - 6, startY - 6, grid * cell + 12, grid * cell + 12);
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    ctx.fillText("effect.draw({ target })", w / 2, cy + grid * cell / 2 + 24);
    ctx.fillText("no frame loop -- one-shot render", w / 2, cy + grid * cell / 2 + 38);
    ctx.fillStyle = "#555";
    ctx.fillText("HEADLESS", w / 2, h - 10);
  },

  // ─── Agent Animation — ASCII ─────────────────────────────────────────────

  cockpit(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // ASCII orbiting rings
    drawAsciiRing(ctx, cx, cy, 80, now, 0.4, "::::::::::::");
    drawAsciiRing(ctx, cx, cy, 55, now, -0.6, ";;;;;;;;");
    drawAsciiRing(ctx, cx, cy, 30, now, 0.8, "::::");
    // Progress arc (ASCII)
    const progress = (Math.sin(now * 0.5) + 1) / 2;
    const arcChars = Math.floor(progress * 20);
    const arc = "#".repeat(arcChars) + ".".repeat(20 - arcChars);
    asciiAt(ctx, `[${arc}]`, cx, cy + 110, 10, "#fff");
    asciiAt(ctx, `${Math.round(progress * 100)}%`, cx, cy + 126, 11, "#fff");
    // Status
    asciiAt(ctx, "agentAnimation()", cx, h - 18, 10, "#555");
  },

  dashboard(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const agents = [
      { name: "planner", status: "working", progress: 0.72 },
      { name: "researcher", status: "thinking", progress: 0.45 },
      { name: "reviewer", status: "idle", progress: 0.1 },
    ];
    const cardW = w * 0.28;
    const startX = (w - agents.length * cardW) / 2;
    agents.forEach((a, i) => {
      const x = startX + i * cardW + cardW / 2;
      const y = h * 0.25;
      const barLen = 12;
      const filled = Math.floor(a.progress * barLen);
      const bar = "#".repeat(filled) + ".".repeat(barLen - filled);
      asciiAt(ctx, `+${"-".repeat(barLen + 2)}+`, x, y, 9, "#555");
      asciiAt(ctx, `| ${a.name.padEnd(10)} |`, x, y + 14, 9, "#fff");
      asciiAt(ctx, `| [${bar}] |`, x, y + 28, 9, "#fff");
      asciiAt(ctx, `| ${a.status.padEnd(12)}|`, x, y + 42, 9, "#888");
      asciiAt(ctx, `+${"-".repeat(barLen + 2)}+`, x, y + 56, 9, "#555");
    });
    asciiAt(ctx, "createAgentRegistry()", w / 2, h - 30, 9, "#555");
    asciiAt(ctx, "DASHBOARD", w / 2, h - 10, 9, "#555");
  },

  replay(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    // Timeline
    const lx = w * 0.1, rx = w * 0.9;
    const cy = h * 0.5;
    asciiAt(ctx, "<".padEnd(60, "-"), (lx + rx) / 2, cy, 10, "#555");
    // Events
    const nodes = [0.2, 0.45, 0.7];
    const labels = ["*", "#", "@"];
    nodes.forEach((t, i) => {
      const x = lx + (rx - lx) * t;
      asciiAt(ctx, labels[i], x, cy, 16, "#fff");
      asciiAt(ctx, `evt_${i}`, x, cy + 20, 8, "#555");
    });
    // Scanning beam
    const scanT = (now * 0.3) % 1;
    const sx = lx + (rx - lx) * scanT;
    asciiAt(ctx, "^", sx, cy - 16, 12, "#fff");
    asciiAt(ctx, "recordAgentEvents()", w / 2, h * 0.2, 9, "#555");
    asciiAt(ctx, "replayAgentEvents()", w / 2, h * 0.78, 9, "#555");
    asciiAt(ctx, "REPLAY", w / 2, h - 10, 9, "#555");
  },

  transmission(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const angle = now * 0.3;
    // ASCII glass cube
    const s = 30;
    const skew = Math.sin(now * 0.3) * 5;
    const cube = [
      "+--------+",
      "|\\       |\\",
      "| \\      | \\",
      "|  \\     |  \\",
      "+---\\----+   |",
      "|    |   |   |",
      "|    +---|---+",
      "|   /    |  /",
      "|  /     | /",
      "+--------+/",
    ];
    ctx.font = "9px monospace"; ctx.textAlign = "center";
    cube.forEach((line, i) => asciiAt(ctx, line, cx + Math.sin(now + i * 0.2) * 3, cy - 50 + i * 11, 9, "#fff"));
    // IOR
    const ior = 1.5 + Math.sin(now * 0.2) * 0.1;
    asciiAt(ctx, `IOR: ${ior.toFixed(2)}`, w / 2, h - 28, 9, "#888");
    asciiAt(ctx, "TRANSMISSION", w / 2, h - 10, 9, "#555");
  },

  gallery(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const names = ["anime", "enterprise", "psychedelic", "calm", "celebration", "glitch", "minimal", "cosmic"];
    const patterns = [":::", "---", "***", "~~~", "+++", "###", "...", "@@@"];
    const cols = 4, rows = 2;
    const cw = w / cols, ch = (h - 20) / rows;
    for (let i = 0; i < 8; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cw + cw / 2;
      const y = row * ch + ch / 2;
      const pulse = Math.sin(now * 1.5 + i) > 0;
      asciiAt(ctx, `[${patterns[i]}]`, x, y - 8, 10, pulse ? "#fff" : "#555");
      asciiAt(ctx, names[i], x, y + 10, 9, "#888");
    }
    asciiAt(ctx, "GALLERY", w / 2, h - 8, 9, "#555");
  },

  fluid(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cols = 16, rows = 10;
    const cw = w / cols, ch = h / rows;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const angle = Math.sin(gx * 0.5 + now) * Math.cos(gy * 0.4 + now * 0.7) * Math.PI;
        const dir = Math.floor(((angle / Math.PI + 1) / 2) * 4);
        const dirs = ["/", "-", "\\", "|"];
        asciiAt(ctx, dirs[dir], gx * cw + cw / 2, gy * ch + ch / 2, 12, "#fff");
      }
    }
    asciiAt(ctx, "FLUID", w / 2, h - 10, 9, "#555");
  },

  lava(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cols = 30, rows = 18;
    const cw = w / cols, ch = h / rows;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const n = Math.sin(gx * 0.3 + now * 0.8) * Math.cos(gy * 0.3 + now * 0.5);
        const v = (n + 1) / 2;
        const charIdx = Math.floor(v * (CHARS.length - 1));
        asciiAt(ctx, CHARS[charIdx], gx * cw + cw / 2, gy * ch + ch / 2, Math.min(cw, ch) * 0.6, "#fff");
      }
    }
    asciiAt(ctx, "LAVA TSL", w / 2, h - 10, 9, "#555");
  },

  agent_animation(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    drawAsciiRing(ctx, cx, cy, 70, now, 0.3, "::::::::::::::");
    drawAsciiRing(ctx, cx, cy, 45, now, -0.5, ":::::::::");
    const progress = (Math.sin(now * 0.5) + 1) / 2;
    const arcChars = Math.floor(progress * 16);
    const arc = "#".repeat(arcChars) + ".".repeat(16 - arcChars);
    asciiAt(ctx, `[${arc}]`, cx, cy + 100, 10, "#fff");
    asciiAt(ctx, "agentAnimation()", cx, h - 12, 9, "#555");
  },

  mesh_edit(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const count = 10;
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + now * 0.3;
      const r = 50 + Math.sin(now + i * 0.7) * 8;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    // Edges
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < count; i++) {
      for (let j = i + 2; j < count; j++) {
        if (j - i === count - 1) continue;
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
    // Vertices
    pts.forEach((p, i) => asciiAt(ctx, "@", p[0], p[1], 8, "#888"));
    // Selected
    const sel = Math.floor((now * 2) % count);
    asciiAt(ctx, "*", pts[sel][0], pts[sel][1], 14, "#fff");
    asciiAt(ctx, `vertex[${sel}] selected`, w / 2, h - 24, 9, "#888");
    asciiAt(ctx, "MESH EDIT", w / 2, h - 10, 9, "#555");
  },

  dom_mount(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // Canvas element
    const cw = 20, ch = 10;
    const startX = cx - cw * 4;
    const startY = cy - ch * 7;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const char = (y === 0 || y === ch - 1 || x === 0 || x === cw - 1) ? "+" : ".";
        asciiAt(ctx, char, startX + x * 8, startY + y * 14, 9, "#555");
      }
    }
    // Agent visual inside
    asciiAt(ctx, "@", cx, cy, 16, "#fff");
    asciiAt(ctx, "<canvas>", cx, cy + ch * 7 + 10, 9, "#555");
    // Controller
    asciiAt(ctx, "controller.set()", cx + cw * 4 + 20, cy, 8, "#888");
    asciiAt(ctx, "DOM MOUNT", w / 2, h - 10, 9, "#555");
  },

  state_tools(ctx, now) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const boxes = [
      { label: "store", x: 0.12 },
      { label: "registry", x: 0.37 },
      { label: "recorder", x: 0.62 },
      { label: "replay", x: 0.87 },
    ];
    const cy = h * 0.4;
    boxes.forEach((b, i) => {
      const x = w * b.x;
      const pulse = Math.sin(now * 1.5 + i * 1.2) > 0;
      asciiAt(ctx, `[${b.label}]`, x, cy, 10, pulse ? "#fff" : "#555");
      if (i < boxes.length - 1) {
        asciiAt(ctx, "-->", x + 50, cy, 10, "#555");
      }
    });
    asciiAt(ctx, "STATE TOOLS", w / 2, h - 10, 9, "#555");
  },
};

// ─── Vue 3 App ──────────────────────────────────────────────────────────────
const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

const examples = [
  { id: "s02_fullscreen", title: "Minimal fullscreen effect", category: "GPU Core", tags: "gpu", description: "The smallest GPU fragment shader through effect(). Time-based gradient.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s02-fullscreen", code: `import { init, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst colorTarget = target(gpu, { size: [8, 8], format: "rgba8unorm" });\nconst wave = effect(gpu, WGSL, { label: "wave", set: { speed: 2 } });\nwave.set({ time: Math.PI / 4 });\nframe(gpu, (f) => f.pass({ target: colorTarget }, (p) => p.draw(wave)));` },
  { id: "s03_sharing", title: "Shared bind groups", category: "GPU Core", tags: "gpu", description: "Two draws share one camera Uniform while each keeps its own params.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s03-sharing", code: `import { init, Uniform, draw, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst camera = new Uniform(gpu.device, { size: 16, label: "camera" });\ncamera.write(new Float32Array([1, 0, 0, 0]));\nconst cube = draw(gpu, { shader: CUBE, label: "cube" });\nconst floor = draw(gpu, { shader: FLOOR, label: "floor" });\ncube.set({ camera, params: { color: [1, 0, 0, 1] } });\nfloor.set({ camera, params: { color: [0, 1, 0, 1] } });\nframe(gpu, (f) => f.pass({ target, clear: [0, 0, 0, 1] }, (p) => { p.draw(cube); p.draw(floor); }));` },
  { id: "s04_shared_uniforms", title: "Cross-effect shared uniforms", category: "GPU Core", tags: "gpu", description: "Multiple effects consume the same uniforms() group. Changes propagate atomically.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s04-shared-uniforms", code: `import { init, effect, frame, target, uniforms } from "aigpu/node";\n\nconst gpu = await init();\nconst globals = uniforms(gpu, { time: 0, resolution: [800, 600] });\nconst wave = effect(gpu, waveWGSL, { bindings: { globals } });\nconst tint = effect(gpu, tintWGSL, { bindings: { globals } });\nframe(gpu, (f) => { globals.set({ time: f.time }); f.pass(out, wave, tint); });` },
  { id: "s05_fixits", title: "Developer fix-it errors", category: "GPU Core", tags: "gpu", description: "Actionable error messages for missing bindings and ownership violations.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s05-fixits", code: `import { init, effect, target } from "aigpu/mock";\n\nconst gpu = await init();\nconst vis = effect(gpu, shader);\nvis.draw({ target: t }); // Throws: "missing binding: set(color) before draw()"` },
  { id: "s06_scene", title: "3D scene with camera and lights", category: "GPU Core", tags: "gpu", description: "Perspective camera, orbit rotation, box geometry, per-pixel lighting.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s06-scene", code: `import { init, draw, frame, geometry, target } from "aigpu/node";\nimport { box, orbit, perspectiveCamera } from "aigpu/scene";\n\nconst gpu = await init();\nconst cam = perspectiveCamera({ fov: 45, aspect: 1, position: [2, 2, 3], target: [0, 0, 0] });\nconst geo = geometry(gpu, box({ size: 1 }));\ncube.set({ camera: { viewProjection: cam.viewProjection }, model: { model: orbit(0) }, light: { direction: [-1, -1, -1], intensity: 1 } });` },
  { id: "s07_hdr_post", title: "HDR render targets + post", category: "GPU Core", tags: "gpu", description: "Two-pass pipeline: render to rgba16float, composite via post effect.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s07-hdr-post", code: `import { init, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst sceneTarget = target(gpu, { size: [800, 600], format: "rgba16float" });\nconst post = effect(gpu, postWGSL);\nframe(gpu, (f) => { f.pass(sceneTarget, sceneEffect); f.pass(out, post, { src: sceneTarget }); });` },
  { id: "s08_ping_pong", title: "Ping-pong double buffering", category: "GPU Core", tags: "gpu", description: "pingPong() alternates read/write textures for iterative GPU effects.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s08-ping-pong", code: `import { init, effect, frame, pingPong } from "aigpu/node";\n\nconst gpu = await init();\nconst buf = pingPong(gpu, 8, 8, { format: "rgba8unorm" });\nconst fill = effect(gpu, FILL, { label: "fill" });\nconst copy = effect(gpu, COPY, { label: "copy" });\nframe(gpu, (f) => f.pass({ target: buf.write }, (p) => p.draw(fill)));\nbuf.swap();\nframe(gpu, (f) => f.pass({ target: buf.write }, (p) => { copy.set({ src: buf.read, texel: buf.read.texelSize }); p.draw(copy); }));` },
  { id: "s09_bundles", title: "Render bundles", category: "GPU Core", tags: "gpu", description: "Pre-record draw commands into a bundle for replay. Uniform-driven.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s09-bundles", code: `import { init, bundle, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst floor = bundle(gpu, (rec) => { rec.setPipeline(floorPipeline); rec.draw(6); });\nframe(gpu, (f) => { f.replay(floor); f.pass(out, overlay); });` },
  { id: "s10_group_claim", title: "Raw bind group claim", category: "GPU Core", tags: "gpu", description: "Bypass set(): hand-craft a GPUBindGroup with dynamic offsets.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s10-group-claim", code: `import { init, draw, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nconst bg = gpu.device.createBindGroup({ ... });\nframe(gpu, (f) => { const d = draw(gpu, { shader, geometry }); d.group(0, bg); d.draw({ target: t, dynamicOffsets: [0, 256] }); });` },
  { id: "s11_compute", title: "GPU compute shader", category: "GPU Core", tags: "gpu", description: "Dispatch a compute kernel with storage buffers. Physics sim.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s11-compute", code: `import { init, compute } from "aigpu/node";\n\nconst gpu = await init();\nconst src = gpu.device.createBuffer({ size: 16, usage: ["storage", "copy_dst", "copy_src"] });\nconst dst = gpu.device.createBuffer({ size: 16, usage: ["storage", "copy_dst", "copy_src"] });\nsrc.write(new Float32Array([1, 2, 3, 4]));\nconst sim = compute(gpu, SIM, { label: "sim" });\nsim.set({ dt: 0.5, src, dst });\nsim.dispatch(1);` },
  { id: "s12_scheduling_resize", title: "Runtime target resize", category: "GPU Core", tags: "gpu", description: "target.resize() reallocates the texture. texelSize auto-updates.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s12-scheduling-resize", code: `import { init, effect, frame, target } from "aigpu/node";\n\nconst gpu = await init();\nlet t = target(gpu, { size: [4, 4], format: "rgba8unorm" });\nconst vis = effect(gpu, shader);\nframe(gpu, (f) => { f.pass(t, vis); if (f.frameCount === 60) t.resize([8, 8]); });` },
  { id: "s13_headless", title: "Headless one-shot render", category: "GPU Core", tags: "gpu", description: "effect.draw() without frame loop. One-shot render for CI/tests.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/by-example-s13-headless", code: `import { init, effect, target } from "aigpu/node";\n\nconst gpu = await init();\nconst colorTarget = target(gpu, { size: [8, 8], format: "rgba8unorm" });\nconst p = effect(gpu, GRADIENT, { label: "gradient" });\np.set({ time: 1.25, speed: 1 });\np.draw({ target: colorTarget });` },

  { id: "cockpit", title: "Agent cockpit", category: "Agent", tags: "agents", description: "Framework-free agentAnimation(). Status events drive a live GPU visual.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/agent-cockpit", code: `import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";\n\nconst gpu = await init();\nconst visual = agentAnimation(gpu, { initial: { status: "thinking" } });\nconst out = surface(gpu, document.querySelector("canvas"));\nconst time = clock(gpu);\nframeLoop(gpu, (f) => { visual.tick(time.time); f.pass(out, visual.effect); });\nvisual.set({ status: "working", progress: 0.6 });` },
  { id: "dashboard", title: "Multi-agent ops dashboard", category: "Agent", tags: "agents", description: "createAgentRegistry() manages multiple agents with stable cards.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/agent-ops-dashboard", code: `import { createAgentRegistry } from "aigpu/tools";\n\nconst registry = createAgentRegistry();\nregistry.ensure("planner", { status: "idle", progress: 0, activity: 0 });\nregistry.ensure("researcher", { status: "idle", progress: 0, activity: 0 });\nconst cards = registry.ids.map((id) => {\n  const s = registry.get(id).snapshot.state;\n  return { id, label: id, status: s.status, progress: s.progress };\n});\nregistry.subscribe((snapshot, event) => render(snapshot.agents));` },
  { id: "replay", title: "Event recording and replay", category: "Agent", tags: "agents", description: "recordAgentEvents() captures, replayAgentEvents() replays at speed.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/event-replay", code: `import { createAgentStore, recordAgentEvents, replayAgentEvents } from "aigpu/tools";\n\nconst store = createAgentStore({ status: "thinking" });\nconst recorder = recordAgentEvents((listener) =>\n  store.subscribe((_snapshot, event) => listener(event)), { now: () => 0 });\nstore.set({ status: "working", progress: 0.4 });\nstore.set({ status: "success", progress: 1 });\nrecorder.stop();\nconst replay = replayAgentEvents(recorder.events, deliver, { speed: 4 });\nreplay.play();` },
  { id: "agent_animation", title: "Built-in agent animation shader", category: "Agent", tags: "agents gpu", description: "Core WGSL agent status shader. 6 statuses, rings, progress arc.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/agent-cockpit", code: `import { agentAnimation, init, surface, frameLoop } from "aigpu";\n\nconst gpu = await init();\nconst out = surface(gpu, canvas);\nconst agent = agentAnimation(gpu, { initial: { status: "idle" }, colors: { working: [114, 233, 255] } });\nframeLoop(gpu, (f) => f.pass(out, agent));\nagent.set({ status: "working", progress: 0.6 });` },
  { id: "state_tools", title: "Agent state tools", category: "Agent", tags: "agents", description: "createAgentStore, createAgentRegistry, record, replay. Pure state.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/event-replay", code: `import { createAgentStore, createAgentRegistry } from "aigpu/tools";\n\nconst store = createAgentStore({ status: "idle" });\nstore.set({ status: "working", progress: 0.5 });\nstore.dispatch({ type: "progress", patch: { progress: 0.8 } });\nstore.subscribe((snap, evt) => console.log(snap, evt));\nconst reg = createAgentRegistry();\nreg.ensure("agent-1", { status: "thinking" });` },

  { id: "transmission", title: "Glass transmission shader", category: "Advanced", tags: "gpu", description: "Physically-based glass with IOR, roughness, dispersion controls.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/transmission", code: `import { surface, type Gpu, type Surface } from "aigpu";\nimport { createScene, renderScene, DEFAULT_CONTROLS } from "./scene";\n\nfunction createRenderer({ canvas }) {\n  let gpu: Gpu, output: Surface, scene: Scene;\n  const controls = { ...DEFAULT_CONTROLS };\n  output = surface(gpu, canvas);\n  scene = createScene(gpu, controls);\n  function frame() { renderScene(gpu, output, scene, controls); requestAnimationFrame(frame); }\n  requestAnimationFrame(frame);\n}` },
  { id: "fluid", title: "GPU fluid simulation", category: "Advanced", tags: "gpu", description: "WGSL compute: divergence, pressure projection, velocity advection.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/fluid", code: `import { compute, storage, frame, init } from "aigpu/node";\n\nconst gpu = await init();\nconst grid = storage(gpu, gridData);\nconst divergenceJob = compute(gpu, divergenceWGSL, { bindings: { grid } });\nconst projectJob = compute(gpu, projectWGSL, { bindings: { grid } });\nframe(gpu, (f) => { f.run(divergenceJob); f.run(projectJob); });` },
  { id: "lava", title: "Three.js TSL bridge", category: "Advanced", tags: "gpu", description: "Import WGSL via @aigpu/wgsl, connect to three.js nodes.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/three-tsl", code: `import * as THREE from "three/webgpu";\nimport { wgsl, wgslFn } from "three/tsl";\nimport lavaWGSL from "./lava.wgsl";\n\nconst lavaGlow = wgslFn(lavaWGSL, "lavaGlow");\nconst crustHeight = wgslFn(lavaWGSL, "crustHeight");\nconst material = new THREE.MeshPhysicalNodeMaterial();\nmaterial.emissiveNode = lavaGlow({ time, uv });\nmaterial.displacementNode = crustHeight({ time, uv });` },
  { id: "mesh_edit", title: "Mesh editing operators", category: "Advanced", tags: "gpu", description: "Half-edge mesh: extrude, bevel, subdivide, bridge, dissolve.", source: "https://github.com/hautlys/AIGpu/tree/main/packages/render/src/edit", code: `import { toEditable, extrude, bevel, recomputeNormals } from "@aigpu/render/edit";\nimport { geometry, box } from "aigpu/scene";\n\nconst geo = geometry(gpu, box({ size: 1 }));\nconst mesh = toEditable(geo);\nextrude(mesh, { selection: topFace, distance: 0.5 });\nbevel(mesh, { selection: topEdges, width: 0.1 });\nrecomputeNormals(mesh);` },
  { id: "gallery", title: "Visual gallery (8 recipes)", category: "Agent", tags: "agents gpu", description: "8 WGSL recipes: anime, enterprise, psychedelic, calm, etc.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/visual-gallery", code: `import { compile } from "@aigpu/wgsl";\nimport { readFile } from "node:fs/promises";\n\nconst recipe = await readFile("./shaders/anime-hologram.wgsl", "utf-8");\nconst shader = compile(recipe);\nconst agent = agentAnimation(gpu, { shader });\nagent.set({ status: "success", progress: 1.0 });` },
  { id: "dom_mount", title: "DOM canvas mount", category: "Framework", tags: "ui", description: "mountAgentCanvas() -- framework-free DOM mount.", source: "https://github.com/hautlys/AIGpu/tree/main/examples/framework-integrations", code: `import { mountAgentCanvasSelector } from "aigpu";\n\nconst controller = mountAgentCanvasSelector("#agent-canvas", { initial: { status: "thinking" } });\ncontroller.set({ progress: 0.6 });\ncontroller.destroy();` },
];

const categories = [
  { id: "gpu", label: "GPU" },
  { id: "agents", label: "Agents" },
  { id: "ui", label: "UI" },
];

const frameworks = [
  { name: "HTML / JS", desc: "Mount a canvas directly. No component runtime.", code: 'import { mountAgentCanvas } from "aigpu";\nconst controller = mountAgentCanvas(canvas, { initial: { status: "thinking" } });\ncontroller.set({ progress: 0.6 });' },
  { name: "React", desc: "useAgentCanvas hook. Core never imports React.", code: 'import { useAgentCanvas } from "@aigpu/react";\nconst { canvasRef, mounted } = useAgentCanvas({\n  label: "react-agent",\n  initial: { status: "thinking", activity: 0.7 },\n  patch: { status: "working", progress, activity: 0.9 },\n});' },
  { name: "Vue 3", desc: "Composable with refs and watchers. Auto cleanup.", code: 'import { useAgentCanvas } from "@aigpu/vue";\nconst { canvas, controller, mounted } = useAgentCanvas({\n  label: "vue-agent",\n  initial: { status: "thinking", activity: 0.7 },\n});\nwatch([status, progress], () => controller.value?.set({ status: status.value, progress: progress.value }));' },
  { name: "Svelte", desc: "Standard action contract. No Svelte runtime import.", code: 'import { agentCanvas } from "@aigpu/svelte";\n$: options = {\n  initial: { status: "thinking" as const, activity: 0.7 },\n  patch: { status, progress, activity: status === "working" ? 0.9 : 0.25 },\n};\n<canvas use:agentCanvas={options} aria-label="Agent" />' },
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
      if (filter.value !== "all") list = list.filter((e) => e.tags.includes(filter.value));
      const q = search.value.toLowerCase().trim();
      if (q) list = list.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
      return list;
    });

    async function copyCode(code, event) {
      try {
        await navigator.clipboard.writeText(code);
        const btn = event.currentTarget;
        const orig = btn.innerHTML;
        btn.innerHTML = "Copied";
        setTimeout(() => { btn.innerHTML = orig; }, 1200);
      } catch { window.prompt("Copy:", code); }
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

    let raf;
    function animate(now) {
      playgroundState.phase += 0.016 * (0.8 + playgroundState.activity * 2);
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

    return { filter, search, status, progress, activity, eventLog, examples, categories, frameworks, filteredExamples, examplesByCategory, copyCode, applyPatch, nextEvent };
  },
}).mount("#app");

// ─── Hero/Playground ASCII Agent Renderer ───────────────────────────────────
function drawAgent(ctx, now, compact = false) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const s = playgroundState;
  // ASCII orbiting rings
  drawAsciiRing(ctx, cx, cy, Math.min(w, h) * 0.32, now, 0.4, "::::::::::::::::::::");
  drawAsciiRing(ctx, cx, cy, Math.min(w, h) * 0.22, now, -0.6, "::::::::::::");
  drawAsciiRing(ctx, cx, cy, Math.min(w, h) * 0.12, now, 0.8, "::::::");
  // Progress
  const progress = s.progress;
  const arcLen = Math.floor(progress * 24);
  const arc = "#".repeat(arcLen) + ".".repeat(24 - arcLen);
  asciiAt(ctx, `[${arc}]`, cx, cy + Math.min(w, h) * 0.38, 10, "#fff");
  // Status
  asciiAt(ctx, `status://${s.status}`, cx, cy + Math.min(w, h) * 0.44, 11, "#888");
  asciiAt(ctx, `${Math.round(progress * 100)}%  .  activity ${Math.round(s.activity * 100)}%`, cx, cy + Math.min(w, h) * 0.48, 10, "#fff");
  if (!compact) {
    asciiAt(ctx, "AIGpu // agentAnimation()", cx, h - 16, 9, "#555");
  }
}
