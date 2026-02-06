/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};

/* =========================================================
   CORES (APENAS PARA GRÁFICOS)
========================================================= */
const CORES_GRAFICOS = [
  "#ff4f70", // rosa principal
  "#ff8a00", // laranja
  "#3cc3ff", // azul
  "#a855f7", // roxo
  "#facc15", // amarelo
  "#22c55e"  // verde
];

/* =========================================================
   UPLOAD DO EXCEL
========================================================= */
document.getElementById("excelFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    dadosOriginais = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    inicializarFiltros();
    aplicarFiltros();
  };
  reader.readAsArrayBuffer(file);
});

/* =========================================================
   FILTROS
========================================================= */
function inicializarFiltros() {
  preencherSelect("filtroProvincia", "Provincia");
  preencherSelect("filtroServico", "Servico");
  preencherSelectAno();

  document.getElementById("filtroDistrito").innerHTML =
    `<option value="">Todos</option>`;
}

["filtroProvincia","filtroDistrito","filtroServico","filtroAno"]
  .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltros));

document.getElementById("filtroProvincia").addEventListener("change", () => {
  const provincia = filtroProvincia.value;

  const base = provincia
    ? dadosOriginais.filter(d => d.Provincia === provincia)
    : dadosOriginais;

  preencherSelect("filtroDistrito", "Distrito", base);
  filtroDistrito.value = "";
  aplicarFiltros();
});

/* =========================================================
   APLICAR FILTROS
========================================================= */
function aplicarFiltros() {
  const provincia = filtroProvincia.value;
  const distrito  = filtroDistrito.value;
  const servico   = filtroServico.value;
  const ano       = filtroAno.value;

  const filtrados = dadosOriginais.filter(d => {
    const dt = normalizarData(d.Data_Consulta);
    const anoC = dt ? dt.getFullYear() : null;

    return (
      (!provincia || d.Provincia === provincia) &&
      (!distrito  || d.Distrito === distrito) &&
      (!servico   || d.Servico === servico) &&
      (!ano       || anoC == ano)
    );
  });

  calcularIndicadores(filtrados);
}

/* =========================================================
   INDICADORES
========================================================= */
function calcularIndicadores(d) {
  const total = d.length;
  const primeira = d.filter(x => String(x.Tipo_Consulta).toLowerCase().includes("primeira")).length;
  const seguimento = d.filter(x => String(x.Tipo_Consulta).toLowerCase().includes("seguimento")).length;
  const taxaSeg = total ? ((seguimento / total) * 100).toFixed(1) : 0;
  const retencao = total ? ((d.filter(x => x.Proxima_Consulta).length / total) * 100).toFixed(1) : 0;

  cardTotal.textContent = total;
  cardPrimeira.textContent = primeira;
  cardSeguimento.textContent = seguimento;
  cardTaxaSeguimento.textContent = taxaSeg + "%";
  cardRetencao.textContent = retencao + "%";

  renderizarGraficos({
    mensal: agruparMes(d),
    sexo: contar(d, "Sexo"),
    diagnostico: contar(d, "Diagnostico"),
    medico: contar(d, "Nome_Medico"),
    distrito: contar(d, "Distrito"),
    servico: contar(d, "Servico")
  });
}

/* =========================================================
   GRÁFICOS
========================================================= */
function renderizarGraficos(d) {
  destruirGraficos();

  criarGrafico("grafMensal", "line", d.mensal, {
    cor: "#ff4f70",
    preenchido: true
  });

  criarGrafico("grafSexo", "doughnut", d.sexo, {
    cores: ["#ff4f70", "#ff8a00"]
  });

  criarGrafico("grafDiagnostico", "bar", d.diagnostico, {
    cores: CORES_GRAFICOS
  });

  criarGrafico("grafMedico", "bar", d.medico, {
    corUnica: "#ff4f70"
  });

  criarGrafico("grafDistrito", "bar", d.distrito, {
    corUnica: "#ff4f70"
  });

  criarGrafico("grafServico", "bar", d.servico, {
    corUnica: "#ff4f70"
  });
}

function criarGrafico(id, tipo, dados, cfg = {}) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        data: Object.values(dados),
        backgroundColor: cfg.corUnica
          ? cfg.corUnica
          : (cfg.cores || CORES_GRAFICOS),
        borderColor: cfg.cor || cfg.corUnica || "#ff4f70",
        fill: cfg.preenchido || false,
        tension: 0.4,
        pointRadius: tipo === "line" ? 4 : 0,
        pointStyle: "circle"
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true
          }
        }
      },
      scales: tipo === "line" || tipo === "bar" ? {
        x: { ticks: { maxRotation: 0 } },
        y: { beginAtZero: true }
      } : {}
    }
  });
}

function destruirGraficos() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

/* =========================================================
   AUXILIARES
========================================================= */
function contar(d, campo) {
  return d.reduce((a, x) => {
    const k = x[campo] || "Não informado";
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
}

function agruparMes(d) {
  const r = {};
  d.forEach(x => {
    const dt = normalizarData(x.Data_Consulta);
    if (!dt) return;
    const k = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    r[k] = (r[k] || 0) + 1;
  });
  return r;
}

function normalizarData(v) {
  if (!v) return null;
  if (typeof v === "number") {
    return new Date((v - 25569) * 86400 * 1000);
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function preencherSelect(id, campo, base = dadosOriginais) {
  const s = document.getElementById(id);
  const vals = [...new Set(base.map(x => x[campo]).filter(Boolean))];
  s.innerHTML = `<option value="">Todos</option>` +
    vals.map(v => `<option value="${v}">${v}</option>`).join("");
}

function preencherSelectAno() {
  const anos = [...new Set(dadosOriginais.map(x => {
    const d = normalizarData(x.Data_Consulta);
    return d ? d.getFullYear() : null;
  }).filter(Boolean))];
  filtroAno.innerHTML = `<option value="">Todos</option>` +
    anos.sort().map(a => `<option value="${a}">${a}</option>`).join("");
}
