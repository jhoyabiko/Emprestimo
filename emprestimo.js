import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const idCliente = params.get("id");

const btnRegistrar = document.getElementById("btnRegistrar");
const lista = document.getElementById("listaEmprestimos");
const titulo = document.getElementById("tituloCliente");

btnRegistrar.addEventListener("click", () => {
  const valor = parseFloat(document.getElementById("valor").value);
  const data = document.getElementById("data").value;
  const vencimento = document.getElementById("vencimento").value;

  if (valor > 0 && data) {
    push(ref(db, `clientes/${idCliente}/emprestimos`), {
      valor,
      data,
      vencimento: vencimento || null
    }).then(() => {
      alert("Empréstimo registrado!");
      document.getElementById("valor").value = "";
      document.getElementById("data").value = "";
      document.getElementById("vencimento").value = "";
      carregarEmprestimos();
    }).catch(err => console.error("Erro ao registrar:", err));
  } else {
    alert("Preencha valor e data!");
  }
});

async function carregarEmprestimos() {
  if (!idCliente) {
    alert("Cliente não encontrado.");
    return;
  }

  const clienteSnap = await get(ref(db, `clientes/${idCliente}`));
  const cliente = clienteSnap.val();
  titulo.textContent = `Empréstimos de ${cliente.nome}`;
  const emprestimos = cliente.emprestimos || {};

  lista.innerHTML = "";

  Object.entries(emprestimos).forEach(([key, emp]) => {
    const li = document.createElement("li");
    li.textContent = `R$ ${emp.valor.toFixed(2)} - ${emp.data} ${emp.vencimento ? " | Venc: " + emp.vencimento : ""}`;

    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      editarEmprestimo(key, emp);
    });

    let pressTimer;
    li.addEventListener("touchstart", () => {
      pressTimer = setTimeout(() => {
        editarEmprestimo(key, emp);
      }, 600);
    });
    li.addEventListener("touchend", () => {
      clearTimeout(pressTimer);
    });

    lista.appendChild(li);
  });
}

function editarEmprestimo(chave, dados) {
  const novoValor = prompt("Novo valor do empréstimo:", dados.valor);
  if (novoValor === null) return;
  const valorNum = parseFloat(novoValor);
  if (isNaN(valorNum) || valorNum <= 0) return alert("Valor inválido");

  const novaData = prompt("Nova data do empréstimo:", dados.data);
  if (!novaData) return;

  const novoVencimento = prompt("Nova data de vencimento (opcional):", dados.vencimento || "");

  update(ref(db, `clientes/${idCliente}/emprestimos/${chave}`), {
    valor: valorNum,
    data: novaData,
    vencimento: novoVencimento || null
  }).then(() => {
    alert("Empréstimo atualizado!");
    carregarEmprestimos();
  }).catch(err => {
    console.error("Erro ao editar:", err);
    alert("Erro ao editar.");
  });
}

carregarEmprestimos();
