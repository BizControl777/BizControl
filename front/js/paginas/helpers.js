import { fmt } from "../utils.js";

let STATE_CART = [];
let setCartCallback = null;

export function initCartHelpers(cart, setCart) {
  STATE_CART = cart;
  setCartCallback = setCart;
}

export function showModal(html, onConfirm) {
  const modalOverlay = document.getElementById("modal-overlay");
  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = html;
  modalOverlay.classList.remove("hidden");

  if (onConfirm) {
    const confirmBtn = modalBody.querySelector("#confirm-modal-btn");
    if (confirmBtn) confirmBtn.onclick = onConfirm;
  }
}

export function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

export function alertaStock(produtos = []) {
  const low = produtos.filter((p) => p.stock > 0 && p.stock <= p.stockMin);
  const oos = produtos.filter((p) => p.stock === 0);
  if (!low.length && !oos.length) return "";
  return `<div style="margin-top:14px">
    ${oos.map((p) => `<div class="alert-card alert-red"><i class='fa-solid fa-ban' style='margin-right:8px'></i> ${p.nome} — Esgotado!</div>`).join("")}
    ${low.map((p) => `<div class="alert-card alert-amber"><i class='fa-solid fa-triangle-exclamation' style='margin-right:8px'></i> ${p.nome} — Stock baixo (${p.stock} un.)</div>`).join("")}
  </div>`;
}

export function renderCart() {
  const ci = document.getElementById("cart-items");
  const ct = document.getElementById("cart-total");
  if (!ci || !setCartCallback) return;

  if (!STATE_CART.length) {
    ci.innerHTML = '<div class="empty-state" style="padding:20px"><div class="es-icon"><i class="fa-solid fa-cart-shopping"></i></div><div>Nenhum item</div></div>';
    ct.innerHTML = "<span>Total</span><span>MT 0.00</span>";
    return;
  }

  ci.innerHTML = STATE_CART.map((c) => `
    <div class="cart-item">
      <div><span style="font-size:18px">${c.icon}</span> <span style="font-size:13px;font-weight:500">${c.nome}</span></div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="window.changeQty(${c.id},-1)">−</button>
          <span style="font-size:13px;font-weight:600;min-width:16px;text-align:center">${c.qty}</span>
          <button class="qty-btn" onclick="window.changeQty(${c.id},1)">+</button>
        </div>
        <span style="color:var(--accent);font-weight:600;min-width:70px;text-align:right">${fmt(c.preco * c.qty)}</span>
      </div>
    </div>
  `).join("");

  const total = STATE_CART.reduce((s, c) => s + c.preco * c.qty, 0);
  ct.innerHTML = `<span>Total</span><span>${fmt(total)}</span>`;
}

export function addToCart(id, cart, setCart, produtos) {
  const p = produtos.find((x) => x.id === id);
  if (!p || p.stock === 0) return;
  const ex = cart.find((x) => x.id === id);
  let newCart;
  if (ex) {
    if (ex.qty < p.stock) {
      newCart = cart.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x));
    } else {
      newCart = cart;
    }
  } else {
    newCart = [...cart, { id, nome: p.nome, preco: p.preco, custo: p.preco_custo || 0, qty: 1, icon: p.icon || "<i class='fa-solid fa-box'></i>" }];
  }
  setCart(newCart);
  renderCart();
  return newCart;
}

export function changeQty(id, delta, cart, setCart, produtos) {
  const ex = cart.find((x) => x.id === id);
  if (!ex) return cart;
  const p = produtos.find((x) => x.id === id);
  let newQty = ex.qty + delta;
  newQty = Math.max(0, Math.min(newQty, p.stock));

  let newCart;
  if (newQty === 0) {
    newCart = cart.filter((x) => x.id !== id);
  } else {
    newCart = cart.map((x) => (x.id === id ? { ...x, qty: newQty } : x));
  }
  setCart(newCart);
  renderCart();
  return newCart;
}

