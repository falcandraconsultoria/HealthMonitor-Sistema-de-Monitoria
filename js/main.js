/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};

/* =========================================================
   PALETA DE CORES (ALINHADA AO DESIGN FINAL)
========================================================= */
const CORES = [
  "#ff4d6d", // coral
  "#ff7a00", // laranja
  "#38bdf8", // azul claro
  "#a855f7", // roxo
  "#facc15", // dourado
  "#22c55e"  // verde
];

/* =========================================================
   UPLOAD DO EXCEL
========================================================= */
document.getElementById("excelFile").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
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
  .forEach(id =>
    document.getElementById(id).addEventListener("change", aplicarFiltros)
  );

document.getElementById("filtroProvincia").addEventListener("change", () => {
  const provincia = document.getElementById("filtroProvincia").value;

  const dadosFiltrados = provincia
    ? dadosOriginais.filter(d => d.Provincia === provincia)
    : dadosOriginais;

  preencherSelect("filtroDistrito", dadosFiltrados, "Distrito");
  document.getElementById("filtroDistrito").value = "";
  aplicarFiltros();
});

/* =========================================================
   APLICAR FILTROS
========================================================= */
function aplicarFiltros() {
  const provincia = document.getElementById("filtroProvincia").value;
  const distrito = document.getElementById("filtroDistrito").value;
  const servico = document.getElementById("filtroServico").value;
  const ano = document.getElementById("filtroAno").value;

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
   MOTOR DE INDICADORES
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

  const comProxima = dados.filter(d => d.Proxima_Consulta).length;
  const taxaRetencao = total ? ((comProxima / total) * 100).toFixed(1) : 0;

  const porDistrito = contar(dados, "Distrito");
  const porServico = contar(dados, "Servico");
  const porSexo = contar(dados, "Sexo");
  const porDiagnostico = contar(dados, "Diagnostico");
  const porMedico = contar(dados, "Nome_Medico");
  const porMes = agruparPorMes(dados);

  renderizarCards({
    total,
    primeira,
    seguimento,
    taxaSeguimento,
    taxaRetencao
  });

  renderizarGraficos({
    porDistrito,
    porServico,
    porSexo,
    porDiagnostico,
    porMedico,
    porMes
  });
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */
function normalizarData(valor) {
  if (!valor) return null;

  if (typeof valor === "number") {
    const utc = Math.floor(valor - 25569);
    return new Date(utc * 86400 * 1000);
  }

  const d = new Date(valor);
  return isNaN(d) ? null : d;
}

function contar(dados, campo) {
  return dados.reduce((acc, d) => {
    const k = d[campo] || "Não informado";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function agruparPorMes(dados) {
  const res = {};
  dados.forEach(d => {
    const dt = normalizarData(d.Data_Consulta);
    if (!dt) return;

    const chave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    res[chave] = (res[chave] || 0) + 1;
  });
  return res;
}

function preencherSelect(id, dados, campo) {
  const select = document.getElementById(id);
  const valores = [...new Set(dados.map(d => d[campo]).filter(Boolean))];

  select.innerHTML =
    `<option value="">Todos</option>` +
    valores.map(v => `<option value="${v}">${v}</option>`).join("");
}

function preencherSelectAno(id, dados) {
  const select = document.getElementById(id);
  const anos = [...new Set(
    dados.map(d => {
      const dt = normalizarData(d.Data_Consulta);
      return dt ? dt.getFullYear() : null;
    }).filter(Boolean)
  )];

  select.innerHTML =
    `<option value="">Todos</option>` +
    anos.sort().map(a => `<option value="${a}">${a}</option>`).join("");
}

/* =========================================================
   CARDS KPI
========================================================= */
function renderizarCards(i) {
  cardTotal.innerText = i.total;
  cardPrimeira.innerText = i.primeira;
  cardSeguimento.innerText = i.seguimento;
  cardTaxaSeguimento.innerText = i.taxaSeguimento + "%";
  cardRetencao.innerText = i.taxaRetencao + "%";
}

/* =========================================================
   GRÁFICOS (Chart.js)
========================================================= */
function resetGraficos() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

function renderizarGraficos(d) {
  resetGraficos();

  criarGrafico("grafMensal", "line", d.porMes, "Atendimentos Mensais");
  criarGrafico("grafSexo", "doughnut", d.porSexo, "Distribuição por Sexo");
  criarGrafico("grafDiagnostico", "bar", topN(d.porDiagnostico, 6), "Diagnósticos");
  criarGrafico("grafMedico", "bar", topN(d.porMedico, 6), "Produtividade por Médico");
  criarGrafico("grafDistrito", "bar", topN(d.porDistrito, 6), "Produtividade por Distrito");
  criarGrafico("grafServico", "bar", d.porServico, "Produtividade por Serviço");
}

function criarGrafico(id, tipo, dados, titulo) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label: titulo,
        data: Object.values(dados),
        backgroundColor: CORES,
        borderColor: CORES[0],
        borderWidth: tipo === "line" ? 2 : 0,
        fill: tipo === "line",
        tension: 0.35,
        pointRadius: tipo === "line" ? 4 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" }
        }
      },
      scales: tipo !== "doughnut" ? {
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af" },
          grid: { color: "#1f2937" }
        },
        x: {
          ticks: { color: "#9ca3af" },
          grid: { display: false }
        }
      } : {}
    }
  });
}

/* =========================================================
   UTIL: TOP N
========================================================= */
function topN(obj, n) {
  return Object.fromEntries(
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
  );
}
