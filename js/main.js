document.addEventListener("DOMContentLoaded", () => {

/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};

/* =========================================================
   ELEMENTOS DO DOM
========================================================= */
const excelFile = document.getElementById("excelFile");

const filtroProvincia = document.getElementById("filtroProvincia");
const filtroDistrito  = document.getElementById("filtroDistrito");
const filtroServico   = document.getElementById("filtroServico");
const filtroAno       = document.getElementById("filtroAno");

const cardTotal = document.getElementById("cardTotal");
const cardPrimeira = document.getElementById("cardPrimeira");
const cardSeguimento = document.getElementById("cardSeguimento");
const cardTaxaSeguimento = document.getElementById("cardTaxaSeguimento");
const cardRetencao = document.getElementById("cardRetencao");

const pictogramaSexo = document.getElementById("pictogramaSexo");
const btnDownload = document.getElementById("btnDownload");

/* =========================================================
   UPLOAD DO EXCEL
========================================================= */
excelFile.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    dadosOriginais = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!dadosOriginais.length) {
      alert("Ficheiro sem dados válidos.");
      return;
    }

    inicializarFiltros();
    aplicarFiltros();
  };
  reader.readAsArrayBuffer(file);
});

/* =========================================================
   FILTROS
========================================================= */
[filtroProvincia, filtroDistrito, filtroServico, filtroAno]
  .forEach(el => el.addEventListener("change", aplicarFiltros));

function inicializarFiltros() {
  preencherSelect(filtroProvincia, "Provincia");
  preencherSelect(filtroServico, "Servico");
  preencherSelectAno();
  filtroDistrito.innerHTML = `<option value="">Todos</option>`;
}

/* =========================================================
   APLICAR FILTROS (PROVÍNCIA → DISTRITO CORRIGIDO)
========================================================= */
function aplicarFiltros() {
  let base = dadosOriginais;

  if (filtroProvincia.value) {
    base = base.filter(d => d.Provincia === filtroProvincia.value);
  }

  preencherSelect(filtroDistrito, "Distrito", base);

  const filtrados = base.filter(d => {
    const dt = normalizarData(d.Data_Consulta);
    const ano = dt ? dt.getFullYear() : null;

    return (
      (!filtroDistrito.value || d.Distrito === filtroDistrito.value) &&
      (!filtroServico.value  || d.Servico === filtroServico.value) &&
      (!filtroAno.value      || ano == filtroAno.value)
    );
  });

  atualizarIndicadores(filtrados);
}

/* =========================================================
   INDICADORES
========================================================= */
function atualizarIndicadores(d) {
  const total = d.length;

  const primeira = d.filter(x =>
    String(x.Tipo_Consulta).toLowerCase().includes("primeira")
  ).length;

  const seguimento = d.filter(x =>
    String(x.Tipo_Consulta).toLowerCase().includes("seguimento")
  ).length;

  cardTotal.textContent = total;
  cardPrimeira.textContent = primeira;
  cardSeguimento.textContent = seguimento;

  cardTaxaSeguimento.textContent =
    total ? ((seguimento / total) * 100).toFixed(1) + "%" : "0%";

  cardRetencao.textContent =
    total ? ((d.filter(x => x.Proxima_Consulta).length / total) * 100).toFixed(1) + "%" : "0%";

  renderizarVisualizacoes({
    mensal: ordenarMeses(agruparMes(d)),
    sexo: contar(d, "Sexo"),
    diagnostico: contar(d, "Diagnostico"),
    medico: contar(d, "Nome_Medico"),
    distrito: contar(d, "Distrito"),
    servico: contar(d, "Servico")
  });
}

/* =========================================================
   VISUALIZAÇÕES
========================================================= */
function renderizarVisualizacoes(d) {
  destruirGraficos();

  // 🔵 GRÁFICO DE ÁREA AZUL
  criarGrafico("grafMensal", "line", d.mensal, {
    area: true
  });

  criarGrafico("grafDiagnostico", "bar", d.diagnostico, {
    cor:"#8E24AA",
    horizontal:true
  });

  criarGrafico("grafMedico", "bar", d.medico, {
    cor:"#38BDF8",
    horizontal:true
  });

  criarGrafico("grafServico", "bar", d.servico, {
    cor:"#2DD4BF",
    horizontal:true
  });

  criarGrafico("grafDistrito", "bar", d.distrito, {
    cor:"#38BDF8"
  });

  renderizarPictogramaSexo(d.sexo);
}

