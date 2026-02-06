/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};
let mapa;

/* =========================================================
   PALETA DE CORES INSTITUCIONAL
========================================================= */
const CORES = {
  azul: "#1f4fd8",
  dourado: "#c9a24d",
  cinza: "#e5e7eb",
  preto: "#111827"
};

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
  .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltros));

document.getElementById("filtroProvincia").addEventListener("change", () => {
  const provincia = document.getElementById("filtroProvincia").value;
  const dadosFiltrados = provincia
    ? dadosOriginais.filter(d => d.Provincia === provincia)
    : dadosOriginais;

  preencherSelect("filtroDistrito", dadosFiltrados, "Distrito");
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

  const comProxima = dados.filter(d => d.Proxima_Consulta).length;
  const taxaRetencao = total ? ((comProxima / total) * 100).toFixed(1) : 0;

  const porProvincia = contar(dados, "Provincia");
  const porDistrito = contar(dados, "Distrito");
  const porServico = contar(dados, "Servico");
  const porSexo = contar(dados, "Sexo");
  const porDiagnostico = contar(dados, "Diagnostico");
  const porMes = agruparPorMes(dados);

  renderizarCards({ total, primeira, seguimento, taxaSeguimento, taxaRetencao });
  renderizarGraficos({ porProvincia, porDistrito, porServico, porSexo, porDiagnostico, porMes });
  renderizarMapa(porProvincia);
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */
function normalizarData(valor) {
  if (!valor) return null;

  if (typeof valor === "number") {
    const utc_days = Math.floor(valor - 25569);
    return new Date(utc_days * 86400 * 1000);
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

  criarGrafico("grafProvincia", "bar", d.porProvincia, "Atendimentos por Província");
  criarGrafico("grafDistrito", "bar", d.porDistrito, "Atendimentos por Distrito");
  criarGrafico("grafServico", "doughnut", d.porServico, "Atendimentos por Serviço");
  criarGrafico("grafSexo", "pie", d.porSexo, "Distribuição por Sexo");
  criarGrafico("grafDiagnostico", "bar", d.porDiagnostico, "Diagnósticos");
  criarGrafico("grafMensal", "line", d.porMes, "Atendimentos Mensais");
}

function criarGrafico(id, tipo, dados, label) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label,
        data: Object.values(dados),
        backgroundColor: CORES.azul,
        borderColor: CORES.azul,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { font: { size: 11 } }
        }
      },
      scales: tipo !== "doughnut" && tipo !== "pie" ? {
        y: {
          beginAtZero: true,
          grid: { color: "#eee" }
        },
        x: { grid: { display: false } }
      } : {}
    }
  });
}

/* =========================================================
   MAPA DE MOÇAMBIQUE (Leaflet)
========================================================= */
function renderizarMapa(dadosProvincia) {
  if (mapa) mapa.remove();

  mapa = L.map("mapa").setView([-18.7, 35.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapa);

  fetch("mocambique_provincias.geojson")
    .then(r => r.json())
    .then(geo => {
      L.geoJSON(geo, {
        style: f => ({
          fillColor: cor(dadosProvincia[f.properties.name] || 0),
          weight: 1,
          color: "#333",
          fillOpacity: 0.7
        }),
        onEachFeature: (f, layer) => {
          const v = dadosProvincia[f.properties.name] || 0;
          layer.bindPopup(
            `<strong>${f.properties.name}</strong><br>${v} atendimentos`
          );
        }
      }).addTo(mapa);
    });
}

function cor(v) {
  if (v > 200) return "#1f4fd8";
  if (v > 100) return "#4f83ff";
  if (v > 50) return "#9db7ff";
  if (v > 0) return "#dce5ff";
  return "#f0f0f0";
}
