/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};
let mapa;

/* =========================================================
   PALETA VISUAL (SAÚDE MODERNA)
========================================================= */
const CORES = {
  verde: "#2A9D8F",
  azul: "#2563EB",
  dourado: "#D4AF37",
  cinza: "#CBD5E1",
  escuro: "#0F172A"
};

/* =========================================================
   UPLOAD EXCEL
========================================================= */
document.getElementById("excelFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const data = new Uint8Array(ev.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];

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
  document.getElementById("filtroDistrito").innerHTML = `<option value="">Todos</option>`;
}

["filtroProvincia", "filtroDistrito", "filtroServico", "filtroAno"]
  .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltros));

document.getElementById("filtroProvincia").addEventListener("change", () => {
  const p = document.getElementById("filtroProvincia").value;
  const base = p ? dadosOriginais.filter(d => d.Provincia === p) : dadosOriginais;
  preencherSelect("filtroDistrito", base, "Distrito");
});

/* =========================================================
   APLICAR FILTROS
========================================================= */
function aplicarFiltros() {
  const p = filtroProvincia.value;
  const d = filtroDistrito.value;
  const s = filtroServico.value;
  const a = filtroAno.value;

  const filtrados = dadosOriginais.filter(r => {
    const dt = normalizarData(r.Data_Consulta);
    const ano = dt ? dt.getFullYear() : null;

    return (
      (!p || r.Provincia === p) &&
      (!d || r.Distrito === d) &&
      (!s || r.Servico === s) &&
      (!a || ano == a)
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

  const porMes = agruparPorMes(dados);
  const porSexo = contar(dados, "Sexo");
  const porDiagnostico = topN(contar(dados, "Diagnostico"), 6);
  const porMedico = topN(contar(dados, "Nome_Medico"), 8);

  renderizarCards({ total, primeira, seguimento, taxaSeguimento, taxaRetencao });
  renderizarGraficos({ porMes, porSexo, porDiagnostico, porMedico });
  renderizarMapa(contar(dados, "Provincia"));
}

/* =========================================================
   UTILITÁRIOS
========================================================= */
function normalizarData(v) {
  if (!v) return null;
  if (typeof v === "number") return new Date((v - 25569) * 86400 * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function contar(dados, campo) {
  return dados.reduce((acc, d) => {
    const k = d[campo] || "Não informado";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function topN(obj, n) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
  );
}

function agruparPorMes(dados) {
  const r = {};
  dados.forEach(d => {
    const dt = normalizarData(d.Data_Consulta);
    if (!dt) return;
    const k = `${dt.getMonth()+1}/${dt.getFullYear()}`;
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
  const anos = [...new Set(
    dados.map(d => {
      const dt = normalizarData(d.Data_Consulta);
      return dt ? dt.getFullYear() : null;
    }).filter(Boolean)
  )];
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
  cardRetencao.innerText = i.taxaRetencao + "%";
}

/* =========================================================
   GRÁFICOS
========================================================= */
function resetGraficos() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

function criarGrafico(id, tipo, dados, label, cores) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label,
        data: Object.values(dados),
        backgroundColor: cores,
        borderWidth: 2,
        tension: 0.4,
        fill: tipo === "line"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderizarGraficos(d) {
  resetGraficos();

  criarGrafico("grafMensal", "line", d.porMes, "Atendimentos Mensais",
    "rgba(42,157,143,0.4)");

  criarGrafico("grafSexo", "doughnut", d.porSexo, "Distribuição por Sexo",
    [CORES.verde, CORES.azul]);

  criarGrafico("grafDiagnostico", "bar", d.porDiagnostico,
    "Principais Diagnósticos", CORES.verde);

  criarGrafico("grafMedico", "bar", d.porMedico,
    "Produtividade por Médico", CORES.azul);
}

/* =========================================================
   MAPA
========================================================= */
function renderizarMapa(dadosProvincia) {
  if (mapa) mapa.remove();
  mapa = L.map("mapa").setView([-18.7, 35.5], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
    .addTo(mapa);

  fetch("mocambique_provincias.geojson")
    .then(r => r.json())
    .then(g => {
      L.geoJSON(g, {
        style: f => ({
          fillColor: CORES.verde,
          weight: 1,
          fillOpacity: 0.6
        })
      }).addTo(mapa);
    });
}
