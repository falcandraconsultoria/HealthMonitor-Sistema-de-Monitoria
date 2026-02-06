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

/* =========================================================
   CORES (IDENTIDADE DEFINIDA)
========================================================= */
const CORES = {
  medico: "#38BDF8",
  distrito: "#2DD4BF",
  servico: ["#10B981","#34D399","#6EE7B7","#A7F3D0"],
  diagnostico: "#7C3AED",
  sexo: ["#38BDF8","#818CF8"]
};

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
[filtroProvincia,filtroDistrito,filtroServico,filtroAno]
  .forEach(el => el.addEventListener("change", aplicarFiltros));

function inicializarFiltros() {
  preencherSelect(filtroProvincia,"Provincia");
  preencherSelect(filtroServico,"Servico");
  preencherSelectAno();
  filtroDistrito.innerHTML = `<option value="">Todos</option>`;
}

filtroProvincia.addEventListener("change", () => {
  const base = filtroProvincia.value
    ? dadosOriginais.filter(d => d.Provincia === filtroProvincia.value)
    : dadosOriginais;

  preencherSelect(filtroDistrito,"Distrito",base);
  filtroDistrito.value = "";
});

/* =========================================================
   APLICAR FILTROS
========================================================= */
function aplicarFiltros() {
  const filtrados = dadosOriginais.filter(d => {
    const dt = normalizarData(d.Data_Consulta);
    const ano = dt ? dt.getFullYear() : null;

    return (
      (!filtroProvincia.value || d.Provincia === filtroProvincia.value) &&
      (!filtroDistrito.value  || d.Distrito === filtroDistrito.value) &&
      (!filtroServico.value   || d.Servico === filtroServico.value) &&
      (!filtroAno.value       || ano == filtroAno.value)
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
    total ? ((seguimento/total)*100).toFixed(1)+"%" : "0%";

  cardRetencao.textContent =
    total ? ((d.filter(x=>x.Proxima_Consulta).length/total)*100).toFixed(1)+"%" : "0%";

  renderizarGraficos({
    mensal: ordenarMeses(agruparMes(d)),
    sexo: contar(d,"Sexo"),
    diagnostico: contar(d,"Diagnostico"),
    medico: contar(d,"Nome_Medico"),
    distrito: contar(d,"Distrito"),
    servico: contar(d,"Servico")
  });
}

/* =========================================================
   GRÁFICOS
========================================================= */
function renderizarGraficos(d) {
  destruirGraficos();

  criarGrafico("grafMensal","line",d.mensal,{
    cor: CORES.medico,
    preenchido: true
  });

  criarGrafico("grafSexo","doughnut",d.sexo,{
    cores: CORES.sexo
  });

  criarGrafico("grafDiagnostico","bar",d.diagnostico,{
    corUnica: CORES.diagnostico,
    horizontal: true
  });

  /* 🔹 AJUSTE PEDIDO: MÉDICO EM BARRAS HORIZONTAIS */
  criarGrafico("grafMedico","bar",d.medico,{
    corUnica: CORES.medico,
    horizontal: true
  });

  criarGrafico("grafServico","bar",d.servico,{ cores: CORES.servico });
  criarGrafico("grafDistrito","bar",d.distrito,{ corUnica: CORES.distrito });
}

/* =========================================================
   FUNÇÃO BASE DE GRÁFICO
========================================================= */
function criarGrafico(id,tipo,dados,cfg={}) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx,{
    type: tipo,
    data:{
      labels: Object.keys(dados),
      datasets:[{
        data: Object.values(dados),
        backgroundColor:
          tipo === "line"
            ? "rgba(56,189,248,0.25)"
            : (cfg.corUnica || cfg.cores || cfg.cor),
        borderColor: cfg.cor || cfg.corUnica || "#38BDF8",
        borderWidth: 0,
        fill: cfg.preenchido || false,
        tension: 0.4,
        borderRadius: tipo === "bar" ? 8 : 0,
        pointRadius: tipo === "line" ? 4 : 0
      }]
    },
    options:{
      maintainAspectRatio:false,
      indexAxis: cfg.horizontal ? "y" : "x",
      plugins:{
        legend:{
          position:"bottom",
          labels:{
            usePointStyle:true,
            pointStyle:"circle"
          }
        }
      },
      scales: tipo !== "doughnut" ? {
        x:{ grid:{ display:false }},
        y:{ beginAtZero:true, grid:{ display:false }}
      } : {}
    }
  });
}

/* =========================================================
   CONTROLO DE GRÁFICOS
========================================================= */
function destruirGraficos(){
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

/* =========================================================
   AUXILIARES
========================================================= */
/* 🔹 AJUSTE PEDIDO: REMOVER TODOS OS UNDEFINED */
function contar(d, c){
  return d.reduce((acc, row) => {
    if (!row[c]) return acc;

    const valor = String(row[c]).trim();
    if (!valor || valor.toLowerCase() === "undefined") return acc;

    acc[valor] = (acc[valor] || 0) + 1;
    return acc;
  }, {});
}

function agruparMes(d){
  const r = {};
  d.forEach(x=>{
    const dt = normalizarData(x.Data_Consulta);
    if(!dt) return;
    const k = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    r[k] = (r[k] || 0) + 1;
  });
  return r;
}

function ordenarMeses(o){
  return Object.fromEntries(
    Object.entries(o).sort((a,b)=>a[0].localeCompare(b[0]))
  );
}

function normalizarData(v){
  if(!v) return null;
  if(typeof v === "number")
    return new Date((v - 25569) * 86400 * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function preencherSelect(select,campo,base=dadosOriginais){
  const vals = [...new Set(base.map(x=>x[campo]).filter(Boolean))];
  select.innerHTML = `<option value="">Todos</option>` +
    vals.map(v=>`<option value="${v}">${v}</option>`).join("");
}

function preencherSelectAno(){
  const anos = [...new Set(dadosOriginais.map(x=>{
    const d = normalizarData(x.Data_Consulta);
    return d ? d.getFullYear() : null;
  }).filter(Boolean))];

  filtroAno.innerHTML = `<option value="">Todos</option>` +
    anos.sort().map(a=>`<option value="${a}">${a}</option>`).join("");
}

});
