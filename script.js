import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, get, child, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnCadastrar = document.getElementById("btnAdicionar");
const nomeInput = document.getElementById("nome");
const listaClientes = document.getElementById("listaClientes");

const loginDiv = document.getElementById("loginDiv");
const appDiv = document.getElementById("appDiv");

btnLogin.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  signInWithEmailAndPassword(auth, email, senha)
    .catch(error => alert("Erro ao logar: " + error.message));
});

btnLogout.addEventListener("click", () => {
  signOut(auth);
});

btnCadastrar.addEventListener("click", async () => {
  const nome = nomeInput.value.trim();
  if (nome) {
    await push(ref(db, "clientes"), { nome });
    nomeInput.value = "";
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginDiv.style.display = "none";
    appDiv.style.display = "block";
    carregarClientes();
  } else {
    loginDiv.style.display = "block";
    appDiv.style.display = "none";
  }
});

// Pressionar ENTER faz login no campo senha ou email
document.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        if (document.activeElement.id === "email" || document.activeElement.id === "senha") {
            event.preventDefault();
            document.getElementById("btnLogin").click();
        }
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

function carregarClientes() {
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
          ${cliente.nome} - R$ ${totalSaldo.toFixed(2)}
        </a>
      `;
      adicionarEventosContextuais(li, id, cliente.nome);
      listaClientes.appendChild(li);
    }
  });
}

let longPressTimer;
let menuContextual;
let clienteSelecionadoId = null;
let clienteSelecionadoNome = null;

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
    const novoNome = prompt("Novo nome do cliente:", clienteSelecionadoNome);
    if (novoNome) {
      const clienteRef = ref(db, `clientes/${clienteSelecionadoId}`);
      try {
        await update(clienteRef, { nome: novoNome });
      } catch (e) {
        alert("Erro ao atualizar nome.");
      }
    }
    menuContextual.style.display = "none";
  };

  const btnExcluir = document.createElement("button");
  btnExcluir.textContent = "🗑️ Excluir";
  btnExcluir.style.display = "block";
  btnExcluir.style.marginTop = "6px";
  btnExcluir.onclick = async () => {
    if (confirm(`Excluir cliente "${clienteSelecionadoNome}"?`)) {
      await remove(ref(db, `clientes/${clienteSelecionadoId}`));
    }
    menuContextual.style.display = "none";
  };

  menuContextual.appendChild(btnEditar);
  menuContextual.appendChild(btnExcluir);
  document.body.appendChild(menuContextual);
}
criarMenuContextual();

document.addEventListener("click", () => {
  menuContextual.style.display = "none";
});

function adicionarEventosContextuais(li, id, nome) {
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    clienteSelecionadoId = id;
    clienteSelecionadoNome = nome;
    mostrarMenuContextual(e.pageX, e.pageY);
  });

  li.addEventListener("touchstart", (e) => {
    longPressTimer = setTimeout(() => {
      clienteSelecionadoId = id;
      clienteSelecionadoNome = nome;
      mostrarMenuContextual(e.touches[0].pageX, e.touches[0].pageY);
    }, 700);
  });

  li.addEventListener("touchend", () => clearTimeout(longPressTimer));
  li.addEventListener("touchmove", () => clearTimeout(longPressTimer));
}

function mostrarMenuContextual(x, y) {
  menuContextual.style.left = x + "px";
  menuContextual.style.top = y + "px";
  menuContextual.style.display = "block";
}