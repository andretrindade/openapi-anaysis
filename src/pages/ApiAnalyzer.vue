<template>
  <q-page padding>
    <q-card flat bordered class="q-pa-md">
      <q-card-section class="row items-center q-pb-none">
        <div class="col">
          <div class="text-h6">Open Finance API Architect Tool</div>
          <div class="text-subtitle2 text-grey-7">Complexity, Idempotency & Async Analysis</div>
        </div>
        <div v-if="metrics.length > 0" class="col-auto">
          <q-btn 
            color="primary" 
            icon="archive" 
            label="Export CSV" 
            @click="exportCSV" 
            flat 
          />
        </div>
      </q-card-section>

      <q-card-section>
        <q-file 
          v-model="ymlFile" 
          label="Upload openapi file (.yaml / .yml)" 
          outlined 
          dense
          accept=".yaml, .yml"
          @update:model-value="processFile"
        >
          <template v-slot:prepend><q-icon name="cloud_upload" /></template>
        </q-file>
      </q-card-section>

      <q-table
        v-if="metrics.length > 0"
        :rows="metrics"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :pagination="{ rowsPerPage: 0 }"
      >
        <template v-slot:body-cell-isIdempotent="props">
          <q-td :props="props">
            <q-chip :color="props.value === 'Sim' ? 'green-1' : 'grey-2'" :text-color="props.value === 'Sim' ? 'green-9' : 'grey-7'" dense label>
              {{ props.value }}
            </q-chip>
          </q-td>
        </template>
        
        <template v-slot:body-cell-isAsync="props">
          <q-td :props="props">
            <q-chip :color="props.value === 'Sim' ? 'green-1' : 'grey-2'" :text-color="props.value === 'Sim' ? 'green-9' : 'grey-7'" dense label>
              {{ props.value }}
            </q-chip>
          </q-td>
        </template>

      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import jsYaml from 'js-yaml';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { exportFile, useQuasar } from 'quasar';
import { Buffer } from 'buffer';

window.Buffer = window.Buffer || Buffer;
const $q = useQuasar();

const ymlFile = ref(null);
const metrics = ref([]);

const columns = [
  { name: 'path', label: 'Endpoint', field: 'path', align: 'left' },
  { name: 'method', label: 'Metódo', field: 'method', align: 'center' },
  { name: 'isIdempotent', label: 'Idempotency', field: 'isIdempotent', align: 'center' },
  { name: 'isAsync', label: 'Async', field: 'isAsync', align: 'center' },
  { name: 'reqFields', label: 'Requisição - Número de Campos', field: 'reqFields', align: 'center' },
  { name: 'reqDepth', label: 'Requisição - Número de Níveis da Estrutura de Dados', field: 'reqDepth', align: 'center' },
  { name: 'reqRest', label: 'Requisição - Número de campos condicionais', field: 'reqRest', align: 'center' },
  { name: 'resFields', label: 'Resposta - Número de Campos', field: 'resFields', align: 'center' },
  { name: 'resDepth', label: 'Resposta - Número de Níveis da Estrutura de Dados', field: 'resDepth', align: 'center' },
  { name: 'resRest', label: 'Resposta - Número de campos condicionais', field: 'resRest', align: 'center' }
];

function wrapCsvValue(val) {
  let formatted = val !== void 0 && val !== null ? String(val) : '';
  formatted = formatted.split('"').join('""');
  return `"${formatted}"`;
}

const exportCSV = () => {
  const content = [columns.map(col => wrapCsvValue(col.label))].concat(
    metrics.value.map(row => columns.map(col => wrapCsvValue(
      typeof col.field === 'function' ? col.field(row) : row[col.field === void 0 ? col.name : col.field]
    )).join(','))
  ).join('\r\n');

  const status = exportFile('api-complexity-metrics.csv', content, 'text/csv');

  if (status !== true) {
    $q.notify({
      message: 'Browser denied file download...',
      color: 'negative',
      icon: 'warning'
    });
  }
};

function walkSchema(schema, depth = 0) {
  if (!schema || typeof schema !== 'object') return { count: 0, maxDepth: depth, restCount: 0 };
  let count = 0, maxSubDepth = depth, restCount = 0;

  if (schema.description && (schema.description.includes('[Restrição]') || schema.description.includes('[RESTRIÇÃO]'))) {
    restCount++;
  }

  if (schema.properties) {
    const props = Object.keys(schema.properties);
    count += props.length;
    props.forEach(key => {
      const sub = walkSchema(schema.properties[key], depth + 1);
      count += sub.count; restCount += sub.restCount;
      if (sub.maxDepth > maxSubDepth) maxSubDepth = sub.maxDepth;
    });
  } else if (schema.items) {
    const sub = walkSchema(schema.items, depth + 1);
    count += sub.count; restCount += sub.restCount;
    if (sub.maxDepth > maxSubDepth) maxSubDepth = sub.maxDepth;
  }
  return { count, maxDepth: maxSubDepth, restCount };
}

const processFile = async (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const rawYaml = e.target.result;
      const api = await $RefParser.dereference(jsYaml.load(rawYaml));
      const results = [];
      let synTotal = 0, semTotal = 0;

      for (const [path, methods] of Object.entries(api.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          const hasIdempotency = op.parameters?.some(p => p.name === 'x-idempotency-key') ? 'Sim' : 'Não';
          const isAsync = op.responses?.['202'] ? 'Sim' : 'Não';

          
          const reqSchema = op.requestBody?.content?.['application/jwt']?.schema || op.requestBody?.content?.['application/json']?.schema;
          const reqMetrics = walkSchema(reqSchema);
          const successCode = Object.keys(op.responses).find(c => c.startsWith('2'));
          const resSchema = op.responses[successCode]?.content?.['application/jwt']?.schema || op.responses[successCode]?.content?.['application/json']?.schema;
          const resMetrics = walkSchema(resSchema);

          results.push({
            id: `${path}-${method}`, path, method: method.toUpperCase(),
            isIdempotent: hasIdempotency, isAsync: isAsync,
            reqFields: reqMetrics.count, reqDepth: reqSchema ? reqMetrics.maxDepth : 0, reqRest: reqMetrics.restCount,
            resFields: resMetrics.count, resDepth: resSchema ? resMetrics.maxDepth : 0, resRest: resMetrics.restCount
          });
        }
      }
      metrics.value = results;
    } catch (err) { console.error("Analysis Error:", err); }
  };
  reader.readAsText(file);
};
</script>