export async function confirmarVenda(cart, setCart, user, vendas, setVendas, produtos, setProdutos, closeModal, showModal) {
  if (!cart.length) {
    alert("Carrinho vazio!");
    return;
  }
  if (!user?.id) {
    alert("Utilizador não autenticado.");
    return;
  }

  const total = cart.reduce((s, c) => s + c.preco * c.qty, 0);
  const lucro = cart.reduce((s, c) => s + (c.preco - c.custo) * c.qty, 0);

  const finalizar = async () => {
    try {
      await Promise.all(
        cart.map((c) =>
          window.api.addMovimento({
            produto_id: c.id,
            quantidade: c.qty,
            tipo: "venda",
            usuario_id: user.id,
            observacao: "Venda via POS",
            forma_pagamento: "dinheiro",
            status_pagamento: "pago",
          })
        )
      );
      const produtosAtualizados = await window.api.getProdutos();
      setProdutos(produtosAtualizados);
      const venda = {
        id: Date.now(),
        data: new Date().toISOString().split("T")[0],
        vendedor: user.nome,
        produtos: cart.map((c) => ({ nome: c.nome, qty: c.qty, preco: c.preco })),
        total,
        lucro,
      };
      setVendas([venda, ...vendas]);
      setCart([]);
      closeModal();
      showModal(`
        <div class="modal-title"><i class="fa-solid fa-circle-check" style="margin-right:8px"></i> Venda Registada!</div>
        <div class="alert-card alert-green" style="margin-bottom:16px"><i class='fa-solid fa-check' style='margin-right:8px'></i> Venda de ${fmt(total)} registada com sucesso!</div>
        <div style="font-size:13px;color:var(--text2)">Lucro desta venda: <strong style="color:var(--accent)">${fmt(lucro)}</strong></div>
        <div class="modal-footer"><button class="btn btn-green" onclick="window.location.reload()">Nova Venda</button></div>
      `, null);
    } catch (error) {
      console.error("Erro ao registar venda:", error);
      alert(error?.message || "Falha ao registar venda.");
    }
  };

  showModal(`
    <div class="modal-title"><i class="fa-solid fa-check" style="margin-right:8px"></i> Confirmar Venda</div>
    <div class="receipt">
      ${cart.map((c) => `<div class="receipt-row"><span>${c.icon} ${c.nome} x${c.qty}</span><span>${fmt(c.preco * c.qty)}</span></div>`).join("")}
      <div class="receipt-row"><span>TOTAL</span><span>${fmt(total)}</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="window.closeModal()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text2)">Cancelar</button>
      <button class="btn btn-green" id="confirm-modal-btn"><i class="fa-solid fa-check" style="margin-right:8px"></i> Finalizar</button>
    </div>
  `, finalizar);
}

export function reporStock(id, produtos, setProdutos, showModal, closeModal) {
  const p = produtos.find((x) => x.id === id);
  if (!p) return;

  const confirmarRestock = async () => {
    const qty = parseInt(document.getElementById("restock-qty").value) || 0;
    if (qty > 0) {
      try {
        await window.api.addMovimento({
          produto_id: id,
          quantidade: qty,
          tipo: "entrada",
          usuario_id: window.STATE?.user?.id || null,
          observacao: "Reposição de stock",
          status_pagamento: "pago",
        });
        const produtosAtualizados = await window.api.getProdutos();
        setProdutos(produtosAtualizados);
      } catch (error) {
        console.error("Erro ao repor stock:", error);
        alert(error?.message || "Falha ao repor stock.");
      }
    }
    closeModal();
  };

  showModal(`
    <div class="modal-title"><i class='fa-solid fa-box' style='margin-right:8px'></i> Repor Stock — ${p.nome}</div>
    <div class="field" style="margin-bottom:16px"><label>Quantidade a adicionar</label><input type="number" id="restock-qty" value="50" min="1" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--sm-r);padding:10px;color:var(--text)"/></div>
    <div style="font-size:13px;color:var(--text2)">Stock actual: <strong>${p.stock}</strong></div>
    <div class="modal-footer">
      <button class="btn" onclick="window.closeModal()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text2)">Cancelar</button>
      <button class="btn btn-green" id="confirm-modal-btn"><i class="fa-solid fa-check" style="margin-right:6px"></i> Repor</button>
    </div>
  `, confirmarRestock);
}
