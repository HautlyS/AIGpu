<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useHautly } from "@hautly/entity/vue";
import { createSpeechController, type AIResponseAdapter } from "@hautly/entity/speech";

const hautlyMood = ref("idle");
const hautlyForm = ref("orb");
const hautlyEnergy = ref(0.5);
const hautlyAgent = ref("opencode");
const hautlyParticleCount = ref(12);
const hautlyBreathSpeed = ref(1.2);
const hautlyAuraIntensity = ref(0.3);
const hautlyEyeTrack = ref(true);
const hautlySpeechText = ref("");
const hautlyChatRef = ref<HTMLDivElement | null>(null);

const hautlyChatLog = ref([
  { role: "hautly", text: "Hello! I am Hautly, your alive orb companion. Click me or pick a mood." },
]);

const { engine, speech, mounted, mood, update, say, ask } = useHautly({
  form: hautlyForm.value,
  initial: { mood: hautlyMood.value, energy: hautlyEnergy.value },
});

const hautlyForms = ["orb", "crystal", "jelly", "phoenix", "nebula"];
const hautlyMoods = ["idle", "listening", "thinking", "speaking", "excited", "sleepy", "error", "healing"];

const hautlyFormDescs: Record<string, string> = {
  orb: "Classic alive orb with breathing, eye tracking, and particle aura.",
  crystal: "Faceted crystal with internal refraction patterns and sharp edges.",
  jelly: "Translucent jelly with tentacle-like particle trails and wobble.",
  phoenix: "Fiery phoenix with rising ember particles and heat shimmer.",
  nebula: "Cosmic nebula with swirling gas clouds and starfield particles.",
};

const hautlyFormDesc = computed(() => hautlyFormDescs[hautlyForm.value] || "");

const HAUTLY_MOCK_RESPONSES = [
  "I notice a potential memory leak in the render loop.",
  "The WGSL shader compiles clean.",
  "Nice use of ping-pong buffers there.",
  "I'd suggest caching that pipeline.",
  "The bind group layout looks correct.",
  "Frame time is within budget.",
  "Ready to trace the next dispatch.",
  "That compute shader is well-optimized.",
  "I see a pattern that could be simplified.",
];

watch(hautlyForm, (f) => update({ form: f as any }));
watch(hautlyMood, (m) => update({ mood: m as any }));
watch(hautlyEnergy, (e) => update({ energy: e }));

function hautlySetForm(f: string) { hautlyForm.value = f; }
function hautlySetMood(m: string) { hautlyMood.value = m; }

function hautlyShowSpeech(text: string) {
  hautlySpeechText.value = text;
  say(text);
  setTimeout(() => { hautlySpeechText.value = ""; }, 4000);
}

function hautlySpeak() {
  const msgs = [
    "Hello! I'm alive and breathing.",
    "The codebase looks great today.",
    "I'm tracking your mouse cursor!",
    "Ready to assist with anything.",
    "GPU-accelerated visuals at your service.",
    "I notice the imports could be optimized.",
    "The type safety here is solid.",
    "Want me to review the tests?",
    "This architecture scales well.",
  ];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  hautlyShowSpeech(msg);
  hautlyChatLog.value.push({ role: "user", text: msg });
  hautlyScrollChat();
  setTimeout(() => {
    const reply = HAUTLY_MOCK_RESPONSES[Math.floor(Math.random() * HAUTLY_MOCK_RESPONSES.length)];
    hautlyShowSpeech(reply);
    hautlyChatLog.value.push({ role: "hautly", text: reply });
    if (hautlyChatLog.value.length > 16) hautlyChatLog.value.shift();
    hautlyScrollChat();
  }, 1200);
}

function hautlySimulateAgent() {
  const events = [
    { mood: "thinking", text: "Analyzing codebase structure..." },
    { mood: "thinking", text: "Found 5 files to review." },
    { mood: "speaking", text: "Generating refactoring suggestions..." },
    { mood: "excited", text: "Refactoring complete! 3 improvements applied." },
    { mood: "listening", text: "Waiting for next command..." },
    { mood: "idle", text: "Ready for next task." },
  ];
  let i = 0;
  function nextEvent() {
    if (i >= events.length) return;
    const ev = events[i];
    hautlyMood.value = ev.mood;
    hautlyShowSpeech(ev.text);
    hautlyChatLog.value.push({ role: "hautly", text: ev.text });
    if (hautlyChatLog.value.length > 16) hautlyChatLog.value.shift();
    hautlyScrollChat();
    i++;
    setTimeout(nextEvent, 2500);
  }
  hautlyChatLog.value.push({ role: "user", text: "Run agent simulation" });
  hautlyScrollChat();
  nextEvent();
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
  const prev = hautlyMood.value;
  hautlyMood.value = "excited";
  setTimeout(() => { hautlyMood.value = prev; }, 800);
}

