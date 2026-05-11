import { PRODUTOS, VENDAS } from "./data.js";
import { STATE, setDataCallbacks, navigateTo, PAGES, setInitVendedorCallback, initGestorPages } from "./app.js";
import { initCartHelpers, renderCart } from "./paginas/helpers.js";
import { initVendedorPages } from "./paginas/vendedor.js";
import { initSuperPages } from "./paginas/super.js";
import { debounce } from "./utils.js";

// Estado reativo (simplificado)
let currentProdutos = [...PRODUTOS];
let currentVendas = [...VENDAS];

// Wrappers para atualizar estado
function setProdutos(newProdutos) {
  currentProdutos = newProdutos;
  PRODUTOS.length = 0;
  PRODUTOS.push(...newProdutos);
  const ca = document.getElementById("content-area");
  if (ca && STATE.currentPage && PAGES[STATE.currentPage]) {
    ca.innerHTML = "";
    PAGES[STATE.currentPage](ca);
  }
}

function setVendas(newVendas) {
  currentVendas = newVendas;
  VENDAS.length = 0;
  VENDAS.push(...newVendas);
}

function setCart(newCart) {
  STATE.cart = newCart;
  renderCart();
}

const formatSaleFromMovement = (movement) => {
  const data = movement.criado_em ? movement.criado_em.split("T")[0] : movement.data?.split(" ")[0] || "";
  const quantidade = Number(movement.quantidade || 0);
  const precoUnitario = Number(movement.preco_unitario || 0);
  const custoUnitario = Number(movement.produto_preco_custo || 0);
  const total = Number(movement.total || precoUnitario * quantidade);

  return {
    id: movement.id,
    data,
    vendedor: movement.usuario_nome || "—",
    produtos: [
      {
        nome: movement.produto_nome || "—",
        qty: quantidade,
        preco: precoUnitario,
      },
    ],
    total,
    lucro: Math.max(0, total - custoUnitario * quantidade),
  };
};

const syncBackendData = async () => {
  if (!window.api) return;

  try {
    const produtos = await window.api.getProdutos();
    setProdutos(produtos);
  } catch (error) {
    console.error("Erro ao carregar produtos do backend:", error);
  }

  try {
    const movimentos = await window.api.getMovimentos();
    const vendas = movimentos.filter((m) => m.tipo === "venda").map(formatSaleFromMovement);
    setVendas(vendas);
  } catch (error) {
    console.error("Erro ao carregar vendas do backend:", error);
  }
};

function initVendedorAfterLogin(user) {
  initVendedorPages(STATE.cart, setCart, currentProdutos, setProdutos, user, currentVendas, setVendas);
  initGestorPages(currentProdutos, setProdutos, currentVendas, setVendas, user);
}

setDataCallbacks(currentProdutos, setProdutos, currentVendas, setVendas);
setInitVendedorCallback(async (user) => {
  await syncBackendData();
  initVendedorAfterLogin(user);
});
initCartHelpers(STATE.cart, setCart);
initGestorPages(currentProdutos, setProdutos, currentVendas, setVendas, null);
initSuperPages();

window.debounce = debounce;

window.fetchProductImageWrapper = async function() {
  const name = (document.getElementById("p-nome") || {}).value || "";
  const input = document.getElementById("p-image") || {};
  const preview = document.getElementById("p-image-preview");
  if (!preview || !input) return;
  let url = input.value && input.value.trim();
  if (!url && name) {
    url = `https://source.unsplash.com/400x300/?${encodeURIComponent(name)}`;
  }
  const saveBtn = document.getElementById("p-save-local");
  if (!url) {
    preview.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
    return;
  }
  preview.src = url;
  preview.style.display = "block";
  if (saveBtn) saveBtn.style.display = "inline-flex";
  input.value = url;
};

window.saveImageToDiskWrapper = async function() {
  try {
    const url = (document.getElementById("p-image") || {}).value;
    if (!url) return alert("Nenhuma imagem para salvar");
    const resp = await fetch(url);
    if (!resp.ok) return alert("Falha ao baixar a imagem");
    const blob = await resp.blob();
    const nomeBase = ((document.getElementById("p-nome") || {}).value || "image").replace(/[^a-z0-9\-]/gi, "_");
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    const fileName = `${nomeBase}.${ext}`;

    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: "Image", accept: { [blob.type]: ["." + ext] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      alert("Imagem salva: " + handle.name);
      return;
    }

    if (window.showDirectoryPicker) {
      const dir = await window.showDirectoryPicker();
      const fh = await dir.getFileHandle(fileName, { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
      alert("Imagem salva: " + fileName);
      return;
    }

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    alert("Download iniciado: " + fileName);
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar imagem: " + e.message);
  }
};

(function attachAutoImage() {
  const nameEl = document.getElementById("p-nome");
  const auto = document.getElementById("p-autoimage");
  if (!nameEl || !auto) return;
  const deb = debounce(() => {
    if (auto.checked) window.fetchProductImageWrapper();
  }, 600);
  nameEl.addEventListener("input", deb);
})();

document.addEventListener("click", (e) => {
  if (e.target.id === "modal-overlay") window.closeModal();
});

console.log("BizController 360 inicializado!");
