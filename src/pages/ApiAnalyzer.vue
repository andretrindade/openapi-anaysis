
<template>
  <q-page padding>
    <q-card flat bordered class="q-pa-md">
      <q-card-section class="row items-center q-pb-none">
        <div class="col">
          <div class="text-h6">Open Finance API Architect Tool</div>
          <div class="text-subtitle2 text-grey-7">
            Complexity, Idempotency & Async Analysis
          </div>
        </div>

      
      </q-card-section>

     
      <q-separator />

      <q-card-section class="row items-center q-pa-none">
        <div class="col-auto">
          <q-btn
            color="primary"
            icon="archive"
            label="Export CSV"
            @click="exportCSV"
            flat
            v-if="journeysGrouped.length > 0 && isLoadingMultiple === false"
          />
        </div>
        <div class="col-auto">
          <q-btn
            color="primary"
            icon="upload"
            label="Upload config"
            flat
            @click="showUploadDialog = true"
          />
        </div>
      </q-card-section>
      <q-card-section v-if="isLoadingMultiple">
        <q-linear-progress
          :value="loadingProgress"
          color="primary"
          class="q-mb-md"
        />
        <div class="text-center text-caption">
          Carregando arquivo {{ currentLoadingIndex }} de {{ totalJornadas }}
        </div>
      </q-card-section>

      <!-- LIST VIEW: show journey cards or the selected journey's APIs -->
      <div v-if="!selectedApiKey && journeysGrouped.length > 0" class="q-mt-md">
        <!-- Journey cards overview -->
        <div v-if="!selectedJourneyName" class="row q-col-gutter-md">
          <div
            v-for="journey in journeysGrouped"
            :key="journey.name + '-card'"
            class="col-12 col-md-6 col-lg-4 q-mb-md"
            @click="openJourney(journey)"
          >
            <JourneyCard :journey="journey" />
          </div>
        </div>

        <!-- Selected journey: show its API list -->
        <div v-else>
          <div class="row items-center q-mb-md">
            <q-btn flat icon="arrow_back" label="Todas as jornadas" @click="selectedJourneyName = null" />
            <div class="q-ml-md text-h6">{{ selectedJourney?.name }}</div>
            <q-space />
            <q-chip dense outline>{{ selectedJourney?.totalEndpoints }} endpoints</q-chip>
          </div>

          <div class="row q-col-gutter-md">
            <div
              v-for="api in selectedJourney.apis"
              :key="api.apiKey"
              class="col-12 col-md-6 col-lg-4"
            >
              <q-card
                flat
                bordered
                class="cursor-pointer"
                :style="{ borderLeft: '4px solid ' + api.color }"
                @click="openApi(api)"
              >
                <q-card-section
                  class="row items-center"
                  :style="{ backgroundColor: api.color + '15' }"
                >
                  <div class="col">
                    <div class="text-subtitle1 text-weight-medium">
                      {{ api.apiTitle || "API (sem título)" }}
                    </div>
                    <div class="text-caption text-grey-7">
                      Versão: {{ api.apiVersion || "N/A" }} •
                      {{ api.endpointsCount }} endpoints
                    </div>
                  </div>
                  <div class="col-auto">
                    <q-icon name="chevron_right" />
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section class="text-caption">
                  <div class="row items-center q-gutter-xs">
                    <q-chip dense square>
                      Idempotent: {{ api.idempotentYes }}/{{ api.endpointsCount }}
                    </q-chip>
                    <q-chip dense square>
                      Async: {{ api.asyncYes }}/{{ api.endpointsCount }}
                    </q-chip>
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
          </div>
        </div>
      </div>

      <!-- DETAIL VIEW: selected API -->
      <div v-if="selectedApiKey && selectedApi" class="q-mt-md">
        <div class="row items-center q-mb-md">
          <q-btn icon="arrow_back" flat label="Voltar" @click="selectedApiKey = null" />
          <div class="q-ml-md">
            <div class="text-h6">
              {{ selectedApi.journeyName }} — {{ selectedApi.apiTitle || "API (sem título)" }}
            </div>
            <div class="text-caption text-grey-7">
              Versão: {{ selectedApi.apiVersion || "N/A" }} •
              {{ selectedApi.endpoints.length }} endpoints
            </div>
          </div>
          <q-space />
          <q-btn
            v-if="selectedApi.urlDocument"
            flat
            dense
            icon="description"
            label="Doc"
             target="_blank" 
                      :href="selectedApi.urlDocument"
                      @click.stop="null"
          />
          <q-btn
            v-if="selectedApi.urlOpenFile"
            flat
            dense
            icon="open_in_new"
            label="OpenAPI"
             target="_blank" 
              :href="selectedApi.urlOpenFile"
            @click.stop="null"
          />
        </div>

        <q-card flat bordered :style="{ borderLeft: '4px solid ' + selectedApi.color }">
          <q-card-section
            class="row items-center"
            :style="{ backgroundColor: selectedApi.color + '15' }"
          >
            <div class="col">
              <div class="text-subtitle1 text-weight-medium">
                {{ selectedApi.apiTitle || "API (sem título)" }}
              </div>
              <div class="text-caption text-grey-7">
                Versão: {{ selectedApi.apiVersion || "N/A" }} • {{ selectedApi.journeyName }}
              </div>
            </div>
          </q-card-section>

          <q-table
            :rows="selectedApi.endpoints"
            :columns="columns"
            row-key="id"
            flat
            dense="true"
            :pagination="{ rowsPerPage: 0 }"
            class="q-mt-sm"
            hide-bottom
          >
            <template v-slot:body-cell-isIdempotent="props">
              <q-td :props="props">
                <q-chip
                  :color="props.value === 'Sim' ? 'green-1' : 'grey-2'"
                  :text-color="props.value === 'Sim' ? 'green-9' : 'grey-7'"
                  dense
                  label
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-isAsync="props">
              <q-td :props="props">
                <q-chip
                  :color="props.value === 'Sim' ? 'green-1' : 'grey-2'"
                  :text-color="props.value === 'Sim' ? 'green-9' : 'grey-7'"
                  dense
                  label
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-urlDocument="props">
              <q-td :props="props">
                <q-btn
                  v-if="props.value"
                  flat
                  dense
                  icon="description"
                  label="Doc"
                  @click="window.open(props.value, '_blank')"
                />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <q-dialog v-model="showUploadDialog">
        <q-card style="min-width: 480px;">
           <q-card-section>
             <q-btn
            color="primary"
            icon="archive"
            no-caps
            label="Download Template journey.json"
            target="_blank"
            href="./src/assets/journey.json"
          />
      </q-card-section>
          <q-card-section>
            <q-file
              v-model="configFile"
              label="Upload config.json (múltiplas jornadas)"
              outlined
              dense
              accept=".json"
              @update:model-value="onUploadFile"
            >
              <template v-slot:prepend><q-icon name="settings" /></template>
            </q-file>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="primary" @click="showUploadDialog = false" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <div v-if="metrics.length === 0 && !isLoadingMultiple" class="q-mt-md">
        <q-banner dense class="bg-grey-1 text-grey-8">
          Faça upload de um config.json para iniciar.
        </q-banner>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import defaultConfig from 'src/assets/journey.json';
