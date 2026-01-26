<template>
  <div class="api-card-wrapper">
    <q-card
      flat
      bordered
      class="api-card cursor-pointer"
      :style="{ borderLeft: `4px solid ${api.color}` }"
      @click="$emit('click', api)"
    >
      <q-card-section class="row items-center" :style="{ backgroundColor: api.color + '15' }">
        <div class="col">
          <div class="text-subtitle1 text-weight-medium">{{ api.apiTitle || 'API (sem título)' }}</div>
          <div class="text-caption text-grey-7">Versão: {{ api.apiVersion || 'N/A' }} • {{ api.endpointsCount }} endpoints</div>
        </div>
        <div class="col-auto">
          <q-icon name="chevron_right" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-caption">
        <div class="row items-center q-gutter-xs">
          <q-chip dense square>Idempotent: {{ api.idempotentYes }}/{{ api.endpointsCount }}</q-chip>
          <q-chip dense square>Async: {{ api.asyncYes }}/{{ api.endpointsCount }}</q-chip>
        </div>

        <div class="q-mt-sm row items-center q-gutter-sm">
          <q-btn
            v-if="api.urlDocument"
            flat
            dense
            icon="description"
            label="Doc"
            target="_blank"
            :href="api.urlDocument"
            @click.stop="null"
          />
          <q-btn
            v-if="api.urlOpenFile"
            flat
            dense
            icon="open_in_new"
            label="OpenAPI"
            target="_blank"
            :href="api.urlOpenFile"
            @click.stop="null"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
const props = defineProps({ api: { type: Object, required: true } });
</script>

<style scoped>
.api-card {
  border-radius: 10px;
  overflow: hidden;
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.api-card:hover { transform: translateY(-4px); box-shadow: 0 12px 26px rgba(0,0,0,0.08); }
.api-card-wrapper { height: 100%; }
</style>
