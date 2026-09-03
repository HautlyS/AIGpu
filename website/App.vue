<script setup lang="ts">
import { ref, computed } from "vue";
import { useHautly } from "@hautly/entity/vue";
import SiteHeader from "./components/SiteHeader.vue";
import HeroSection from "./components/HeroSection.vue";
import PlaygroundSection from "./components/PlaygroundSection.vue";
import ExamplesSection from "./components/ExamplesSection.vue";
import IntegrationsSection from "./components/IntegrationsSection.vue";
import HautlySection from "./components/HautlySection.vue";
import HautlyGallery from "./components/HautlyGallery.vue";
import InstallBanner from "./components/InstallBanner.vue";
import SiteFooter from "./components/SiteFooter.vue";
import ModalOverlay from "./components/ModalOverlay.vue";

const status = ref("working");
const progress = ref(64);
const activity = ref(42);
const filter = ref("all");
const search = ref("");
const eventLog = ref("// waiting for events...");
const modalOpen = ref(false);
const modalType = ref("");
const modalExample = ref<any>(null);
const modalFramework = ref<any>(null);

const categories = [
  { id: "gpu_core", label: "GPU Core" },
  { id: "agent", label: "Agent" },
  { id: "hautly", label: "Hautly Entity" },
  { id: "advanced", label: "Advanced" },
  { id: "gpu_extra", label: "GPU Extras" },
  { id: "gpu_gallery", label: "GPU Gallery" },
];

