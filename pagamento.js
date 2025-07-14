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

carregarEmprestimos();
