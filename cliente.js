import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, child, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
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
    if (dias > 0) {
      const juros = saldo * JUROS_DIA * dias;
      saldo += juros;
    }
    saldo -= pagamento.valor;
    dataAnterior = pagamento.data;
  }

  const diasRestantes = Math.floor((dataFinal - dataAnterior) / (1000 * 60 * 60 * 24));
  if (diasRestantes > 0 && saldo > 0) {
    const juros = saldo * JUROS_DIA * diasRestantes;
    saldo += juros;
  }

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
    </div>`;

    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      mostrarMenuContextual(e.pageX, e.pageY, id, emp);
    });

    let pressTimer;
    li.addEventListener("touchstart", (e) => {
      pressTimer = setTimeout(() => {
        mostrarMenuContextual(e.touches[0].pageX, e.touches[0].pageY, id, emp);
      }, 700);
    });

    li.addEventListener("touchend", () => clearTimeout(pressTimer));
    li.addEventListener("touchmove", () => clearTimeout(pressTimer));

    listaEmprestimos.appendChild(li);
  }
}

let menuContextual;
let clienteSelecionadoId = idCliente;
let emprestimoSelecionadoId = null;
let emprestimoSelecionadoDados = null;

function criarMenuContextual() {
  menuContextual = document.createElement("div");
  menuContextual.style.position = "absolute";
  menuContextual.style.background = "white";
  menuContextual.style.border = "1px solid #ccc";
  menuContextual.style.borderRadius = "6px";
  menuContextual.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  menuContextual.style.padding = "8px";
  menuContextual.style.zIndex = 9999;
  menuContextual.style.display = "none";

  const btnEditar = document.createElement("button");
  btnEditar.textContent = "✏️ Editar";
  btnEditar.style.display = "block";
  btnEditar.onclick = async () => {
    const novoValor = prompt("Novo valor do empréstimo:", emprestimoSelecionadoDados.valor);
    if (novoValor === null) return;
    const valorNum = parseFloat(novoValor);
    if (isNaN(valorNum) || valorNum <= 0) return alert("Valor inválido");

    const novaData = prompt("Nova data do empréstimo:", emprestimoSelecionadoDados.data);
    if (!novaData) return;

    await update(ref(db, `clientes/${clienteSelecionadoId}/emprestimos/${emprestimoSelecionadoId}`), {
      valor: valorNum,
      data: novaData
    });

    menuContextual.style.display = "none";
    carregarEmprestimos();
  };

  const btnExcluir = document.createElement("button");
  btnExcluir.textContent = "🗑️ Excluir";
  btnExcluir.style.display = "block";
  btnExcluir.style.marginTop = "6px";
  btnExcluir.onclick = async () => {
    if (confirm("Tem certeza que deseja excluir este empréstimo?")) {
      await remove(ref(db, `clientes/${clienteSelecionadoId}/emprestimos/${emprestimoSelecionadoId}`));
      carregarEmprestimos();
    }
    menuContextual.style.display = "none";
  };

  menuContextual.appendChild(btnEditar);
  menuContextual.appendChild(btnExcluir);
  document.body.appendChild(menuContextual);
}

function mostrarMenuContextual(x, y, idEmprestimo, dados) {
  emprestimoSelecionadoId = idEmprestimo;
  emprestimoSelecionadoDados = dados;
  menuContextual.style.left = x + "px";
  menuContextual.style.top = y + "px";
  menuContextual.style.display = "block";
}

document.addEventListener("click", () => {
  if (menuContextual) menuContextual.style.display = "none";
});

criarMenuContextual();

if (idCliente) {
  carregarCliente();
  carregarEmprestimos();
}
const linkParcelado = document.createElement("a");
linkParcelado.href = `parcelado.html?id=${idCliente}`;
linkParcelado.textContent = "Parcelado";
linkParcelado.classList.add("botao-navegacao");
document.querySelector(".botoes-navegacao").appendChild(linkParcelado);

