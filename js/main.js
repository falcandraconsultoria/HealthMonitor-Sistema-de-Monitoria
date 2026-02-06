/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};

/* =========================================================
   PALETA MODERN HEALTH (APENAS GRÁFICOS)
========================================================= */
const CORES = {
  mensal: "#38BDF8",
  medico: "#38BDF8",
  distrito: "#2DD4BF",
  sexo: ["#38BDF8", "#818CF8"],
  diagnostico: ["#10B981","#0EA5E9","#6366F1","#64748B"],
  servicoGradient: ctx => {
    const g = ctx.createLinearGradient(0,0,0,300);
    g.addColorStop(0,"#0EA5E9");
    g.addColorStop(1,"#2563EB");
    return g;
  }
};

/* =========================================================
   UPLOAD EXCEL
========================================================= */
excelFile.addEventListener("change", e => {
  const f = e.target.files[0];
  if(!f) return;

  const r = new FileReader();
  r.onload = ev => {
    const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
    const sh = wb.Sheets[wb.SheetNames[0]];
    dadosOriginais = XLSX.utils.sheet_to_json(sh,{defval:""});
    inicializarFiltros();
    aplicarFiltros();
  };
  r.readAsArrayBuffer(f);
});

/* =========================================================
   FILTROS
========================================================= */
function inicializarFiltros(){
  preencherSelect("filtroProvincia","Provincia");
  preencherSelect("filtroServico","Servico");
  preencherSelectAno();
  filtroDistrito.innerHTML = `<option value="">Todos</option>`;
}

["filtroProvincia","filtroDistrito","filtroServico","filtroAno"]
  .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltros));

filtroProvincia.addEventListener("change",()=>{
  const base = filtroProvincia.value
    ? dadosOriginais.filter(d=>d.Provincia===filtroProvincia.value)
    : dadosOriginais;
  preencherSelect("filtroDistrito","Distrito",base);
  filtroDistrito.value="";
  aplicarFiltros();
});

/* =========================================================
   APLICAR FILTROS
========================================================= */
function aplicarFiltros(){
  const res = dadosOriginais.filter(d=>{
    const dt = normalizarData(d.Data_Consulta);
    const ano = dt?dt.getFullYear():null;
    return (
      (!filtroProvincia.value || d.Provincia===filtroProvincia.value) &&
      (!filtroDistrito.value || d.Distrito===filtroDistrito.value) &&
      (!filtroServico.value || d.Servico===filtroServico.value) &&
      (!filtroAno.value || ano==filtroAno.value)
    );
  });
  calcularIndicadores(res);
}

/* =========================================================
   INDICADORES
========================================================= */
function calcularIndicadores(d){
  const total=d.length;
  const primeira=d.filter(x=>String(x.Tipo_Consulta).toLowerCase().includes("primeira")).length;
  const seguimento=d.filter(x=>String(x.Tipo_Consulta).toLowerCase().includes("seguimento")).length;

  cardTotal.textContent=total;
  cardPrimeira.textContent=primeira;
  cardSeguimento.textContent=seguimento;
  cardTaxaSeguimento.textContent= total?((seguimento/total)*100).toFixed(1)+"%":"0%";
  cardRetencao.textContent= total?((d.filter(x=>x.Proxima_Consulta).length/total)*100).toFixed(1)+"%":"0%";

  renderizarGraficos({
    mensal: ordenarMes(agruparMes(d)),
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
function renderizarGraficos(d){
  destruirGraficos();

  criarGrafico("grafMensal","line",d.mensal,{
    cor:CORES.mensal,area:true,pontos:false,legenda:false
  });

  criarGrafico("grafSexo","doughnut",d.sexo,{
    cores:CORES.sexo,legenda:true,semi:true
  });

  criarGrafico("grafDiagnostico","bar",d.diagnostico,{
    cores:CORES.diagnostico
  });

  criarGrafico("grafMedico","bar",d.medico,{
    corUnica:CORES.medico
  });

  criarGrafico("grafServico","bar",d.servico,{
    gradient:true
  });

  criarGrafico("grafDistrito","bar",d.distrito,{
    corUnica:CORES.distrito,horizontal:true
  });
}

function criarGrafico(id,tipo,dados,cfg={}){
  const ctx=document.getElementById(id);
  if(!ctx) return;

  charts[id]=new Chart(ctx,{
    type: cfg.horizontal?"bar":tipo,
    data:{
      labels:Object.keys(dados),
      datasets:[{
        data:Object.values(dados),
        backgroundColor:
          cfg.gradient?CORES.servicoGradient(ctx):
          cfg.corUnica||cfg.cores||"#38BDF8",
        borderRadius: tipo==="bar"?{topLeft:10,topRight:10}:0,
        fill:cfg.area||false,
        tension:0.4,
        pointRadius: cfg.pontos===false?0:3
      }]
    },
    options:{
      indexAxis: cfg.horizontal?"y":"x",
      maintainAspectRatio:false,
      plugins:{
        legend:{ display: cfg.legenda===true, labels:{usePointStyle:true}}
      },
      rotation: cfg.semi? -90:0,
      circumference: cfg.semi?180:360,
      scales: tipo!=="doughnut"?{
        x:{ ticks:{autoSkip:true,maxRotation:0}},
        y:{ beginAtZero:true, grid:{display:false}}
      }:{}
    }
  });
}

function destruirGraficos(){
  Object.values(charts).forEach(c=>c.destroy());
  charts={};
}

/* =========================================================
   AUXILIARES
========================================================= */
function contar(d,c){
  return d.reduce((a,x)=>{
    const k=x[c]||"Não informado";
    a[k]=(a[k]||0)+1;
    return a;
  },{});
}

function agruparMes(d){
  const r={};
  d.forEach(x=>{
    const dt=normalizarData(x.Data_Consulta);
    if(!dt)return;
    const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    r[k]=(r[k]||0)+1;
  });
  return r;
}

function ordenarMes(o){
  return Object.fromEntries(Object.entries(o).sort());
}

function normalizarData(v){
  if(!v)return null;
  if(typeof v==="number") return new Date((v-25569)*86400*1000);
  const d=new Date(v);
  return isNaN(d)?null:d;
}

function preencherSelect(id,campo,base=dadosOriginais){
  const s=document.getElementById(id);
  const vals=[...new Set(base.map(x=>x[campo]).filter(Boolean))];
  s.innerHTML=`<option value="">Todos</option>`+
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
