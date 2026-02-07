let dados = [];
let charts = {};

// ================= LEITURA DO EXCEL =================
document.getElementById("excelFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sheet);

    inicializarFiltros();
    atualizarDashboard();
  };
  reader.readAsArrayBuffer(file);
});

// ================= FILTROS =================
function inicializarFiltros() {
  preencherSelect("filtroProvincia", "Província");
  preencherSelect("filtroDistrito", "Distrito");
  preencherSelect("filtroServico", "Serviço");
  preencherSelect("filtroAno", "Ano");
}

function preencherSelect(id, campo) {
  const select = document.getElementById(id);
  select.innerHTML = "<option value=''>Todos</option>";

  const valores = [...new Set(dados.map(d => d[campo]).filter(Boolean))].sort();
  valores.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  select.onchange = atualizarDashboard;
}

function dadosFiltrados() {
  return dados.filter(d =>
    (!filtroProvincia.value || d["Província"] === filtroProvincia.value) &&
    (!filtroDistrito.value || d["Distrito"] === filtroDistrito.value) &&
    (!filtroServico.value || d["Serviço"] === filtroServico.value) &&
    (!filtroAno.value || String(d["Ano"]) === filtroAno.value)
  );
}

// ================= DASHBOARD =================
function atualizarDashboard() {
  const df = dadosFiltrados();

  atualizarCards(df);
  graficoMensal(df);
  graficoDiagnostico(df);
  graficoProdutividade(df, "Médico", "grafMedico");
  graficoProdutividade(df, "Serviço", "grafServico");
  graficoProdutividade(df, "Distrito", "grafDistrito");
  pictogramaSexo(df);
}

// ================= CARDS =================
function atualizarCards(df) {
  const total = df.length;
  const primeira = df.filter(d => d["Tipo de Consulta"] === "Primeira").length;
  const seguimento = df.filter(d => d["Tipo de Consulta"] === "Seguimento").length;

  document.getElementById("cardTotal").textContent = total;
  document.getElementById("cardPrimeira").textContent = primeira;
  document.getElementById("cardSeguimento").textContent = seguimento;
  document.getElementById("cardTaxaSeguimento").textContent =
    total ? Math.round((seguimento / total) * 100) + "%" : "0%";
  document.getElementById("cardRetencao").textContent =
    total ? Math.round((primeira / total) * 100) + "%" : "0%";
}

// ================= GRÁFICOS =================
function criarChart(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function graficoMensal(df) {
  const mapa = {};
  df.forEach(d => {
    const mes = d["Mês"] || "N/D";
    mapa[mes] = (mapa[mes] || 0) + 1;
  });

  criarChart("grafMensal", {
    type: "line",
    data: {
      labels: Object.keys(mapa),
      datasets: [{
        label: "Atendimentos",
        data: Object.values(mapa),
        borderWidth: 3,
        tension: 0.4
      }]
    }
  });
}

function graficoDiagnostico(df) {
  const mapa = {};
  df.forEach(d => {
    const diag = d["Diagnóstico"] || "Outros";
    mapa[diag] = (mapa[diag] || 0) + 1;
  });

  criarChart("grafDiagnostico", {
    type: "bar",
    data: {
      labels: Object.keys(mapa),
      datasets: [{
        label: "Casos",
        data: Object.values(mapa)
      }]
    }
  });
}

function graficoProdutividade(df, campo, canvas) {
  const mapa = {};
  df.forEach(d => {
    const v = d[campo] || "N/D";
    mapa[v] = (mapa[v] || 0) + 1;
  });

  criarChart(canvas, {
    type: "bar",
    data: {
      labels: Object.keys(mapa),
      datasets: [{
        label: "Atendimentos",
        data: Object.values(mapa)
      }]
    },
    options: {
      indexAxis: "y"
    }
  });
}

// ================= PICTOGRAMA SEXO =================
function pictogramaSexo(df) {
  const cont = { Masculino: 0, Feminino: 0 };

  df.forEach(d => {
    if (d["Sexo"] === "Masculino") cont.Masculino++;
    if (d["Sexo"] === "Feminino") cont.Feminino++;
  });

  const div = document.getElementById("pictogramaSexo");
  div.innerHTML = `
    <div><i class="fa-solid fa-person" style="font-size:80px;color:#2ED8C3"></i><br>${cont.Masculino}</div>
    <div><i class="fa-solid fa-person-dress" style="font-size:80px;color:#FB8C00"></i><br>${cont.Feminino}</div>
  `;
}

// ================= DOWNLOAD PDF =================
document.getElementById("btnDownload").addEventListener("click", () => {
  html2pdf().from(document.body).save("dashboard-saude.pdf");
});
