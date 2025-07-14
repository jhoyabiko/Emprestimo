import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const btnCadastrar = document.getElementById("btnAdicionar");
const nomeInput = document.getElementById("nome");
const listaClientes = document.getElementById("listaClientes");

btnCadastrar.addEventListener("click", async () => {
  const nome = nomeInput.value.trim();
  if (nome) {
    await push(ref(db, "clientes"), { nome });
    nomeInput.value = "";
  }
});

function calcularSaldoComPagamentos(valorInicial, dataInicial, pagamentos = [], dataFinal = null) {
  const JUROS_DIA = 0.02;
  let saldo = valorInicial;
  let dataAnterior = new Date(dataInicial);
  const hoje = new Date();
  dataFinal = dataFinal ? new Date(dataFinal) : hoje;

  const pagamentosOrdenados = pagamentos
    .map(p => ({ ...p, data: new Date(p.data) }))
    .sort((a, b) => a.data - b.data);

  for (let pagamento of pagamentosOrdenados) {
    const dias = Math.floor((pagamento.data - dataAnterior) / (1000 * 60 * 60 * 24));
    if (dias > 0) saldo += saldo * JUROS_DIA * dias;
    saldo -= pagamento.valor;
    dataAnterior = pagamento.data;
  }

  const diasRestantes = Math.floor((dataFinal - dataAnterior) / (1000 * 60 * 60 * 24));
  if (diasRestantes > 0) saldo += saldo * JUROS_DIA * diasRestantes;

  return saldo;
}

onValue(ref(db, "clientes"), async snapshot => {
  listaClientes.innerHTML = "";
  const clientes = snapshot.val();
  if (!clientes) return;

  for (const [id, cliente] of Object.entries(clientes)) {
    const emprestimosRef = ref(db, `clientes/${id}/emprestimos`);
    const emprestimosSnap = await get(emprestimosRef);
    const emprestimos = emprestimosSnap.val();

    let totalSaldo = 0;
    if (emprestimos) {
      for (const [idEmp, emp] of Object.entries(emprestimos)) {
        const pagamentosSnap = await get(child(emprestimosRef, `${idEmp}/pagamentos`));
        const pagamentos = pagamentosSnap.exists() ? Object.values(pagamentosSnap.val()) : [];
        totalSaldo += calcularSaldoComPagamentos(emp.valor, emp.data, pagamentos);
      }
    }

    const li = document.createElement("li");
    li.innerHTML = `
      <a href="cliente.html?id=${id}">
        <strong>${cliente.nome}</strong> - R$ ${totalSaldo.toFixed(2)}
      </a>
      <div class="acoes-cliente">
        <a href="emprestimo.html?id=${id}" class="button-link">Novo Empréstimo</a>
        <a href="pagamento.html?id=${id}" class="button-link">Pagamento</a>
      </div>
    `;
    listaClientes.appendChild(li);
  }
});
