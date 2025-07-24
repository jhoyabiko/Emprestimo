import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(location.search);
const idCliente = params.get("id");

document.getElementById("btnRegistrar").addEventListener("click", async () => {
  const valorTotal = parseFloat(document.getElementById("valorTotal").value);
  const valorParcela = parseFloat(document.getElementById("valorParcela").value);
  const quantidade = parseInt(document.getElementById("quantidade").value);
  const dataInicio = document.getElementById("dataInicio").value;

  if (!valorTotal || !valorParcela || !quantidade || !dataInicio) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  const parcelas = [];
  let dataAtual = new Date(dataInicio);

  for (let i = 0; i < quantidade; i++) {
    const dataParcela = new Date(dataAtual);
    dataParcela.setMonth(dataParcela.getMonth() + i);

    parcelas.push({
      valor: valorParcela,
      data: dataParcela.toISOString().split("T")[0]
    });
  }

  await push(ref(db, `clientes/${idCliente}/emprestimos`), {
    valor: valorTotal,
    data: dataInicio,
    parcelado: true,
    parcelas: parcelas
  });

  alert("Empréstimo parcelado registrado!");
  window.location.href = `cliente.html?id=${idCliente}`;
});
