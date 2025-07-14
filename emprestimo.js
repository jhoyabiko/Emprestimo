import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
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

  if (valor > 0 && data) {
    push(ref(db, `clientes/${idCliente}/emprestimos`), {
      valor,
      data
    }).then(() => {
      alert("Empréstimo registrado!");
      document.getElementById("valor").value = "";
      document.getElementById("data").value = "";
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
  if (!clienteSnap.exists()) {
    titulo.innerText = "Cliente não encontrado";
    lista.innerHTML = "<li>Erro ao carregar dados.</li>";
    return;
  }

  const cliente = clienteSnap.val();
  titulo.innerText = `Empréstimos de ${cliente.nome}`;

  lista.innerHTML = "";

  if (!cliente.emprestimos) {
    lista.innerHTML = "<li>Nenhum empréstimo encontrado.</li>";
    return;
  }

  for (const [idEmp, emp] of Object.entries(cliente.emprestimos)) {
    const li = document.createElement("li");
    li.innerHTML = `
      Valor: R$ ${parseFloat(emp.valor).toFixed(2)}<br>
      Data: ${emp.data}
    `;
    lista.appendChild(li);
  }
}

carregarEmprestimos();
