document.getElementById("btnCalcular").addEventListener("click", () => {
  const valor = parseFloat(document.getElementById("valorInicial").value);
  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;
  const resultado = document.getElementById("resultado");

  if (!valor || !dataInicio || !dataFim) {
    resultado.textContent = "Preencha todos os campos.";
    return;
  }

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const dias = Math.floor((fim - inicio) / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    resultado.textContent = "A data final deve ser depois da inicial.";
    return;
  }

  const juros = 0.02;
  const total = valor * (1 + juros * dias);

  resultado.textContent = `Valor final após ${dias} dias: R$ ${total.toFixed(2)}`;
});