let dadosOriginais = [];
let charts = {};

document.getElementById("excelFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    dadosOriginais = XLSX.utils.sheet_to_json(ws, { defval: "" });
    inicializarFiltros();
    aplicarFiltros();
  };
  reader.readAsArrayBuffer(file);
});

function inicializarFiltros() {
  preencher("filtroProvincia", "Provincia");
  preencher("filtroServico", "Servico");
  preencher("filtroAno", "Data_Consulta", d => new Date(d).getFullYear());

  document.getElementById("filtroProvincia").onchange = () => {
    preencher("filtroDistrito", "Distrito", null, "Provincia");
    aplicarFiltros();
  };

  ["filtroDistrito","filtroServico","filtroAno"].forEach(id =>
    document.getElementById(id).onchange = aplicarFiltros
  );
}

function preencher(id, campo, transform=null, depende=null) {
  const sel = document.getElementById(id);
  sel.innerHTML = "<option value=''>Todos</option>";
  let base = dadosOriginais;
  if (depende) {
    const v = document.getElementById("filtroProvincia").value;
    if (v) base = base.filter(d => d[depende] === v);
  }
  [...new Set(base.map(d => transform ? transform(d[campo]) : d[campo]))]
    .filter(Boolean)
    .sort()
    .forEach(v => sel.innerHTML += `<option>${v}</option>`);
}

function aplicarFiltros() {
  let dados = dadosOriginais;
  ["Provincia","Distrito","Servico"].forEach(f => {
    const v = document.getElementById("filtro"+f).value;
    if (v) dados = dados.filter(d => d[f] === v);
  });

  const ano = document.getElementById("filtroAno").value;
  if (ano) dados = dados.filter(d => new Date(d.Data_Consulta).getFullYear() == ano);

  calcularKPIs(dados);
  desenharGraficos(dados);
  desenharMapa();
}

function calcularKPIs(d) {
  const total = d.length;
  const p = d.filter(x => x.Tipo_Consulta.toLowerCase().includes("primeira")).length;
  const s = d.filter(x => x.Tipo_Consulta.toLowerCase().includes("seguimento")).length;
  const r = d.filter(x => x.Proxima_Consulta).length;

  document.getElementById("kpiTotal").innerText = total;
  document.getElementById("kpiPrimeira").innerText = p;
  document.getElementById("kpiSeguimento").innerText = s;
  document.getElementById("kpiTaxa").innerText = total ? ((s/total)*100).toFixed(1)+"%" : "0%";
  document.getElementById("kpiRetencao").innerText = total ? ((r/total)*100).toFixed(1)+"%" : "0%";
}

function desenharGraficos(d) {
  destruir();

  charts.mensal = new Chart(g("graficoMensal"), {
    type: "line",
    data: agruparData(d),
    options: { responsive:true }
  });

  charts.tipo = new Chart(g("graficoTipo"), {
    type: "doughnut",
    data: agruparCampo(d, "Tipo_Consulta")
  });

  charts.servico = new Chart(g("graficoServico"), {
    type: "bar",
    data: agruparCampo(d, "Servico")
  });

  charts.provincia = new Chart(g("graficoProvincia"), {
    type: "bar",
    data: agruparCampo(d, "Provincia")
  });
}

function agruparCampo(d, c) {
  const o = {};
  d.forEach(x => o[x[c]] = (o[x[c]]||0)+1);
  return { labels:Object.keys(o), datasets:[{ data:Object.values(o), backgroundColor:"#1f6ae1" }]};
}

function agruparData(d) {
  const o = {};
  d.forEach(x => {
    const k = new Date(x.Data_Consulta).toISOString().slice(0,7);
    o[k]=(o[k]||0)+1;
  });
  return { labels:Object.keys(o), datasets:[{ data:Object.values(o), borderColor:"#1f6ae1", fill:false }]};
}

function destruir() {
  Object.values(charts).forEach(c => c.destroy());
}

function g(id){ return document.getElementById(id).getContext("2d"); }

function desenharMapa() {
  if (window.map) return;
  window.map = L.map("map").setView([-18.7, 35.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}
