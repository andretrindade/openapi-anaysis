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
        <div class="col-auto">
          <q-btn
            color="primary"
            icon="archive"
            label="Export CSV"
            @click="exportCSV"
            flat
            :disable="metrics.length === 0"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-file
              v-model="ymlFile"
              label="1. Upload arquivo OpenAPI (.yaml / .yml)"
              outlined
              dense
              accept=".yaml, .yml"
              @update:model-value="processFile"
            >
              <template v-slot:prepend><q-icon name="cloud_upload" /></template>
            </q-file>
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="ymlUrl"
              label="2. Ou cole a URL do arquivo OpenAPI"
              outlined
              dense
              @keyup.enter="loadFromUrl"
            >
              <template v-slot:prepend><q-icon name="link" /></template>
              <template v-slot:append>
                <q-btn
                  icon="download"
                  flat
                  dense
                  @click="loadFromUrl"
                  :disable="!ymlUrl"
                  :loading="isLoadingUrl"
                />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-file
              v-model="configFile"
              label="3. Ou upload config.json (múltiplas jornadas)"
              outlined
              dense
              accept=".json"
              @update:model-value="processConfigFile"
            >
              <template v-slot:prepend><q-icon name="settings" /></template>
            </q-file>
          </div>
        </div>

        <q-expansion-item
          dense
          dense-toggle
          expand-separator
          icon="info"
          label="Formato do config.json"
          class="q-mt-md"
        >
          <q-card>
            <q-card-section>
              <pre class="text-caption">{{
                `[
  {
    "jornada": "Portabilidade de Crédito",
    "nomeArquivo": "credit-portability.yml",
    "url": "https://openbanking-brasil.github.io/openapi/swagger-apis/credit-portability/1.0.0.yml"
  },
  {
    "jornada": "Conta de Pagamento",
    "nomeArquivo": "payment-account.yml",
    "url": "https://..."
  }
]`
              }}</pre>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-card-section>

      <q-card-section v-if="isLoadingMultiple">
        <q-linear-progress
          :value="loadingProgress"
          color="primary"
          class="q-mb-md"
        />
        <div class="text-center text-caption">
          Carregando jornada {{ currentLoadingIndex }} de {{ totalJornadas }}
        </div>
      </q-card-section>

      <div v-if="metrics.length > 0">
        <div
          v-for="(jornada, idx) in groupedJornadas"
          :key="jornada.nome"
          class="q-mb-lg"
        >
          <q-card
            :style="{ borderLeft: `4px solid ${jornada.cor}` }"
            flat
            bordered
          >
            <q-card-section
              class="row items-center"
              :style="{ backgroundColor: jornada.cor + '15' }"
            >
              <div class="col">
                <div class="text-h6" :style="{ color: jornada.cor }">
                  {{ jornada.nome }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ jornada.nomeArquivo || "Arquivo único" }} -
                  {{ jornada.endpoints.length }} endpoints
                </div>
              </div>
            </q-card-section>

            <q-table
              :rows="jornada.endpoints"
              :columns="columns"
              row-key="id"
              flat
              :pagination="{ rowsPerPage: 0 }"
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
            </q-table>
          </q-card>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed } from "vue";
import jsYaml from "js-yaml";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { exportFile, useQuasar } from "quasar";
import { Buffer } from "buffer";

window.Buffer = window.Buffer || Buffer;
const $q = useQuasar();

const ymlFile = ref(null);
const ymlUrl = ref("");
const configFile = ref(null);
const isLoadingUrl = ref(false);
const isLoadingMultiple = ref(false);
const currentLoadingIndex = ref(0);
const totalJornadas = ref(0);
const metrics = ref([]);

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
  {
    name: "isIdempotent",
    label: "Idempotency",
    field: "isIdempotent",
    align: "center",
  },
  { name: "isAsync", label: "Async", field: "isAsync", align: "center" },
  {
    name: "reqFields",
    label: "Requisição - Número de Campos",
    field: "reqFields",
    align: "center",
  },
  {
    name: "reqDepth",
    label: "Requisição - Número de Níveis da Estrutura de Dados",
    field: "reqDepth",
    align: "center",
  },
  {
    name: "reqRest",
    label: "Requisição - Número de campos condicionais",
    field: "reqRest",
    align: "center",
  },
  {
    name: "resFields",
    label: "Resposta - Número de Campos",
    field: "resFields",
    align: "center",
  },
  {
    name: "resDepth",
    label: "Resposta - Número de Níveis da Estrutura de Dados",
    field: "resDepth",
    align: "center",
  },
  {
    name: "resRest",
    label: "Resposta - Número de campos condicionais",
    field: "resRest",
    align: "center",
  },
];

