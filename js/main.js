document.getElementById("excelFile").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const dados = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    motorIndicadoresSaude(dados);
  };

  reader.readAsArrayBuffer(file);
});

/* =========================================================
   MOTOR DE INDICADORES DE SAÚDE
========================================================= */

function motorIndicadoresSaude(dados) {
  const colunasObrigatorias = [
    "Provincia",
    "Distrito",
    "Sexo",
    "Nome_Medico",
    "Diagnostico",
    "Servico",
    "Tipo_Consulta",
    "Data_Consulta",
    "Proxima_Consulta"
  ];

  const colunasExcel = Object.keys(dados[0] || {});
  const faltantes = colunasObrigatorias.filter(c => !colunasExcel.includes(c));

  if (faltantes.length > 0) {
    document.getElementById("output").innerHTML = `
      <p style="color:red">
        <strong>Colunas em falta:</strong> ${faltantes.join(", ")}
      </p>`;
    return;
  }

  const totalAtendimentos = dados.length;

  const primeiraConsulta = dados.filter(
    d => (d.Tipo_Consulta || "").toLowerCase().includes("primeira")
  ).length;

  const seguimento = dados.filter(
    d => (d.Tipo_Consulta || "").toLowerCase().includes("seguimento")
  ).length;

  const taxaSeguimento = totalAtendimentos > 0
    ? ((seguimento / totalAtendimentos) * 100).toFixed(1)
    : 0;

  const comProximaConsulta = dados.filter(
    d => d.Proxima_Consulta !== ""
  ).length;

  const taxaRetencao = totalAtendimentos > 0
    ? ((comProximaConsulta / totalAtendimentos) * 100).toFixed(1)
    : 0;

  const porProvincia = contar(dados, "Provincia");
  const porDistrito = contar(dados, "Distrito");
  const porServico = contar(dados, "Servico");
  const porDiagnostico = contar(dados, "Diagnostico");
  const porSexo = contar(dados, "Sexo");
  const porMedico = contar(dados, "Nome_Medico");

  renderizar({
    totalAtendimentos,
    primeiraConsulta,
    seguimento,
    taxaSeguimento,
    taxaRetencao,
    porProvincia,
    porDistrito,
    porServico,
    porDiagnostico,
    porSexo,
    porMedico
  });
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function contar(dados, campo) {
  return dados.reduce((acc, item) => {
    const chave = item[campo] || "Não informado";
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});
}

function lista(obj) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<li>${k}: ${v}</li>`)
    .join("");
}

/* =========================================================
   RENDERIZAÇÃO DOS INDICADORES
========================================================= */

function renderizar(i) {
  document.getElementById("output").innerHTML = `
    <h3>Indicadores de Saúde</h3>

    <p><strong>Total de atendimentos:</strong> ${i.totalAtendimentos}</p>
    <p><strong>Primeira consulta:</strong> ${i.primeiraConsulta}</p>
    <p><strong>Consultas de seguimento:</strong> ${i.seguimento}</p>
    <p><strong>Taxa de seguimento:</strong> ${i.taxaSeguimento}%</p>
    <p><strong>Pacientes com próxima consulta:</strong> ${i.taxaRetencao}%</p>

    <h4>Atendimentos por Província</h4>
    <ul>${lista(i.porProvincia)}</ul>

    <h4>Atendimentos por Distrito</h4>
    <ul>${lista(i.porDistrito)}</ul>

    <h4>Atendimentos por Serviço</h4>
    <ul>${lista(i.porServico)}</ul>

    <h4>Diagnósticos mais frequentes</h4>
    <ul>${lista(i.porDiagnostico)}</ul>

    <h4>Distribuição por Sexo</h4>
    <ul>${lista(i.porSexo)}</ul>

    <h4>Atendimentos por Médico</h4>
    <ul>${lista(i.porMedico)}</ul>
  `;
}
