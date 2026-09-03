<script setup lang="ts">
import { ref, computed } from "vue";

const hautlyGallerySelected = ref("");

const hautlyForms = ["orb", "crystal", "jelly", "phoenix", "nebula"];
const hautlyMoods = ["idle", "thinking", "speaking", "excited", "sleepy", "error"];

const hautlyGallery = computed(() => {
  const items = [];
  for (const form of hautlyForms) {
    for (const mood of hautlyMoods) {
      items.push({ form, mood });
    }
  }
  return items;
});

function hautlyGallerySelect(item: { form: string; mood: string }) {
  hautlyGallerySelected.value = item.form + "-" + item.mood;
}
</script>

<template>
  <section id="hautly-gallery" class="section-shell section-block">
    <div class="section-heading">
      <div><p class="eyebrow">entity gallery</p><h2>Every form. Every mood. Animated.</h2></div>
      <p class="section-note">Click any entity to preview it live. Each form has unique breathing, particles, and expression patterns.</p>
    </div>
    <div class="hautly-gallery-grid">
      <div v-for="item in hautlyGallery" :key="item.form + '-' + item.mood"
           class="hautly-gallery-card"
           :class="{ selected: hautlyGallerySelected === item.form + '-' + item.mood }"
           @click="hautlyGallerySelect(item)">
        <canvas
          class="hautly-gallery-canvas"
          :data-entity="item.form + '-' + item.mood"
          :data-form="item.form"
          :data-mood="item.mood"
          width="320" height="200"
        ></canvas>
        <div class="hautly-gallery-info">
          <span class="hautly-gallery-form">{{ item.form }}</span>
          <span class="hautly-gallery-mood" :class="'mood-' + item.mood">{{ item.mood }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