import JourneyCard from 'src/components/JourneyCard.vue';
import jsYaml from "js-yaml";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { exportFile, useQuasar } from "quasar";

const $q = useQuasar();

const configFile = ref(null);
const showUploadDialog = ref(false);
const isLoadingMultiple = ref(false);
const currentLoadingIndex = ref(0);
const totalJornadas = ref(0);
const metrics = ref([]);

// Selected API detail navigation
const selectedApiKey = ref(null);
const selectedJourneyName = ref(null);

const selectedJourney = computed(() => {
  if (!selectedJourneyName.value) return null;
  return journeysGrouped.value.find((j) => j.name === selectedJourneyName.value) || null;
});

async function onUploadFile(file) {
  if (!file) return;
  try {
    await processConfigFile(file);
  } catch (err) {
    console.error('Upload error', err);
    $q.notify({ message: 'Erro ao processar upload: ' + err.message, color: 'negative' });
  } finally {
    showUploadDialog.value = false;
  }
}

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

const columns = [
  { name: "path", label: "Endpoint", field: "path", align: "left" },
  { name: "method", label: "Método", field: "method", align: "center" },
  { name: "isIdempotent", label: "Idempotency", field: "isIdempotent", align: "center" },
  { name: "isAsync", label: "Async", field: "isAsync", align: "center" },
  { name: "reqFields", label: "Req. - Número de Campos", field: "reqFields", align: "center" },
  { name: "reqDepth", label: "Req. - Número de Níveis da Estrutura de Dados", field: "reqDepth", align: "center" },
  { name: "reqRest", label: "Req. - Número de campos condicionais", field: "reqRest", align: "center" },
  { name: "resFields", label: "Res. - Número de Campos", field: "resFields", align: "center" },
  { name: "resDepth", label: "Res. - Número de Níveis da Estrutura de Dados", field: "resDepth", align: "center" },
  { name: "resRest", label: "Res. - Número de campos condicionais", field: "resRest", align: "center" }

];

