import { fmt, destroyCharts } from "../utils.js";
import { PRODUTOS, CATEGORIAS, RESERVAS, addReserva, updateProdutoStock } from "../data.js";
import { alertaStock, addToCart, changeQty, renderCart, confirmarVenda } from "./helpers.js";

let currentCart = [];
let setCartCallback = null;
let currentProdutos = PRODUTOS;
let setProdutosCallback = null;
let currentUser = null;
let setVendasCallback = null;
let currentVendas = null;

export function initVendedorPages(cart, setCart, produtos, setProdutos, user, vendas, setVendas) {
  currentCart = cart;
  setCartCallback = setCart;
  currentProdutos = produtos;
  setProdutosCallback = setProdutos;
  currentUser = user;
  currentVendas = vendas;
  setVendasCallback = setVendas;
}

export function renderVender(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-credit-card" style="margin-right:8px"></i> Efectuar Venda</div>
      <div class="page-sub">Seleccione os produtos e confirme a venda</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
      <div>
        <div style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap" id="cat-filters">
          <button class="btn btn-blue btn-sm cat-btn active" data-cat="Todos" onclick="window.filterCat('Todos',this)">Todos</button>
          ${CATEGORIAS.map((c) => `<button class="btn btn-sm cat-btn" data-cat="${c}" onclick="window.filterCat('${c}',this)" style="background:var(--bg3);border:1px solid var(--border);color:var(--text2)">${c}</button>`).join("")}
        </div>
        <div class="product-grid" id="prod-grid"></div>
      </div>
      <div>
        <div class="cart-area">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px;margin-bottom:16px"><i class="fa-solid fa-cart-shopping" style="margin-right:8px"></i> Carrinho</div>
          <div id="cart-items"><div class="empty-state" style="padding:20px"><div class="es-icon"><i class="fa-solid fa-cart-shopping"></i></div><div>Nenhum item</div></div></div>
          <div class="divider"></div>
          <div id="cart-total" style="display:flex;justify-content:space-between;font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:var(--accent)">
            <span>Total</span><span>MT 0.00</span>
          </div>
          <button class="btn btn-green" style="width:100%;justify-content:center;margin-top:14px;padding:13px" onclick="window.confirmarVendaWrapper()"><i class="fa-solid fa-check" style="margin-right:8px"></i> Confirmar Venda</button>
        </div>
        ${alertaStock()}
      </div>
    </div>
  `;
  renderProdGrid("Todos");
  renderCart();
}

function renderProdGrid(cat) {
  const grid = document.getElementById("prod-grid");
  if (!grid) return;
  const list = cat === "Todos" ? currentProdutos : currentProdutos.filter((p) => p.cat === cat);
  grid.innerHTML = list.map((p) => {
    const oos = p.stock === 0;
    const low = p.stock > 0 && p.stock <= p.stockMin;
    const inCart = currentCart.find((c) => c.id === p.id);
    return `<div class="product-card${oos ? " out-of-stock" : ""}${inCart ? " selected" : ""}" onclick="${oos ? "" : `window.addToCartWrapper(${p.id})`}">
      <div class="prod-icon">${p.image ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:contain;border-radius:6px">` : p.icon}</div>
      <div class="prod-name">${p.nome}</div>
      <div class="prod-price">${fmt(p.preco)}</div>
      <div class="prod-stock ${oos ? "stock-out" : low ? "stock-low" : "stock-ok"}">
        ${oos ? '<i class="fa-solid fa-ban" style="margin-right:6px"></i> Esgotado' : low ? `<i class="fa-solid fa-triangle-exclamation" style="margin-right:6px"></i> Baixo: ${p.stock}` : `<i class="fa-solid fa-check" style="margin-right:6px"></i> Stock: ${p.stock}`}
      </div>
      ${inCart ? `<div style="position:absolute;top:8px;right:8px;background:var(--accent);color:#0a0e17;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${inCart.qty}</div>` : ""}
    </div>`;
  }).join("");
}

window.filterCat = function(cat, btn) {
  document.querySelectorAll(".cat-btn").forEach((b) => {
    b.style.background = "var(--bg3)";
    b.style.color = "var(--text2)";
    b.style.borderColor = "var(--border)";
    b.classList.remove("active");
  });
  btn.style.background = "rgba(0,150,255,.15)";
  btn.style.color = "var(--accent2)";
  btn.style.borderColor = "rgba(0,150,255,.3)";
  btn.classList.add("active");
  renderProdGrid(cat);
};

window.addToCartWrapper = function(id) {
  const newCart = addToCart(id, currentCart, setCartCallback, currentProdutos);
  if (setCartCallback) setCartCallback(newCart);
  renderProdGrid(document.querySelector(".cat-btn.active")?.dataset.cat || "Todos");
};

window.changeQtyWrapper = function(id, delta) {
  const newCart = changeQty(id, delta, currentCart, setCartCallback, currentProdutos);
  if (setCartCallback) setCartCallback(newCart);
  renderProdGrid(document.querySelector(".cat-btn.active")?.dataset.cat || "Todos");
};

window.confirmarVendaWrapper = function() {
  confirmarVenda(currentCart, setCartCallback, currentUser, currentVendas, setVendasCallback, currentProdutos, setProdutosCallback, window.closeModal, window.showModalWrapper);
};

export function renderProdutosV(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-box" style="margin-right:8px"></i> Produtos Disponíveis</div>
      <div class="page-sub">Lista de todos os produtos e seus stocks</div>
    </div>
    ${alertaStock()}
    <div class="card" style="margin-top:16px">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Stock</th><th>Estado</th></tr></thead>
          <tbody>
            ${currentProdutos.map((p) => {
              const oos = p.stock === 0;
              const low = p.stock > 0 && p.stock <= p.stockMin;
              return `<tr>
                <td><span style="font-size:18px;margin-right:8px">${p.icon}</span><strong>${p.nome}</strong></td>
                <td><span class="tag">${p.cat}</span></td>
                <td style="color:var(--accent);font-weight:600">${fmt(p.preco)}</td>
                <td style="font-weight:600">${p.stock}</td>
                <td><span class="badge ${oos ? "red" : low ? "amber" : "green"}">${oos ? "Esgotado" : low ? "Stock Baixo" : "Disponível"}</span></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderReservar(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-clipboard" style="margin-right:8px"></i> Reservar Produtos</div>
      <div class="page-sub">Acumular material para um cliente</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Nova Reserva</div>
        <div class="form-row"><div class="field"><label>Nome do Titular</label><input id="r-nome" placeholder="Nome completo"/></div></div>
        <div class="form-row"><div class="field"><label>Número de BI</label><input id="r-bi" placeholder="ex: 12345678A"/></div></div>
        <div class="form-row cols2">
          <div class="field"><label>Produto</label>
            <select id="r-prod">${currentProdutos.filter((p) => p.stock > 0).map((p) => `<option value="${p.id}">${p.icon} ${p.nome} (${p.stock}un)</option>`).join("")}</select>
          </div>
          <div class="field"><label>Quantidade</label><input type="number" id="r-qty" value="1" min="1"/></div>
        </div>
        <button class="btn btn-blue" onclick="window.criarReservaWrapper()"><i class="fa-solid fa-clipboard" style="margin-right:8px"></i> Criar Reserva</button>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Reservas Activas</div>
        ${RESERVAS.filter((r) => r.status === "Activa").map((r) => `
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--sm-r);padding:14px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong>${r.titular}</strong><span class="badge blue">${r.status}</span>
            </div>
            <div style="font-size:12px;color:var(--text2)">BI: ${r.bi} • ${r.data}</div>
            <div style="margin-top:8px;font-size:13px">${r.produtos.map((p) => `${p.nome} x${p.qty}`).join(", ")}</div>
            <button class="btn btn-sm btn-green" style="margin-top:8px" onclick="window.levantarReservaWrapper(${r.id})"><i class="fa-solid fa-check" style="margin-right:6px"></i> Levantar</button>
          </div>
        `).join("") || '<div class="empty-state"><div class="es-icon"><i class="fa-solid fa-clipboard"></i></div><div>Sem reservas activas</div></div>'}
      </div>
    </div>
  `;
}

window.criarReservaWrapper = function() {
  const nome = document.getElementById("r-nome").value.trim();
  const bi = document.getElementById("r-bi").value.trim();
  const pid = parseInt(document.getElementById("r-prod").value);
  const qty = parseInt(document.getElementById("r-qty").value);
  if (!nome || !bi) {
    alert("Preencha todos os campos");
    return;
  }
  const prod = currentProdutos.find((p) => p.id === pid);
  if (!prod || qty > prod.stock) {
    alert("Stock insuficiente");
    return;
  }
  addReserva({
    id: Date.now(),
    titular: nome,
    bi,
    data: "2026-05-04",
    produtos: [{ nome: prod.nome, qty }],
    status: "Activa",
  });
  const newProdutos = currentProdutos.map(p =>
    p.id === pid ? { ...p, stock: p.stock - qty } : p
  );
  setProdutosCallback(newProdutos);
  window.location.reload();
};

window.levantarReservaWrapper = function(id) {
  const r = RESERVAS.find((x) => x.id === id);
  if (r) r.status = "Levantada";
  window.location.reload();
};