document.getElementById("excelFile").addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    mostrarTabela(jsonData);
  };

  reader.readAsArrayBuffer(file);
});

function mostrarTabela(dados) {
  let html = "<table border='1' cellpadding='5'>";

  dados.forEach((linha, index) => {
    html += "<tr>";
    linha.forEach((celula) => {
      html += index === 0 ? `<th>${celula}</th>` : `<td>${celula}</td>`;
    });
    html += "</tr>";
  });

  html += "</table>";

  document.getElementById("output").innerHTML = html;
}
