
const linkParcelado = document.createElement("a");
linkParcelado.href = `parcelado.html?id=${idCliente}`;
linkParcelado.textContent = "Parcelado";
linkParcelado.classList.add("botao-navegacao");
document.querySelector(".botoes-navegacao").appendChild(linkParcelado);
