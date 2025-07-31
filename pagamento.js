import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const idCliente = params.get("id");

const selectEmprestimo = document.getElementById("emprestimo");
const btnPagar = document.getElementById("btnPagar");
const inputValor = document.getElementById("valor");
const inputData = document.getElementById("dataPagamento");

async function carregarEmprestimos() {
  if (!idCliente) {
    alert("Cliente não encontrado.");
    return;
  }

  const refEmp = ref(db, `clientes/${idCliente}/emprestimos`);
  const snapshot = await get(refEmp);
  const emprestimos = snapshot.val();

  selectEmprestimo.innerHTML = "";

  if (!emprestimos) {
    selectEmprestimo.innerHTML = `<option disabled>Nenhum empréstimo encontrado</option>`;
    return;
  }

  for (const [id, emp] of Object.entries(emprestimos)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `R$ ${parseFloat(emp.valor).toFixed(2)} - ${emp.data}`;
    selectEmprestimo.appendChild(option);
    if (!selectEmprestimo.value && Object.keys(emprestimos).length > 0) {
      selectEmprestimo.value = Object.keys(emprestimos)[0];
    }
    mostrarValorAtualizadoComJuros(selectEmprestimo.value);

  }
}


btnPagar.addEventListener("click", async () => {
  const idEmprestimo = selectEmprestimo.value;
  const valor = parseFloat(inputValor.value);
  const data = inputData.value;

  if (!idEmprestimo || !valor || !data) {
    alert("Preencha todos os campos.");
    return;
  }

  const refPagamentos = ref(db, `clientes/${idCliente}/emprestimos/${idEmprestimo}/pagamentos`);
  await push(refPagamentos, { valor, data });

  alert("Pagamento registrado com sucesso!");
  window.location.href = `cliente.html?id=${idCliente}`;
});
function carregarEmprestimosSelecionaveis(clienteId) {
  const container = document.getElementById("selecionar-emprestimos-container");
  const valorTotalSpan = document.getElementById("valor-total-selecionado");
  container.innerHTML = "";
  valorTotalSpan.textContent = "";

  const dbRef = firebase.database().ref("emprestimos/" + clienteId);
  dbRef.once("value", (snapshot) => {
    const emprestimos = snapshot.val();
    if (!emprestimos) return;

    const hoje = new Date();

    Object.entries(emprestimos).forEach(([key, dados]) => {
      if (dados.pago) return;

      const dataEmprestimo = new Date(dados.data);
      const dias = Math.floor((hoje - dataEmprestimo) / (1000 * 60 * 60 * 24));
      const valorAtualizado = dados.valor * (1 + 0.02 * dias);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = key;
      checkbox.dataset.valor = valorAtualizado;
      checkbox.onchange = atualizarTotalSelecionado;

      const label = document.createElement("label");
      label.textContent = `Data: ${dados.data} | Valor original: R$ ${parseFloat(dados.valor).toFixed(2)} | Com juros: R$ ${valorAtualizado.toFixed(2)}`;


      const div = document.createElement("div");
      div.appendChild(checkbox);
      div.appendChild(label);

      container.appendChild(div);
    });
  });

  function atualizarTotalSelecionado() {
    const checkboxes = container.querySelectorAll("input[type='checkbox']:checked");
    let total = 0;
    checkboxes.forEach(cb => total += parseFloat(cb.dataset.valor));
    valorTotalSpan.textContent = "Total a pagar: R$ " + total.toFixed(2);
  }
}

function pagarSelecionados() {
  const clienteId = localStorage.getItem("clienteSelecionado");
  const checkboxes = document.querySelectorAll("#selecionar-emprestimos-container input[type='checkbox']:checked");
  if (checkboxes.length === 0) return alert("Selecione ao menos um empréstimo");

  const updates = {};
  checkboxes.forEach(cb => {
    updates["emprestimos/" + clienteId + "/" + cb.value + "/pago"] = true;
  });

  firebase.database().ref().update(updates, (error) => {
    if (error) {
      alert("Erro ao registrar pagamento");
    } else {
      alert("Pagamento registrado com sucesso");
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const clienteId = localStorage.getItem("clienteSelecionado");
  if (clienteId) carregarEmprestimosSelecionaveis(clienteId);
});
async function mostrarValorAtualizadoComJuros(idEmprestimo) {
  const refEmp = ref(db, `clientes/${idCliente}/emprestimos/${idEmprestimo}`);
  const snapshot = await get(refEmp);
  const emp = snapshot.val();
  if (!emp) return;

  const valorOriginal = parseFloat(emp.valor);
  const dataEmprestimo = new Date(emp.data);
  const hoje = new Date();

  let valorAtualizado = valorOriginal;
  let ultimaData = new Date(emp.data);

  if (emp.pagamentos) {
    // Ordenar pagamentos por data
    const pagamentosOrdenados = Object.values(emp.pagamentos).sort((a, b) => new Date(a.data) - new Date(b.data));

    for (const pag of pagamentosOrdenados) {
      const dataPag = new Date(pag.data);
      const dias = Math.floor((dataPag - ultimaData) / (1000 * 60 * 60 * 24));
      valorAtualizado *= (1 + 0.02 * dias); // juros até o pagamento

      valorAtualizado -= parseFloat(pag.valor); // subtrai pagamento
      ultimaData = dataPag;
    }
  }

  // Aplicar juros desde o último pagamento até hoje
  const diasRestantes = Math.floor((hoje - ultimaData) / (1000 * 60 * 60 * 24));
  valorAtualizado *= (1 + 0.02 * diasRestantes);

  const pJuros = document.getElementById("valorComJuros");
  pJuros.textContent = `Valor atualizado até hoje: R$ ${valorAtualizado.toFixed(2)}`;
}


carregarEmprestimos();

selectEmprestimo.addEventListener("change", (e) => {
  const idEmprestimo = e.target.value;
  if (idEmprestimo) mostrarValorAtualizadoComJuros(idEmprestimo);
});