const groupedJornadas = computed(() => {
  const grupos = {};

  metrics.value.forEach((metric) => {
    const jornadaNome = metric.jornada || "Arquivo Único";
    if (!grupos[jornadaNome]) {
      grupos[jornadaNome] = {
        nome: jornadaNome,
        nomeArquivo: metric.nomeArquivo,
        cor: metric.cor,
        endpoints: [],
      };
    }
    grupos[jornadaNome].endpoints.push(metric);
  });

  return Object.values(grupos);
});

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
    { name: "nomeArquivo", label: "Arquivo" },
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

const loadFromUrl = async () => {
  if (!ymlUrl.value) return;

  isLoadingUrl.value = true;
  try {
    let response;
    try {
      response = await fetch(ymlUrl.value);
    } catch (corsError) {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ymlUrl.value)}`;
      response = await fetch(proxyUrl);
    }

    if (!response.ok) throw new Error("Erro ao baixar arquivo");

    const blob = await response.blob();
    const file = new File([blob], "openapi.yml", {
      type: "application/x-yaml",
    });

    await processFile(file);

    $q.notify({
      message: "Arquivo carregado com sucesso!",
      color: "positive",
      icon: "check_circle",
    });
  } catch (err) {
    console.error("URL Load Error:", err);
    $q.notify({
      message: "Erro ao carregar URL: " + err.message,
      color: "negative",
      icon: "error",
    });
  } finally {
    isLoadingUrl.value = false;
  }
};

const processFile = async (
  file,
  jornadaNome = null,
  nomeArquivo = null,
  cor = null,
) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const rawYaml = e.target.result;
      await analyzeYaml(rawYaml, jornadaNome, nomeArquivo, cor);
    } catch (err) {
      console.error("Analysis Error:", err);
      $q.notify({
        message: "Erro ao processar arquivo: " + err.message,
        color: "negative",
        icon: "error",
      });
    }
  };
  reader.readAsText(file);
};

const analyzeYaml = async (
  rawYaml,
  jornadaNome = null,
  nomeArquivo = null,
  cor = null,
) => {
  const api = await $RefParser.dereference(jsYaml.load(rawYaml));
  const results = [];

  for (const [path, methods] of Object.entries(api.paths)) {
    for (const [method, op] of Object.entries(methods)) {
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
      const successCode = Object.keys(op.responses).find((c) =>
        c.startsWith("2"),
      );
      const resSchema =
        op.responses[successCode]?.content?.["application/jwt"]?.schema ||
        op.responses[successCode]?.content?.["application/json"]?.schema;
      const resMetrics = walkSchema(resSchema);

      results.push({
        id: `${jornadaNome || "default"}-${path}-${method}`,
        jornada: jornadaNome,
        nomeArquivo: nomeArquivo,
        cor: cor || coresPaleta[0],
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

  if (jornadaNome) {
    metrics.value = [...metrics.value, ...results];
  } else {
    metrics.value = results;
  }
};

const processConfigFile = async (file) => {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const config = JSON.parse(e.target.result);

      if (!Array.isArray(config)) {
        throw new Error(
          "O arquivo config.json deve conter um array de jornadas",
        );
      }

      metrics.value = [];

      isLoadingMultiple.value = true;
      totalJornadas.value = config.length;
      currentLoadingIndex.value = 0;

      for (let i = 0; i < config.length; i++) {
        const item = config[i];
        currentLoadingIndex.value = i + 1;

        if (!item.url || !item.jornada) {
          console.warn("Item inválido no config.json:", item);
          continue;
        }

        try {
          let response;
          try {
            response = await fetch(item.url);
          } catch (corsError) {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(item.url)}`;
            response = await fetch(proxyUrl);
          }

          if (!response.ok) throw new Error(`Erro ao baixar ${item.jornada}`);

          const rawYaml = await response.text();
          const cor = coresPaleta[i % coresPaleta.length];

          // Analisa o YAML
          await analyzeYaml(rawYaml, item.jornada, item.nomeArquivo, cor);
        } catch (err) {
          console.error(`Erro ao processar ${item.jornada}:`, err);
          $q.notify({
            message: `Erro ao carregar ${item.jornada}: ${err.message}`,
            color: "warning",
            icon: "warning",
          });
        }
      }

      isLoadingMultiple.value = false;

      $q.notify({
        message: `${config.length} jornadas carregadas com sucesso!`,
        color: "positive",
        icon: "check_circle",
      });
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
</script>