const loadingProgress = computed(() => {
  if (totalJornadas.value === 0) return 0;
  return currentLoadingIndex.value / totalJornadas.value;
});

function wrapCsvValue(val) {
  let formatted = val !== void 0 && val !== null ? String(val) : "";
  formatted = formatted.split('"').join('""');
  return `"${formatted}"`;
}

const exportCSV = () => {
  const csvColumns = [
    { name: "jornada", label: "Jornada" },
    { name: "apiTitle", label: "API Title" },
    { name: "apiVersion", label: "API Version" },
    ...columns,
  ];

  const content = [csvColumns.map((col) => wrapCsvValue(col.label))]
    .concat(
      metrics.value.map((row) =>
        csvColumns
          .map((col) =>
            wrapCsvValue(
              typeof col.field === "function"
                ? col.field(row)
                : row[col.field === void 0 ? col.name : col.field],
            ),
          )
          .join(","),
      ),
    )
    .join("\r\n");

  const status = exportFile("api-complexity-metrics.csv", content, "text/csv");

  if (status !== true) {
    $q.notify({
      message: "Browser denied file download...",
      color: "negative",
      icon: "warning",
    });
  }
};

function walkSchema(schema, depth = 0) {
  if (!schema || typeof schema !== "object")
    return { count: 0, maxDepth: depth, restCount: 0 };

  let count = 0,
    maxSubDepth = depth,
    restCount = 0;

  if (
    schema.description &&
    (schema.description.includes("[Restrição]") ||
      schema.description.includes("[RESTRIÇÃO]"))
  ) {
    restCount++;
  }

  if (schema.properties) {
    const props = Object.keys(schema.properties);
    count += props.length;
    props.forEach((key) => {
      const sub = walkSchema(schema.properties[key], depth + 1);
      count += sub.count;
      restCount += sub.restCount;
      if (sub.maxDepth > maxSubDepth) maxSubDepth = sub.maxDepth;
    });
  } else if (schema.items) {
    const sub = walkSchema(schema.items, depth + 1);
    count += sub.count;
    restCount += sub.restCount;
    if (sub.maxDepth > maxSubDepth) maxSubDepth = sub.maxDepth;
  }

  return { count, maxDepth: maxSubDepth, restCount };
}

const analyzeYaml = async (
  rawYaml,
  journeyName,
  color,
  urlDocument,
  urlOpenFile,
) => {
  // Parse then dereference
  const parsed = jsYaml.load(rawYaml);
  const api = await $RefParser.dereference(parsed);

  // Extract title/version from OpenAPI info
  const apiTitle = api?.info?.title || null;
  const apiVersion = api?.info?.version || null;

  const results = [];

  for (const [path, methods] of Object.entries(api.paths || {})) {
    for (const [method, op] of Object.entries(methods || {})) {
      const hasIdempotency = op.parameters?.some(
        (p) => p.name === "x-idempotency-key",
      )
        ? "Sim"
        : "Não";

      const isAsync = op.responses?.["202"] ? "Sim" : "Não";

      const reqSchema =
        op.requestBody?.content?.["application/jwt"]?.schema ||
        op.requestBody?.content?.["application/json"]?.schema;
      const reqMetrics = walkSchema(reqSchema);

      const successCode = Object.keys(op.responses || {}).find((c) =>
        c.startsWith("2"),
      );

      const resSchema =
        (successCode &&
          (op.responses?.[successCode]?.content?.["application/jwt"]?.schema ||
            op.responses?.[successCode]?.content?.["application/json"]?.schema)) ||
        null;

      const resMetrics = walkSchema(resSchema);

      results.push({
        id: `${journeyName}-${urlOpenFile}-${path}-${method}`,
        jornada: journeyName,
        cor: color,
        urlDocument,
        urlOpenFile,
        apiTitle,
        apiVersion,
        path,
        method: method.toUpperCase(),
        isIdempotent: hasIdempotency,
        isAsync: isAsync,
        reqFields: reqMetrics.count,
        reqDepth: reqSchema ? reqMetrics.maxDepth : 0,
        reqRest: reqMetrics.restCount,
        resFields: resMetrics.count,
        resDepth: resSchema ? resMetrics.maxDepth : 0,
        resRest: resMetrics.restCount,
      });
    }
  }

  metrics.value = [...metrics.value, ...results];
};

