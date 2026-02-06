/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};

/* =========================================================
   PALETA DE CORES (LEVE E PROFISSIONAL)
========================================================= */
const CORES = {
  azul: "#2563eb",
  azulClaro: "#60a5fa",
  laranja: "#f97316",
  dourado: "#f59e0b",
  verde: "#10b981",
  cinza: "#e5e7eb"
};

/* =========================================================
   UPLOAD DO EXCEL
========================================================= */
document.getElementById("excelFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    dadosOriginais = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    inicializarFiltros(dadosOriginais);
    aplicarFiltros();
  };
  reader.readAsArrayBuffer(file);
});

/* =========================================================
   FILTROS
========================================================= */
function inicializarFiltros(dados) {
  preencherSelect("filtroProvincia", dados, "Provincia");
  preencherSelect("filtroServico", dados, "Servico");
  preencherSelectAno("filtroAno", dados);

  document.getElementById("filtroDistrito").innerHTML =
    `<option value="">Todos</option>`;
}

["filtroProvincia", "filtroDistrito", "filtroServico", "filtroAno"]
  .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltros));

document.getElementById("filtroProvincia").addEventListener("change", () => {
  const provincia = filtroProvincia.value;

  const filtrados = provincia
    ? dadosOriginais.filter(d => d.Provincia === provincia)
    : dadosOriginais;

  preencherSelect("filtroDistrito", filtrados, "Distrito");
  filtroDistrito.value = "";
  aplicarFiltros();
});

/* =========================================================
   APLICAR FILTROS
========================================================= */
function aplicarFiltros() {
  const provincia = filtroProvincia.value;
  const distrito = filtroDistrito.value;
  const servico = filtroServico.value;
  const ano = filtroAno.value;

  const filtrados = dadosOriginais.filter(d => {
    const dt = normalizarData(d.Data_Consulta);
    const anoConsulta = dt ? dt.getFullYear() : null;

    return (
      (!provincia || d.Provincia === provincia) &&
      (!distrito || d.Distrito === distrito) &&
      (!servico || d.Servico === servico) &&
      (!ano || anoConsulta == ano)
    );
  });

  motorIndicadoresSaude(filtrados);
}

/* =========================================================
   MOTOR DE INDICADORES DE SAÚDE
========================================================= */
function motorIndicadoresSaude(dados) {
  const total = dados.length;

  const primeira = dados.filter(d =>
    (d.Tipo_Consulta || "").toLowerCase().includes("primeira")
  ).length;

  const seguimento = dados.filter(d =>
    (d.Tipo_Consulta || "").toLowerCase().includes("seguimento")
  ).length;

  const taxaSeguimento = total ? ((seguimento / total) * 100).toFixed(1) : 0;
  const retencao = total
    ? ((dados.filter(d => d.Proxima_Consulta).length / total) * 100).toFixed(1)
    : 0;

  renderizarCards({ total, primeira, seguimento, taxaSeguimento, retencao });

  renderizarGraficos({
    porMes: agruparPorMes(dados),
    porSexo: contar(dados, "Sexo"),
    porDiagnostico: contar(dados, "Diagnostico"),
    porMedico: contar(dados, "Nome_Medico"),
    porDistrito: contar(dados, "Distrito"),
    porServico: contar(dados, "Servico")
  });
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */
function normalizarData(v) {
  if (!v) return null;
  if (typeof v === "number") return new Date((v - 25569) * 86400 * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function contar(dados, campo) {
  return dados.reduce((a, d) => {
    const k = d[campo] || "Não informado";
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
}

function agruparPorMes(dados) {
  const r = {};
  dados.forEach(d => {
    const dt = normalizarData(d.Data_Consulta);
    if (!dt) return;
    const k = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    r[k] = (r[k] || 0) + 1;
  });
  return r;
}

function preencherSelect(id, dados, campo) {
  const s = document.getElementById(id);
  const vals = [...new Set(dados.map(d => d[campo]).filter(Boolean))];
  s.innerHTML = `<option value="">Todos</option>` +
    vals.map(v => `<option value="${v}">${v}</option>`).join("");
}

function preencherSelectAno(id, dados) {
  const s = document.getElementById(id);
  const anos = [...new Set(dados.map(d => {
    const dt = normalizarData(d.Data_Consulta);
    return dt ? dt.getFullYear() : null;
  }).filter(Boolean))];

  s.innerHTML = `<option value="">Todos</option>` +
    anos.sort().map(a => `<option value="${a}">${a}</option>`).join("");
}

/* =========================================================
   CARDS
========================================================= */
function renderizarCards(i) {
  cardTotal.innerText = i.total;
  cardPrimeira.innerText = i.primeira;
  cardSeguimento.innerText = i.seguimento;
  cardTaxaSeguimento.innerText = i.taxaSeguimento + "%";
  cardRetencao.innerText = i.retencao + "%";
}

/* =========================================================
   GRÁFICOS (COMPLETO)
========================================================= */
function resetGraficos() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

function renderizarGraficos(d) {
  resetGraficos();

  graf("grafMensal", "line", d.porMes, "Atendimentos Mensais", CORES.azul, true);
  graf("grafSexo", "doughnut", d.porSexo, "Distribuição por Sexo", [CORES.azul, CORES.laranja]);
  graf("grafDiagnostico", "bar", d.porDiagnostico, "Principais Diagnósticos", CORES.laranja);
  graf("grafMedico", "bar", d.porMedico, "Produtividade por Médico", CORES.azul);
  graf("grafDistrito", "bar", d.porDistrito, "Produtividade por Distrito", CORES.dourado);
  graf("grafServico", "bar", d.porServico, "Produtividade por Serviço", CORES.verde);
}

function graf(id, tipo, dados, titulo, cor, pontos=false) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label: titulo,
        data: Object.values(dados),
        backgroundColor: cor,
        borderColor: cor,
        borderWidth: 2,
        pointRadius: pontos ? 4 : 0,
        pointStyle: "circle",
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { usePointStyle: true } }
      },
      scales: tipo !== "doughnut" ? { y: { beginAtZero: true } } : {}
    }
  });
}