const examples = ref([
  { id: "s02_fullscreen", title: "s02 — fullscreen triangle", category: "gpu_core", tags: "fullscreen triangle wgsl", description: "One triangle. No vertex buffer. The simplest GPU entry point.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst canvas = document.querySelector("canvas")\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, /* wgsl */\n  "@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f { return vec4f(uv.x, uv.y, 0.8, 1.0); }"\n)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/by-example-s02-fullscreen/src/example.ts" },
  { id: "s14_raymarching", title: "s14 — raymarching", category: "gpu_extra", tags: "raymarching sdf ray tracing", description: "GPU raymarching for procedural 3D scenes with SDFs.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, RAYMARCH_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/s14_raymarching/renderer.ts" },
  { id: "s15_noise_fields", title: "s15 — procedural noise", category: "gpu_extra", tags: "noise perlin simplex procedural", description: "Procedural noise fields for terrain, textures, and effects.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, NOISE_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/s15_noise_fields/renderer.ts" },
  { id: "cockpit", title: "Cockpit: agent flight deck", category: "agent", tags: "cockpit status progress activity", description: "Aircraft instrument panel showing agent status, CPU/GPU load, and event history.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, RINGS_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/cockpit/renderer.ts" },
  { id: "hautly_orb", title: "Hautly Orb: alive companion", category: "hautly", tags: "hautly orb companion alive", description: "The core Hautly orb entity with breathing, eye tracking, and particle aura. Click to interact.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst orb = effect(gpu, HAUTLY_ORB_SHADER, { set: { time: 0, resolution: [512, 512], status: 0, intensity: 0.5 } })\nframeLoop(gpu, (frame) => {\n  orb.set({ time: performance.now() / 1000, status: 1 })\n  frame.pass(output, orb)\n})`, source: "https://github.com/hautlys/AIGpu/blob/main/examples/hautly-orb/src/example.ts" },
  { id: "gpu_gradient", title: "Simple Gradient", category: "gpu_gallery", tags: "gradient fragment shader vignette", description: "Map screen coordinates to color with a tiny fullscreen fragment shader.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, GRADIENT_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/gradient" },
  { id: "gpu_black_hole", title: "Black Hole", category: "gpu_gallery", tags: "black-hole raymarching lensing hdr", description: "Raymarched gravitational lensing with Keplerian accretion disk and Doppler beaming.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, BLACK_HOLE_SHADER, { set: { time: 0, resolution: [512, 512] } })\nframeLoop(gpu, (frame) => {\n  vis.set({ time: performance.now() / 1000 })\n  frame.pass(output, vis)\n})`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/black-hole" },
  { id: "gpu_earth", title: "Earth", category: "gpu_gallery", tags: "planet procedural hdr bloom lighting", description: "Procedural planet with GPU-baked albedo, night lights, clouds, and atmosphere.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, NOISE_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/earth" },
  { id: "gpu_raymarch_fractal", title: "Raymarched Fractal", category: "gpu_gallery", tags: "raymarching fractal sierpinski tetrahedron", description: "Raymarched Sierpinski tetrahedron with directional light and HDR bloom.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, canvas)\nconst vis = effect(gpu, FRACTAL_SHADER)\nframeLoop(gpu, (frame) => frame.pass(output, vis))`, source: "https://github.com/hautlys/AIGpu/tree/main/examples/raymarched-fractal" },
]);

const frameworks = ref([
  { id: "vue", name: "Vue 3", lang: "Vue SFC", desc: "Reactive refs drive GPU state. Single-file components with Composition API.", code: `<script setup>\nimport { ref, onMounted, watch } from "vue"\nimport { init, effect, frameLoop, surface } from "aigpu"\n\nconst canvasRef = ref(null)\nconst status = ref("working")\nconst progress = ref(64)\n\nonMounted(() => {\n  const gpu = await init()\n  const output = surface(gpu, canvasRef.value)\n  const vis = effect(gpu, AGENT_SHADER, { set: { status: 0, progress: 0.64 } })\n  frameLoop(gpu, (frame) => frame.pass(output, vis))\n})\n\nwatch([status, progress], () => {\n  vis.set({ status: statusToFloat(status.value), progress: progress.value / 100 })\n})\n<\/script>\n\n<template>\n  <canvas ref="canvasRef" width="400" height="300" />\n</template>` },
  { id: "react", name: "React", lang: "TSX", desc: "useRef for canvas. useEffect for lifecycle. GPU state via props/callbacks.", code: `import { useRef, useEffect, useState } from "react"\nimport { init, effect, frameLoop, surface } from "aigpu"\n\nexport function AIGpuAgent({ status = "working", progress = 64 }) {\n  const canvasRef = useRef(null)\n\n  useEffect(() => {\n    const gpu = await init()\n    const output = surface(gpu, canvasRef.current)\n    const vis = effect(gpu, AGENT_SHADER)\n    frameLoop(gpu, (frame) => frame.pass(output, vis))\n    return () => gpu.dispose()\n  }, [])\n\n  return <canvas ref={canvasRef} width={400} height={300} />\n}` },
  { id: "svelte", name: "Svelte", lang: "Svelte", desc: "Reactive statements auto-sync GPU state. Compile-time optimized.", code: `<script>\n  import { onMount, onDestroy } from "svelte"\n  import { init, effect, frameLoop, surface } from "aigpu"\n\n  export let status = "working"\n  export let progress = 64\n\n  let canvas\n  let gpu, output, vis\n\n  onMount(() => {\n    gpu = await init()\n    output = surface(gpu, canvas)\n    vis = effect(gpu, AGENT_SHADER)\n    frameLoop(gpu, (frame) => frame.pass(output, vis))\n  })\n\n  onDestroy(() => gpu?.dispose())\n\n  $: vis?.set({ status: statusToFloat(status), progress: progress / 100 })\n</script>\n\n<canvas bind:this={canvas} width="400" height="300" />` },
  { id: "purejs", name: "Pure JS", lang: "JavaScript", desc: "Zero dependencies. Direct GPU API. Works anywhere with WebGPU.", code: `import { init, effect, frameLoop, surface } from "aigpu"\n\nconst gpu = await init()\nconst output = surface(gpu, document.querySelector("canvas"))\nconst vis = effect(gpu, AGENT_SHADER)\n\nframeLoop(gpu, (frame) => {\n  vis.set({ time: performance.now() / 1000 })\n  frame.pass(output, vis)\n})` },
  { id: "nextjs", name: "Next.js", lang: "TypeScript", desc: "Server-only + client boundaries. Dynamic imports. SSR-safe GPU rendering.", code: `// app/agent/page.tsx (Server Component)\nimport dynamic from "next/dynamic"\nconst AIGpuAgent = dynamic(() => import("./AIGpuAgent"), { ssr: false })\n\nexport default function AgentPage() {\n  return <AIGpuAgent status="working" progress={64} />\n}\n\n// app/agent/AIGpuAgent.tsx (Client Component)\n"use client"\nimport { useRef, useEffect } from "react"\nimport { init, effect, frameLoop, surface } from "aigpu"\n\nexport default function AIGpuAgent({ status, progress }) {\n  const canvasRef = useRef(null)\n  useEffect(() => {\n    const gpu = await init()\n    const output = surface(gpu, canvasRef.current)\n    const vis = effect(gpu, AGENT_SHADER)\n    frameLoop(gpu, (frame) => frame.pass(output, vis))\n    return () => gpu.dispose()\n  }, [])\n  return <canvas ref={canvasRef} width={400} height={300} />\n}` },
]);

const filteredExamples = computed(() => {
  let list = examples.value;
  if (filter.value !== "all") list = list.filter((e) => e.category === filter.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.includes(q));
  }
  return list;
});

function examplesByCategory(cat: string) {
  return examples.value.filter((e) => e.category === cat);
}

let eventIndex = 0;
const replayEvents = [
  { type: "patch", state: "thinking", progress: 10, activity: 25 },
  { type: "patch", state: "working", progress: 35, activity: 60 },
  { type: "patch", state: "working", progress: 55, activity: 78 },
  { type: "patch", state: "working", progress: 72, activity: 42 },
  { type: "patch", state: "success", progress: 100, activity: 0 },
  { type: "patch", state: "error", progress: 33, activity: 10 },
];

function applyPatch() {
  const entry = { status: status.value, progress: progress.value, activity: activity.value, time: new Date().toLocaleTimeString() };
  eventLog.value = `> patch ${JSON.stringify(entry)}\n` + eventLog.value;
}

function nextEvent() {
  const e = replayEvents[eventIndex % replayEvents.length];
  status.value = e.state;
  progress.value = e.progress;
  activity.value = e.activity;
  eventLog.value = `> replay[${eventIndex % replayEvents.length}] ${e.type} → ${e.state} ${e.progress}%\n` + eventLog.value;
  eventIndex++;
}

function copyCode(code: string, event: Event) {
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target as HTMLButtonElement;
    btn.classList.add("copied");
    btn.textContent = "Copied!";
    setTimeout(() => { btn.classList.remove("copied"); btn.textContent = "Copy source"; }, 1600);
  });
}

