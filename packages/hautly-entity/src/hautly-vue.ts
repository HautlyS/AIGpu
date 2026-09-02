/**
 * Hautly Vue — Vue 3 adapter.
 *
 * Provides `useHautly()` composable and `<HautlyEntity />` component.
 */

import { ref, onMounted, onUnmounted, watch, type Ref, type SetupContext, defineComponent, h } from "vue";
import { createHautly, type HautlyEngine, type HautlyOptions, type HautlyPatch, type HautlyMood } from "./hautly-core.ts";
import { getRenderer, type Renderer } from "./hautly-renderers.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter } from "./hautly-speech.ts";

// ─── Composable ──────────────────────────────────────────────────────────────

export interface UseHautlyOptions extends HautlyOptions {
  renderer?: string | Renderer;
}

export interface UseHautlyReturn {
  engine: Ref<HautlyEngine | null>;
  speech: Ref<SpeechController | null>;
  mounted: Ref<boolean>;
  mood: Ref<HautlyMood>;
  update: (patch: HautlyPatch) => void;
  say: (text: string) => void;
  ask: (adapter: AIResponseAdapter, message: string) => Promise<void>;
}

export function useHautly(options: UseHautlyOptions = {}): UseHautlyReturn {
  const engine = ref<HautlyEngine | null>(null);
  const speech = ref<SpeechController | null>(null);
  const mounted = ref(false);
  const mood = ref<HautlyMood>(options.initial?.mood ?? "idle");
  let rafId = 0;
  let lastTime = 0;

  onMounted(() => {
    const engineInstance = createHautly({
      ...options,
      onMoodChange: (m) => {
        mood.value = m;
        options.onMoodChange?.(m);
      },
    });
    const speechInstance = createSpeechController(engineInstance);

    engine.value = engineInstance;
    speech.value = speechInstance;
    mounted.value = true;

    lastTime = performance.now() / 1000;

    function tick() {
      const now = performance.now() / 1000;
      const dt = Math.min(now - lastTime, 0.1);
      lastTime = now;

      engineInstance.tick(dt);
      speechInstance.tick(dt);

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  });

  onUnmounted(() => {
    cancelAnimationFrame(rafId);
    engine.value = null;
    speech.value = null;
    mounted.value = false;
  });

  function update(patch: HautlyPatch) {
    engine.value?.set(patch);
  }

  function say(text: string) {
    speech.value?.say(text);
  }

  async function ask(adapter: AIResponseAdapter, message: string) {
    await speech.value?.ask(adapter, message);
  }

  return { engine, speech, mounted, mood, update, say, ask };
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface HautlyEntityProps {
  form?: string;
  mood?: string;
  energy?: number;
  speaking?: boolean;
  speechText?: string;
  renderer?: string | Renderer;
  width?: number;
  height?: number;
  fontSize?: number;
}

export const HautlyEntity = defineComponent({
  name: "HautlyEntity",
  props: {
    form: { type: String, default: "orb" },
    mood: { type: String, default: "idle" },
    energy: { type: Number, default: 0.5 },
    speaking: { type: Boolean, default: false },
    speechText: { type: String, default: "" },
    width: { type: Number, default: 400 },
    height: { type: Number, default: 300 },
    fontSize: { type: Number, default: 14 },
  },
  setup(props, { attrs }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const { engine, speech, mounted, mood, update, say, ask } = useHautly({
      form: props.form as any,
      initial: {
        mood: props.mood as any,
        energy: props.energy,
      },
      renderer: attrs.renderer as any,
    });

    // Watch prop changes and forward to engine
    watch(() => props.mood, (m) => engine.value?.set({ mood: m as any }));
    watch(() => props.energy, (e) => engine.value?.set({ energy: e }));
    watch(() => props.speaking, (s) => {
      if (s && props.speechText) engine.value?.set({ speaking: true, speechText: props.speechText });
      else engine.value?.set({ speaking: false });
    });
    watch(() => props.speechText, (t) => {
      if (t && props.speaking) engine.value?.set({ speaking: true, speechText: t });
    });

    // Canvas rendering loop
    onMounted(() => {
      const canvas = canvasRef.value;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const renderer = typeof attrs.renderer === "object" ? attrs.renderer as Renderer : getRenderer("orb");
      const dpr = window.devicePixelRatio || 1;
      const fontSize = props.fontSize;
      let rafId = 0;
      let lastTime = performance.now() / 1000;

      function renderFrame() {
        if (!engine.value) return;
        const now = performance.now() / 1000;
        const dt = Math.min(now - lastTime, 0.1);
        lastTime = now;

        const rect = canvas!.getBoundingClientRect();
        canvas!.width = rect.width * dpr;
        canvas!.height = rect.height * dpr;
        ctx!.scale(dpr, dpr);

        const frameW = Math.floor(rect.width / (fontSize * 0.6));
        const frameH = Math.floor(rect.height / fontSize);
        const frame = renderer.render(engine.value!.state, frameW, frameH);

        ctx!.clearRect(0, 0, rect.width, rect.height);
        ctx!.font = `${fontSize}px monospace`;
        ctx!.textBaseline = "top";

        const cellW = rect.width / frameW;
        const cellH = rect.height / frameH;

        for (let y = 0; y < frameH; y++) {
          for (let x = 0; x < frameW; x++) {
            const idx = y * frameW + x;
            const char = frame.cells[idx];
            if (char === " ") continue;

            const color = frame.colors[idx];
            ctx!.fillStyle = color ? ansiToCss(color) : "#ffffff";
            ctx!.fillText(char, x * cellW, y * cellH);
          }
        }

        rafId = requestAnimationFrame(renderFrame);
      }

      rafId = requestAnimationFrame(renderFrame);
      onUnmounted(() => cancelAnimationFrame(rafId));
    });

    return () => h("canvas", {
      ref: canvasRef,
      style: { width: `${props.width}px`, height: `${props.height}px`, display: "block" },
      "aria-label": `Hautly entity: ${mood.value}`,
      ...attrs,
    });
  },
});

// ─── ANSI to CSS ─────────────────────────────────────────────────────────────

function ansiToCss(ansiColor: string): string {
  const trueColorMatch = ansiColor.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
  if (trueColorMatch) {
    const [, r, g, b] = trueColorMatch;
    return `rgb(${r},${g},${b})`;
  }
  return "#ffffff";
}