// Process an in-memory config array (used by file upload and default config)
const processConfigArray = async (config) => {
  if (!Array.isArray(config)) {
    throw new Error("O arquivo config.json deve conter um array de jornadas");
  }

  metrics.value = [];
  selectedApiKey.value = null;
  isLoadingMultiple.value = true;

  const totalApis = config.reduce((acc, j) => {
    const apis = Array.isArray(j?.apis) ? j.apis : [];
    return acc + apis.length;
  }, 0);

  totalJornadas.value = totalApis || 0;
  currentLoadingIndex.value = 0;

  let journeyIndex = 0;

  for (const journeyItem of config) {
    journeyIndex++;

    const journeyName = journeyItem?.journey;
    const apis = journeyItem?.apis;

    if (!journeyName || !Array.isArray(apis)) {
      console.warn("Jornada inválida no config.json:", journeyItem);
      continue;
    }

    const journeyColor = coresPaleta[(journeyIndex - 1) % coresPaleta.length];

    for (const apiItem of apis) {
      currentLoadingIndex.value += 1;

      const urlOpenFile = apiItem?.urlOpenFile;
      const urlDocument = apiItem?.urlDocument || null;

      if (!urlOpenFile) {
        console.warn("API inválida (sem urlOpenFile):", apiItem);
        continue;
      }

      try {
        let response;
        try {
          response = await fetch(urlOpenFile);
        } catch (corsError) {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlOpenFile)}`;
          response = await fetch(proxyUrl);
        }

        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}`);
        }

        const rawYaml = await response.text();

        await analyzeYaml(rawYaml, journeyName, journeyColor, urlDocument, urlOpenFile);
      } catch (err) {
        console.error(`Erro ao processar ${journeyName}:`, err);
        $q.notify({
          message: `Erro ao carregar ${journeyName}: ${err.message}`,
          color: "warning",
          icon: "warning",
        });
      }
    }
  }

  isLoadingMultiple.value = false;

  $q.notify({
    message: "Config carregado com sucesso!",
    color: "positive",
    icon: "check_circle",
  });
};

const processConfigFile = async (file) => {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const config = JSON.parse(e.target.result);
      await processConfigArray(config);
    } catch (err) {
      console.error("Config File Error:", err);
      $q.notify({
        message: "Erro ao processar config.json: " + err.message,
        color: "negative",
        icon: "error",
      });
      isLoadingMultiple.value = false;
    }
  };

  reader.readAsText(file);
};

// Load default config on mount
onMounted(() => {
  try {
    if (defaultConfig && defaultConfig.length > 0) {
      processConfigArray(defaultConfig);
    }
  } catch (err) {
    console.error('Erro ao carregar default config:', err);
  }
});

// ----------- GROUPING: journey -> api -----------
// IMPORTANT: apiKey is based on urlOpenFile to ensure uniqueness even if title/version repeats
const journeysGrouped = computed(() => {
  const byJourney = {};

  for (const row of metrics.value) {
    const journeyName = row.jornada || "Arquivo Único";
    const apiIdentity = row.urlOpenFile || "single";
    const apiKey = `${journeyName}::${apiIdentity}`;

    if (!byJourney[journeyName]) {
      byJourney[journeyName] = {
        name: journeyName,
        apis: {},
        totalEndpoints: 0,
      };
    }

    if (!byJourney[journeyName].apis[apiKey]) {
      byJourney[journeyName].apis[apiKey] = {
        apiKey,
        journeyName,
        apiTitle: row.apiTitle || null,
        apiVersion: row.apiVersion || null,
        color: row.cor || coresPaleta[0],
        urlDocument: row.urlDocument || null,
        urlOpenFile: row.urlOpenFile || null,
        endpoints: [],
        endpointsCount: 0,
        idempotentYes: 0,
        asyncYes: 0,
      };
    }

    const api = byJourney[journeyName].apis[apiKey];

    // If first rows had missing title/version but later ones have it, fill in
    if (!api.apiTitle && row.apiTitle) api.apiTitle = row.apiTitle;
    if (!api.apiVersion && row.apiVersion) api.apiVersion = row.apiVersion;

    api.endpoints.push(row);
    api.endpointsCount += 1;
    byJourney[journeyName].totalEndpoints += 1;

    if (row.isIdempotent === "Sim") api.idempotentYes += 1;
    if (row.isAsync === "Sim") api.asyncYes += 1;
  }

  return Object.values(byJourney)
    .map((j) => ({
      ...j,
      apis: Object.values(j.apis).sort((a, b) =>
        String(a.apiTitle || "").localeCompare(String(b.apiTitle || "")),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const selectedApi = computed(() => {
  if (!selectedApiKey.value) return null;

  for (const journey of journeysGrouped.value) {
    const found = journey.apis.find((a) => a.apiKey === selectedApiKey.value);
    if (found) return found;
  }

  return null;
});

function openApi(api) {
  selectedApiKey.value = api.apiKey;
}

function openJourney(journey) {
  selectedJourneyName.value = journey.name;
}
</script>
