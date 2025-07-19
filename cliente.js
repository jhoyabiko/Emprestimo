import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(location.search);
const idCliente = params.get("id");
const nomeCliente = document.getElementById("nomeCliente");
const listaEmprestimos = document.getElementById("listaEmprestimos");

document.getElementById("linkEmprestimo").href = `emprestimo.html?id=${idCliente}`;
document.getElementById("linkEmprestimo").textContent = "Novo Empréstimo";
document.getElementById("linkPagamento").href = `pagamento.html?id=${idCliente}`;
document.getElementById("linkPagamento").textContent = "Registrar Pagamento";

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

async function carregarCliente() {
  const clienteSnap = await get(ref(db, `clientes/${idCliente}`));
  const cliente = clienteSnap.val();
  if (cliente) nomeCliente.textContent = cliente.nome;
}

async function carregarEmprestimos() {
  const emprestimosSnap = await get(ref(db, `clientes/${idCliente}/emprestimos`));
  const emprestimos = emprestimosSnap.val();

  listaEmprestimos.innerHTML = "";

  if (!emprestimos) return;

  for (const [id, emp] of Object.entries(emprestimos)) {
    const pagamentosSnap = await get(child(ref(db), `clientes/${idCliente}/emprestimos/${id}/pagamentos`));
    const pagamentos = pagamentosSnap.exists() ? Object.values(pagamentosSnap.val()) : [];
    const saldo = calcularSaldoComPagamentos(emp.valor, emp.data, pagamentos);

    const li = document.createElement("li");
    li.innerHTML = `<div class="card-cliente">
      Valor: R$ ${emp.valor} <br>
      Data: ${emp.data} <br>
      Pagamentos: R$ ${pagamentos.reduce((t, p) => t + p.valor, 0)} <br>
      <strong>Saldo atual com juros: R$ ${saldo.toFixed(2)}</strong>
    `;
    listaEmprestimos.appendChild(li);
  }
}

if (idCliente) {
  carregarCliente();
  carregarEmprestimos();
}

// === MENU DE CONTEXTO (clique direito / toque longo) ===
const menuContexto = document.getElementById('menu-contexto');
let itemSelecionado = null;

// Mostrar menu com botão direito
document.addEventListener('contextmenu', function (e) {
  const alvo = e.target.closest('.card-cliente');
  if (alvo) {
    e.preventDefault();
    itemSelecionado = alvo;
    menuContexto.style.top = `${e.pageY}px`;
    menuContexto.style.left = `${e.pageX}px`;
    menuContexto.style.display = 'flex';
  } else {
    menuContexto.style.display = 'none';
  }
});

// Toque longo (mobile)
let toqueTimer;
document.addEventListener('touchstart', function (e) {
  const alvo = e.target.closest('.card-cliente');
  if (alvo) {
    toqueTimer = setTimeout(() => {
      itemSelecionado = alvo;
      const touch = e.touches[0];
      menuContexto.style.top = `${touch.pageY}px`;
      menuContexto.style.left = `${touch.pageX}px`;
      menuContexto.style.display = 'flex';
    }, 700);
  }
});
document.addEventListener('touchend', () => clearTimeout(toqueTimer));
document.addEventListener('touchmove', () => clearTimeout(toqueTimer));
document.addEventListener('click', () => menuContexto.style.display = 'none');

document.getElementById('btn-editar').addEventListener('click', () => {
  alert('Editar: ' + itemSelecionado?.innerText);
});
document.getElementById('btn-excluir').addEventListener('click', () => {
  const confirmacao = confirm('Deseja excluir?');
  if (confirmacao && itemSelecionado) {
    itemSelecionado.remove();
  }
});
