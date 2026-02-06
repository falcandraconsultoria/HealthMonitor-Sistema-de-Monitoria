document.getElementById("excelFile").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    motorIndicadoresSaude(dados);
  };

  reader.readAsArrayBuffer(file);
});

/* ==============================
   MOTOR DE INDICADORES DE SAÚDE
   ============================== */

function motorIndicadoresSaude(dados) {
  const cabecalho = dados[0];
  const linhas = dados.slice(1);

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

  const faltantes = colunasObrigatorias.filter(
    col => !cabecalho.includes(col)
  );

  if (faltantes.length > 0) {
    document.getElementById("output").innerHTML = `
      <p style="color:red;">
        ❌ Estrutura inválida.<br>
        Colunas obrigatórias em falta:<br>
        <strong>${faltantes.join(", ")}</strong>
      </p>`;
    return;
  }

  const idx = c => cabecalho.indexOf(c);

  let total = linhas.length;
  let primeiraConsulta = 0;
  let seguimento = 0;

  let porProvincia = {};
  let porDistrito = {};
  let porServico = {};
  let porDiagnostico = {};
  let porSexo = {};
  let porMedico = {};
  let seguimentoServico = {};

  linhas.forEach(l => {
    const provincia = l[idx("Provincia")];
    const distrito = l[idx("Distrito")];
    const sexo = l[idx("Sexo")];
    const medico = l[idx("Nome_Medico")];
    const diagnostico = l[idx("Diagnostico")];
    const servico = l[idx("Servico")];
    const tipo = l[idx("Tipo_Consulta")];
    const prox = l[idx("Proxima_Consulta")];

    porProvincia[provincia] = (porProvincia[provincia] || 0) + 1;
    porDistrito[distrito] = (porDistrito[distrito] || 0) + 1;
    porServico[servico] = (porServico[servico] || 0) + 1;
    porDiagnostico[diagnostico] = (porDiagnostico[diagnostico] || 0) + 1;
    porSexo[sexo] = (porSexo[sexo] || 0) + 1;
    porMedico[medico] = (porMedico[medico] || 0) + 1;

    if (tipo === "Primeira Consulta") primeiraConsulta++;
    if (tipo === "Seguimento") {
      seguimento++;
      seguimentoServico[servico] = (seguimentoServico[servico] || 0) + 1;
    }
  });

  const taxaSeguimento = ((seguimento / total) * 100).toFixed(1);

  renderizarIndicadores({
    total,
    primeiraConsulta,
    seguimento,
    taxaSeguimento,
    porProvincia,
    porDistrito,
    porServico,
    porDiagnostico,
    porSexo,
    porMedico,
    seguimentoServico
  });
}

/* ==============================
   DASHBOARD DE INDICADORES
   ============================== */

function renderizarIndicadores(d) {
  document.getElementById("output").innerHTML = `
    <h3>📊 Indicadores de Monitoria de Saúde</h3>

    <p><strong>Total de atendimentos:</strong> ${d.total}</p>
    <p><strong>Primeiras consultas:</strong> ${d.primeiraConsulta}</p>
    <p><strong>Consultas de seguimento:</strong> ${d.seguimento}</p>
    <p><strong>Taxa de seguimento:</strong> ${d.taxaSeguimento}%</p>

    <h4>🗺️ Atendimentos por Província</h4>
    ${lista(d.porProvincia)}

    <h4>📍 Atendimentos por Distrito</h4>
    ${lista(d.porDistrito)}

    <h4>🏥 Atendimentos por Serviço</h4>
    ${lista(d.porServico)}

    <h4>🔁 Seguimento por Serviço</h4>
    ${lista(d.seguimentoServico)}

    <h4>🦠 Casos por Diagnóstico</h4>
    ${lista(d.porDiagnostico)}

    <h4>👥 Atendimentos por Sexo</h4>
    ${lista(d.porSexo)}

    <h4>👨🏽‍⚕️ Atendimentos por Médico</h4>
    ${lista(d.porMedico)}
  `;
}

function lista(obj) {
  return `<ul>${
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1)
      .map(([k, v]) => `<li>${k}: ${v}</li>`)
      .join("")
  }</ul>`;
}
