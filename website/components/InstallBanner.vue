<script setup lang="ts">
const emit = defineEmits<{
  "copy-code": [code: string, event: Event];
}>();
</script>

<template>
  <section class="section-shell install-banner">
    <div>
      <p class="eyebrow">ready to build</p>
      <h2>npm install aigpu @hautly/entity</h2>
      <p>Core + Hautly entity + agent adapters. Application owns state.</p>
    </div>
    <div class="install-command">
      <code>npm install @hautly/entity</code>
      <button class="copy-trigger" @click="emit('copy-code', 'npm install @hautly/entity', $event)">Copy</button>
    </div>
  </section>
</template>
