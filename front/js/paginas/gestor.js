import { fmt, getRandomHour } from "../utils.js";
import { CATEGORIAS, VENDEDORES, RESERVAS } from "../data.js";

let currentProdutos = [];
let setProdutosCallback = null;
let currentVendas = [];
let setVendasCallback = null;
let currentUser = null;

export function initGestorPages(produtos, setProdutos, vendas, setVendas, user) {
  currentProdutos = produtos;
  setProdutosCallback = setProdutos;
  currentVendas = vendas;
  setVendasCallback = setVendas;
  currentUser = user;
}

export function renderDashboard(el) {
  const hoje = currentVendas.filter((v) => v.data === new Date().toISOString().split("T")[0]);
  const totalHoje = hoje.reduce((s, v) => s + v.total, 0);
  const lucroHoje = hoje.reduce((s, v) => s + v.lucro, 0);
  const stockDebilitado = currentProdutos.filter((p) => p.stock <= p.stockMin).length;

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-house" style="margin-right:8px"></i> Dashboard</div>
      <div class="page-sub">Visão geral rápida do stock e vendas</div>
    </div>
    <div class="cards-row cols4">
      <div class="card"><div class="card-title">Receita Hoje</div><div class="metric green">${fmt(totalHoje)}</div><div class="metric-sub">${hoje.length} vendas</div></div>
      <div class="card"><div class="card-title">Lucro Hoje</div><div class="metric blue">${fmt(lucroHoje)}</div><div class="metric-sub">Margem ${totalHoje ? Math.round((lucroHoje / totalHoje) * 100) : 0}%</div></div>
      <div class="card"><div class="card-title">Stock baixo</div><div class="metric ${stockDebilitado > 0 ? "amber" : "green"}">${stockDebilitado}</div><div class="metric-sub">produtos abaixo do mínimo</div></div>
      <div class="card"><div class="card-title">Base de produtos</div><div class="metric">${currentProdutos.length}</div><div class="metric-sub">${currentProdutos.filter((p) => p.stock > 0).length} em stock</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Últimas vendas</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Vendedor</th><th>Total</th><th>Lucro</th></tr></thead>
          <tbody>${hoje.slice(0, 8).map((v) => `
            <tr>
              <td>${v.data}</td>
              <td>${v.vendedor}</td>
              <td style="color:var(--accent)">${fmt(v.total)}</td>
              <td style="color:var(--green)">${fmt(v.lucro)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderCadastrar(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-plus" style="margin-right:8px"></i> Cadastrar Produtos</div>
      <div class="page-sub">Adicione itens ao inventário</div>
    </div>
    <div class="card">
      <div class="card-title">Novo produto</div>
      <div class="form-row cols3">
        <div class="field"><label>Nome</label><input id="p-nome" placeholder="Produto"/></div>
        <div class="field"><label>Categoria</label><select id="p-cat">${CATEGORIAS.map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div class="field"><label>Preço venda</label><input type="number" id="p-preco" placeholder="0.00"/></div>
      </div>
      <div class="form-row cols3">
        <div class="field"><label>Custo</label><input type="number" id="p-custo" placeholder="0.00"/></div>
        <div class="field"><label>Stock inicial</label><input type="number" id="p-stock" placeholder="0"/></div>
        <div class="field"><label>Stock mínimo</label><input type="number" id="p-stockmin" placeholder="10"/></div>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="btn btn-green" onclick="window.cadastrarProdutoWrapper()">Cadastrar produto</button></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">Produtos cadastrados</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Categoria</th><th>Stock</th><th>Preço</th><th>Ações</th></tr></thead>
          <tbody>${currentProdutos.map((p) => `
            <tr>
              <td>${p.nome}</td>
              <td>${p.categoria || p.cat || "Outros"}</td>
              <td>${p.stock}</td>
              <td>${fmt(p.preco)}</td>
              <td><button class="btn btn-sm btn-amber" onclick="window.reporStockWrapper(${p.id})">Repor</button> <button class="btn btn-sm btn-red" onclick="window.removerProdutoWrapper(${p.id})">Apagar</button></td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

window.cadastrarProdutoWrapper = async function() {
  if (!currentUser?.id) {
    alert("Utilizador não autenticado.");
    return;
  }
  const nome = document.getElementById("p-nome").value.trim();
  const categoria = document.getElementById("p-cat").value;
  const preco = Number(document.getElementById("p-preco").value) || 0;
  const preco_custo = Number(document.getElementById("p-custo").value) || 0;
  const stock = Number(document.getElementById("p-stock").value) || 0;
  const stockMin = Number(document.getElementById("p-stockmin").value) || 10;
  if (!nome || preco <= 0) {
    alert("Informe nome e preço de venda.");
    return;
  }
  try {
    await window.api.addProduto({ nome, categoria, preco, preco_custo, stock, stockMin, usuario_id: currentUser.id });
    const produtosAtualizados = await window.api.getProdutos();
    setProdutosCallback(produtosAtualizados);
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao cadastrar produto.");
  }
};

window.reporStockWrapper = async function(id) {
  if (!currentUser?.id) {
    alert("Utilizador não autenticado.");
    return;
  }
  const qty = Number(prompt("Quantidade para repor", "50"));
  if (!qty || qty <= 0) return;
  try {
    await window.api.addMovimento({ produto_id: id, quantidade: qty, tipo: "entrada", usuario_id: currentUser.id, observacao: "Reposição de stock", status_pagamento: "pago" });
    const produtosAtualizados = await window.api.getProdutos();
    setProdutosCallback(produtosAtualizados);
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao repor stock.");
  }
};

window.removerProdutoWrapper = async function(id) {
  if (!currentUser?.id) {
    alert("Utilizador não autenticado.");
    return;
  }
  if (!confirm("Confirma remoção deste produto?")) return;
  try {
    await window.api.deleteProduto({ id, usuario_id: currentUser.id });
    const produtosAtualizados = await window.api.getProdutos();
    setProdutosCallback(produtosAtualizados);
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao apagar produto.");
  }
};

export function renderStock(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-box" style="margin-right:8px"></i> Nível de Stock</div>
      <div class="page-sub">Gerencie quantidades de produtos</div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Produtos em stock</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Stock</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${currentProdutos.map((p) => {
            const status = p.stock === 0 ? "Esgotado" : p.stock <= p.stockMin ? "Baixo" : "OK";
            return `
            <tr>
              <td>${p.nome}</td>
              <td>${p.stock}</td>
              <td>${p.stockMin}</td>
              <td>${status}</td>
              <td><button class="btn btn-sm btn-amber" onclick="window.reporStockWrapper(${p.id})">Repor</button></td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderFinancas(el) {
  const vendasHoje = currentVendas.filter((v) => v.data === new Date().toISOString().split("T")[0]);
  const total = vendasHoje.reduce((s, v) => s + v.total, 0);
  const lucro = vendasHoje.reduce((s, v) => s + v.lucro, 0);
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-money-bill-wave" style="margin-right:8px"></i> Finanças</div>
      <div class="page-sub">Resumo financeiro diário</div>
    </div>
    <div class="cards-row cols3">
      <div class="card"><div class="card-title">Receita Hoje</div><div class="metric green">${fmt(total)}</div></div>
      <div class="card"><div class="card-title">Lucro Hoje</div><div class="metric blue">${fmt(lucro)}</div></div>
      <div class="card"><div class="card-title">Transacções</div><div class="metric">${vendasHoje.length}</div></div>
    </div>
    <div class="card" style="margin-top:20px"><div class="card-header"><div class="card-title">Histórico de vendas de hoje</div></div><div class="table-wrap"><table><thead><tr><th>Hora</th><th>Vendedor</th><th>Total</th></tr></thead><tbody>${vendasHoje.map((v, idx) => `<tr><td>${getRandomHour(idx)}</td><td>${v.vendedor}</td><td>${fmt(v.total)}</td></tr>`).join("")}</tbody></table></div></div>
  `;
}

export function renderPontoVenda(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-user-group" style="margin-right:8px"></i> Ponto de Venda</div>
      <div class="page-sub">Visão rápida dos vendedores e vendas</div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Vendedores ativos</div></div>
      <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Login</th><th>Ativo</th><th>Vendas</th></tr></thead><tbody>${VENDEDORES.map((v) => `<tr><td>${v.nome}</td><td>${v.user}</td><td>${v.activo ? "Sim" : "Não"}</td><td>${v.vendas}</td></tr>`).join("")}</tbody></table></div>
    </div>
  `;
}

export function renderEstatisticas(el) {
  const totalVendas = currentVendas.length;
  const totalProdutos = currentProdutos.length;
  const totalStock = currentProdutos.reduce((s, p) => s + (p.stock || 0), 0);
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-chart-line" style="margin-right:8px"></i> Estatísticas</div>
      <div class="page-sub">Principais indicadores de desempenho</div>
    </div>
    <div class="cards-row cols4">
      <div class="card"><div class="card-title">Vendas totais</div><div class="metric">${totalVendas}</div></div>
      <div class="card"><div class="card-title">Produtos registados</div><div class="metric">${totalProdutos}</div></div>
      <div class="card"><div class="card-title">Total de stock</div><div class="metric">${totalStock}</div></div>
      <div class="card"><div class="card-title">Stock baixo</div><div class="metric amber">${currentProdutos.filter((p) => p.stock <= p.stockMin).length}</div></div>
    </div>
  `;
}

export function renderReservasG(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-clipboard" style="margin-right:8px"></i> Reservas</div>
      <div class="page-sub">Lista de reservas do cliente</div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Reservas recentes</div></div>
      <div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Data</th><th>Produtos</th><th>Status</th></tr></thead><tbody>${RESERVAS.map((r) => `<tr><td>${r.titular}</td><td>${r.data}</td><td>${r.produtos.map((p) => `${p.nome} x${p.qty}`).join(", ")}</td><td>${r.status}</td></tr>`).join("")}</tbody></table></div>
    </div>
  `;
}

export function renderDefinicoes(el) {
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-gear" style="margin-right:8px"></i> Definições</div>
      <div class="page-sub">Configurações gerais da aplicação</div>
    </div>
    <div class="card">
      <div class="card-title">Preferências</div>
      <div class="field"><label>Modo de exibição</label><select><option>Claro</option><option>Escuro</option></select></div>
      <div class="field"><label>Idioma</label><select><option>Português</option><option>English</option></select></div>
    </div>
  `;
}
