<template>
  <q-card
    flat
    bordered
    :class="['api-card', { 'cursor-pointer': true, selected } ]"
    @click="$emit('click', journey)"
    role="button"
    tabindex="0"
    v-ripple
  >
    <div class="api-accent" :style="{ background: journey.apis[0]?.color || coresPaleta[0] }" />

    <q-card-section>
      <div class="row items-start">
        <div class="col">
          <div class="text-subtitle1 text-weight-bold">{{ journey.name }}</div>
          <div class="text-caption text-grey-7 q-mt-xs">{{ journey.apis.length }} APIs • {{ journey.totalEndpoints }} endpoints</div>
        </div>
        </div>

      
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  journey: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});
const coresPaleta = [
  "#1976D2",
  "#388E3C",
  "#D32F2F",
  "#F57C00",
  "#7B1FA2",
  "#0097A7",
  "#C2185B",
  "#5D4037",
  "#455A64",
  "#00897B",
];
</script>

<style scoped>
.api-card {
  border-radius: 14px;
  overflow: hidden;
  transition: transform 140ms ease, box-shadow 140ms ease;
  position: relative;
}

.api-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
}

.api-card.selected {
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

.api-accent {
  height: 4px;
  width: 100%;
}

.metric-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.metric {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.02);
  min-height: 58px;
}
</style>