function openExample(ex: any) {
  modalType.value = "example";
  modalExample.value = ex;
  modalOpen.value = true;
}

function openFramework(fw: any) {
  modalType.value = "framework";
  modalFramework.value = fw;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  modalExample.value = null;
  modalFramework.value = null;
}
</script>

<template>
  <SiteHeader />
  <main id="top">
    <HeroSection :status :progress />
    <PlaygroundSection
      :status :progress :activity :eventLog
      @apply-patch="applyPatch"
      @next-event="nextEvent"
      @update:status="status = $event"
      @update:progress="progress = $event"
      @update:activity="activity = $event"
    />
    <ExamplesSection
      :examples :filteredExamples :categories :filter :search
      @update:filter="filter = $event"
      @update:search="search = $event"
      @open-example="openExample"
      @copy-code="copyCode"
      :examples-by-category="examplesByCategory"
    />
    <IntegrationsSection
      :frameworks
      @open-framework="openFramework"
      @copy-code="copyCode"
    />
    <HautlySection />
    <HautlyGallery />
    <InstallBanner @copy-code="copyCode" />
  </main>
  <SiteFooter />
  <ModalOverlay
    :open="modalOpen" :type="modalType" :example="modalExample" :framework="modalFramework"
    @close="closeModal"
    @copy-code="copyCode"
  />
</template>
