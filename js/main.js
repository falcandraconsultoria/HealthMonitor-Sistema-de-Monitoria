/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */
let dadosOriginais = [];
let charts = {};

/* =========================================================
   CORES PROFISSIONAIS (SAÚDE PÚBLICA)
========================================================= */
const CORES = {
  medico: "#38BDF8",          // Azul Sereno
  distrito: "#2DD4BF",        // Verde Água / Menta
  servicoGradient: [
    "#10B981",
    "#34D399",
    "#6EE7B7",
    "#A7F3D0"
  ],
  diagnosticos: [
    "#10B981", // Esmeralda
    "#2563EB", // Safira
    "#7C3AED", // Ametista
    "#64748B"  // Ardósia
  ],
  sexo: {
    masculino: "#38BDF8",
    feminino: "#818CF8"
  }
};

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
  filtroDistrito.innerHTML = `<option value="">Todos</option>`;
}

["filtroProvincia","filtroDistrito","filtroServico","filtroAno"]
  .forEach(id =>
    document.getElementById(id).addEventListener("change", aplicarFiltros)
  );

filtroProvincia.addEventListener("change", () => {
  const base = filtroProvincia.value
    ? dadosOriginais.filter(d => d.Provincia === filtroProvincia.value)
    : dadosOriginais;

  preencherSelect("filtroDistrito", "Distrito", base);
  filtroDistrito.value = "";
  aplicarFiltros();
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

  calcularIndicadores(filtrados);
}

/* =========================================================
   INDICADORES
========================================================= */
function calcularIndicadores(d) {
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
    preenchido:true,
    legenda:false,
    pontos:false
  });

  /* Sexo — Gauge (semicírculo) */
  criarGrafico("grafSexo","doughnut",d.sexo,{
    cores:[CORES.sexo.masculino, CORES.sexo.feminino],
    gauge:true
  });

  criarGrafico("grafDiagnostico","bar",d.diagnostico,{
    cores: CORES.diagnosticos
  });

  criarGrafico("grafMedico","bar",d.medico,{
    corUnica: CORES.medico
  });

  criarGrafico("grafServico","bar",d.servico,{
    cores: CORES.servicoGradient
  });

  criarGrafico("grafDistrito","bar",d.distrito,{
    corUnica: CORES.distrito
  });
}

function criarGrafico(id,tipo,dados,cfg={}) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  charts[id] = new Chart(ctx,{
    type: tipo,
    data:{
      labels:Object.keys(dados),
      datasets:[{
        data:Object.values(dados),
        backgroundColor: cfg.corUnica || cfg.cores,
        borderWidth:0,
        fill:cfg.preenchido || false,
        tension:0.4,
        pointRadius: cfg.pontos === false ? 0 : 3,
        borderRadius: tipo === "bar" ? 8 : 0
      }]
    },
    options:{
      maintainAspectRatio:false,
      rotation: cfg.gauge ? -90 : 0,
      circumference: cfg.gauge ? 180 : 360,
      plugins:{
        legend:{
          display:true,
          position:"bottom"
        }
      },
      scales: tipo !== "doughnut" ? {
        x:{ ticks:{ autoSkip:true }},
        y:{ beginAtZero:true, grid:{ display:false }}
      } : {}
    }
  });
}

function destruirGraficos(){
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

/* =========================================================
   AUXILIARES
========================================================= */
function contar(d,c){
  return d.reduce((a,x)=>{
    const k = x[c] || "Não informado";
    a[k] = (a[k] || 0) + 1;
    return a;
  },{});
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

function ordenarMeses(obj){
  return Object.fromEntries(
    Object.entries(obj).sort((a,b)=>a[0].localeCompare(b[0]))
  );
}

function normalizarData(v){
  if(!v) return null;
  if(typeof v === "number")
    return new Date((v - 25569) * 86400 * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function preencherSelect(id,campo,base=dadosOriginais){
  const s = document.getElementById(id);
  const vals = [...new Set(base.map(x=>x[campo]).filter(Boolean))];
  s.innerHTML = `<option value="">Todos</option>` +
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