/* =========================================================
   PICTOGRAMA POR SEXO (MÁX. 50 ÍCONES)
========================================================= */
function renderizarPictogramaSexo(dados) {
  pictogramaSexo.innerHTML = "";

  const feminino = dados["Feminino"] || 0;
  const masculino = dados["Masculino"] || 0;

  const max = Math.max(feminino, masculino, 1);

  criarBlocoSexo("Feminino", Math.round((feminino / max) * 50), "#8E24AA");
  criarValorCentralSexo(feminino, masculino);
  criarBlocoSexo("Masculino", Math.round((masculino / max) * 50), "#2ED8C3");
}

function criarBlocoSexo(label, total, cor) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.minWidth = "160px";

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(5, 1fr)";
  grid.style.gap = "6px";

  for (let i = 0; i < total; i++) {
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-person";
    icon.style.color = cor;
    icon.style.fontSize = "16px";
    grid.appendChild(icon);
  }

  const nome = document.createElement("div");
  nome.textContent = label;
  nome.style.marginTop = "10px";
  nome.style.fontSize = "13px";
  nome.style.color = "#CBD5E1";

  wrap.appendChild(grid);
  wrap.appendChild(nome);
  pictogramaSexo.appendChild(wrap);
}

function criarValorCentralSexo(f, m) {
  const mid = document.createElement("div");
  mid.style.display = "flex";
  mid.style.alignItems = "center";
  mid.style.gap = "8px";
  mid.style.fontSize = "28px";
  mid.style.fontWeight = "800";

  mid.innerHTML = `
    <span style="color:#8E24AA">${f}</span>
    <span style="color:#CBD5E1">–</span>
    <span style="color:#2ED8C3">${m}</span>
  `;

  pictogramaSexo.appendChild(mid);
}

/* =========================================================
   GRÁFICOS (BASE)
========================================================= */
function criarGrafico(id, tipo, dados, cfg = {}) {
  const ctx = document.getElementById(id);
  if (!ctx || !Object.keys(dados).length) return;

  charts[id] = new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        data: Object.values(dados),
        backgroundColor: tipo === "line"
          ? "rgba(46,216,195,0.35)"
          : cfg.cor,
        borderColor: tipo === "line"
          ? "#1FB6AA"
          : cfg.cor,
        fill: cfg.area || false,
        tension: 0.4,
        pointRadius: tipo === "line" ? 3 : 0,
        pointBackgroundColor: "#1FB6AA",
        borderRadius: 8
      }]
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: cfg.horizontal ? "y" : "x",
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false }, beginAtZero: true }
      }
    }
  });
}

function destruirGraficos() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

/* =========================================================
   DOWNLOAD PDF
========================================================= */
btnDownload.addEventListener("click", () => {
  html2pdf().set({
    margin: 0.5,
    filename: "Dashboard_Monitoria_Saude.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: "#0F172A" },
    jsPDF: { unit: "in", format: "a4", orientation: "landscape" }
  }).from(document.querySelector(".container")).save();
});

/* =========================================================
   AUXILIARES
========================================================= */
function contar(d, c) {
  return d.reduce((a, r) => {
    if (!r[c]) return a;
    a[r[c]] = (a[r[c]] || 0) + 1;
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

function ordenarMeses(o) {
  return Object.fromEntries(Object.entries(o).sort());
}

function normalizarData(v) {
  if (!v) return null;
  if (typeof v === "number")
    return new Date((v - 25569) * 86400 * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function preencherSelect(select, campo, base = dadosOriginais) {
  const vals = [...new Set(base.map(x => x[campo]).filter(Boolean))];
  select.innerHTML = `<option value="">Todos</option>` +
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

});
