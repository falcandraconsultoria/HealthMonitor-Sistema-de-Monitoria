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

const btnDownload = document.getElementById("btnDownload");

/* =========================================================
   CORES (IDENTIDADE FINAL)
========================================================= */
const CORES = {
  feminino: "#8E24AA",
  masculino: "#2ED8C3",
  areaMensal: "rgba(46,216,195,0.35)",
  linhaMensal: "#2ED8C3",
  diagnostico: "#7C3AED",
  medico: "#38BDF8",
  distrito: "#2DD4BF",
  servico: "#10B981"
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

/* 🔧 CORRECÇÃO DO FILTRO DISTRITO */
filtroProvincia.addEventListener("change", () => {
  const prov = filtroProvincia.value?.trim();

  const base = prov
    ? dadosOriginais.filter(d =>
        String(d.Provincia).trim() === prov
      )
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
      (!filtroProvincia.value || String(d.Provincia).trim() === filtroProvincia.value) &&
      (!filtroDistrito.value  || String(d.Distrito).trim() === filtroDistrito.value) &&
      (!filtroServico.value   || String(d.Servico).trim() === filtroServico.value) &&
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
   GRÁFICOS (SEM SEXO – PICTOGRAMA SERÁ HTML)
========================================================= */
function renderizarGraficos(d) {
  destruirGraficos();

  criarGrafico("grafMensal","line",d.mensal,{
    preenchido:true,
    corArea:CORES.areaMensal,
    corLinha:CORES.linhaMensal
  });

  criarGrafico("grafDiagnostico","bar",d.diagnostico,{
    corUnica:CORES.diagnostico,
    horizontal:true
  });

  criarGrafico("grafMedico","bar",d.medico,{
    corUnica:CORES.medico,
    horizontal:true
  });

  criarGrafico("grafServico","bar",d.servico,{
    corUnica:CORES.servico,
    horizontal:true
  });

  criarGrafico("grafDistrito","bar",d.distrito,{
    corUnica:CORES.distrito
  });
}

/* =========================================================
   FUNÇÃO BASE GRÁFICOS
========================================================= */
function criarGrafico(id,tipo,dados,cfg={}) {
  const ctx = document.getElementById(id);
  if (!ctx || !Object.keys(dados).length) return;

  charts[id] = new Chart(ctx,{
    type:tipo,
    data:{
      labels:Object.keys(dados),
      datasets:[{
        data:Object.values(dados),
        backgroundColor:
          tipo==="line" ? cfg.corArea : cfg.corUnica,
        borderColor:cfg.corLinha||cfg.corUnica,
        fill:cfg.preenchido||false,
        tension:.4,
        borderRadius:tipo==="bar"?8:0,
        pointRadius:tipo==="line"?3:0
      }]
    },
    options:{
      maintainAspectRatio:false,
      indexAxis:cfg.horizontal?"y":"x",
      plugins:{ legend:{ display:false }},
      scales:{
        x:{ grid:{ display:false }},
        y:{ beginAtZero:true, grid:{ display:false }}
      }
    }
  });
}

function destruirGraficos(){
  Object.values(charts).forEach(c=>c.destroy());
  charts={};
}

/* =========================================================
   DOWNLOAD PNG + MARCA
========================================================= */
btnDownload?.addEventListener("click", () => {
  const canvas = document.querySelector("canvas");
  if(!canvas) return alert("Nenhum gráfico disponível.");

  const ctx = canvas.getContext("2d");

  ctx.save();
  ctx.font="12px Arial";
  ctx.fillStyle="rgba(255,255,255,.6)";
  ctx.fillText("@falcandradataconsulting",10,canvas.height-10);
  ctx.restore();

  const link=document.createElement("a");
  link.download="grafico-healthmonitor.png";
  link.href=canvas.toDataURL("image/png");
  link.click();
});

/* =========================================================
   AUXILIARES
========================================================= */
function contar(d,c){
  return d.reduce((a,r)=>{
    const v=String(r[c]||"").trim();
    if(!v||v.toLowerCase()==="undefined") return a;
    a[v]=(a[v]||0)+1;
    return a;
  },{});
}

function agruparMes(d){
  const r={};
  d.forEach(x=>{
    const dt=normalizarData(x.Data_Consulta);
    if(!dt) return;
    const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    r[k]=(r[k]||0)+1;
  });
  return r;
}

function ordenarMeses(o){
  return Object.fromEntries(Object.entries(o).sort((a,b)=>a[0].localeCompare(b[0])));
}

function normalizarData(v){
  if(!v) return null;
  if(typeof v==="number")
    return new Date((v-25569)*86400*1000);
  const d=new Date(v);
  return isNaN(d)?null:d;
}

function preencherSelect(sel,campo,base=dadosOriginais){
  const vals=[...new Set(base.map(x=>String(x[campo]).trim()).filter(Boolean))];
  sel.innerHTML=`<option value="">Todos</option>`+
    vals.map(v=>`<option value="${v}">${v}</option>`).join("");
}

function preencherSelectAno(){
  const anos=[...new Set(dadosOriginais.map(x=>{
    const d=normalizarData(x.Data_Consulta);
    return d?d.getFullYear():null;
  }).filter(Boolean))];

  filtroAno.innerHTML=`<option value="">Todos</option>`+
    anos.sort().map(a=>`<option value="${a}">${a}</option>`).join("");
}

});
