document.getElementById("excelFile").addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  document.getElementById("output").innerHTML =
    "<p>Ficheiro selecionado: <strong>" + file.name + "</strong></p>";
});