function hautlyScrollChat() {
  setTimeout(() => {
    const el = hautlyChatRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}
</script>

<template>
  <section id="hautly" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">hautly entity</p><h2>An alive orb that lives in your terminal.</h2></div>
      <p class="section-note">Hautly is an ASCII orb-spirit companion. Pick a form, watch it breathe, click it, talk to it. Connected to Opencode, Claude Code, and Codex.</p>
    </div>
    <div class="hautly-layout">
      <div class="hautly-stage">
        <div class="stage-toolbar">
          <span class="toolbar-title">hautly / entity</span>
          <span class="toolbar-status"><i></i> alive</span>
        </div>
        <div class="hautly-canvas-wrap" @click="hautlyClick">
          <canvas
            ref="canvasRef"
            :data-form="hautlyForm"
            :data-mood="hautlyMood"
            :data-energy="hautlyEnergy"
            width="800" height="480"
            aria-label="Hautly entity"
          ></canvas>
          <div class="hautly-speech-bubble" v-if="hautlySpeechText">
            <span>{{ hautlySpeechText }}</span>
          </div>
        </div>
        <div class="hautly-status-bar">
          <span class="hautly-mood-badge" :class="'mood-' + hautlyMood">{{ hautlyMood }}</span>
          <span class="hautly-form-label">{{ hautlyForm }}</span>
          <span class="hautly-energy-bar"><span :style="{ width: (hautlyEnergy * 100) + '%' }"></span></span>
          <span class="hautly-energy-val">{{ Math.round(hautlyEnergy * 100) }}%</span>
        </div>
      </div>
      <div class="hautly-controls">
        <p class="panel-kicker">// entity controls</p>
        <h3>Make it alive</h3>
        <div class="control-group">
          <label>Skin / Form</label>
          <div class="hautly-form-grid">
            <button v-for="f in hautlyForms" :key="f" class="hautly-form-btn" :class="{ active: hautlyForm === f }" @click="hautlySetForm(f)">{{ f }}</button>
          </div>
          <p class="control-hint">{{ hautlyFormDesc }}</p>
        </div>
        <div class="control-group">
          <label>Mood</label>
          <div class="hautly-form-grid">
            <button v-for="m in hautlyMoods" :key="m" class="hautly-mood-btn" :class="{ active: hautlyMood === m, ['mood-' + m]: true }" @click="hautlySetMood(m)">{{ m }}</button>
          </div>
        </div>
        <div class="control-group">
          <label>Energy <output>{{ Math.round(hautlyEnergy * 100) }}%</output></label>
          <input type="range" min="0" max="100" :value="hautlyEnergy * 100" @input="hautlyEnergy = +($event.target as HTMLInputElement).value / 100">
        </div>
        <div class="control-row">
          <div class="control-group control-half">
            <label>Particles <output>{{ hautlyParticleCount }}</output></label>
            <input type="range" min="4" max="24" step="2" :value="hautlyParticleCount" @input="hautlyParticleCount = +($event.target as HTMLInputElement).value">
          </div>
          <div class="control-group control-half">
            <label>Breath speed <output>{{ hautlyBreathSpeed.toFixed(1) }}</output></label>
            <input type="range" min="0.3" max="3.0" step="0.1" :value="hautlyBreathSpeed" @input="hautlyBreathSpeed = +($event.target as HTMLInputElement).value">
          </div>
        </div>
        <div class="control-row">
          <div class="control-group control-half">
            <label>Aura <output>{{ Math.round(hautlyAuraIntensity * 100) }}%</output></label>
            <input type="range" min="0" max="100" :value="hautlyAuraIntensity * 100" @input="hautlyAuraIntensity = +($event.target as HTMLInputElement).value / 100">
          </div>
          <div class="control-group control-half">
            <label>Eye tracking</label>
            <button class="hautly-toggle-btn" :class="{ active: hautlyEyeTrack }" @click="hautlyEyeTrack = !hautlyEyeTrack">{{ hautlyEyeTrack ? 'on' : 'off' }}</button>
          </div>
        </div>
        <div class="control-actions">
          <button class="button button-primary button-full" @click="hautlySpeak">Say hello</button>
          <button class="button button-quiet button-full" @click="hautlySimulateAgent">Simulate agent</button>
        </div>
        <div class="hautly-conversation" ref="hautlyChatRef">
          <p class="panel-kicker">// mock conversation</p>
          <div class="hautly-chat-log" v-for="(msg, i) in hautlyChatLog" :key="i" :class="msg.role">
            <span class="chat-role">{{ msg.role === 'user' ? '>' : 'hautly' }}</span>
            <span class="chat-text">{{ msg.text }}</span>
          </div>
        </div>
        <div class="control-group">
          <label>Connected agents</label>
          <div class="hautly-agent-tags">
            <span class="agent-tag" v-for="a in ['opencode', 'claude-code', 'codex']" :key="a" :class="{ active: hautlyAgent === a }" @click="hautlyAgent = a">{{ a }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
