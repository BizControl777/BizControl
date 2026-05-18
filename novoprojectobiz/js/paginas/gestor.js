import { fmt, getRandomHour } from "../utils.js";
import { CATEGORIAS, VENDEDORES, RESERVAS } from "../data.js";
import { UNIDADES_MEDIDA, calcularLucro, custoUnitarioFromCaixa, safeNum } from "../produtos-calc.js";
import { openEditStockModal } from "./helpers.js";

let currentProdutos = [];
let setProdutosCallback = null;
let currentVendas = [];
let setVendasCallback = null;
let currentUser = null;
let currentCategorias = [...CATEGORIAS];

export function initGestorPages(produtos, setProdutos, vendas, setVendas, user) {
  currentProdutos = produtos;
  setProdutosCallback = setProdutos;
  currentVendas = vendas;
  setVendasCallback = setVendas;
  currentUser = user;
}

async function refreshProdutos() {
  const produtosAtualizados = await window.api.getProdutos();
  currentProdutos = produtosAtualizados;
  setProdutosCallback(produtosAtualizados);
  return produtosAtualizados;
}

async function loadCategorias() {
  try {
    if (window.api?.getCategorias) {
      const rows = await window.api.getCategorias();
      if (rows.length) {
        currentCategorias = rows.map((r) => r.nome);
        return;
      }
    }
  } catch (e) {
    console.warn("Categorias via API indisponíveis, usando lista local.", e);
  }
  currentCategorias = [...new Set([...CATEGORIAS, ...currentProdutos.map((p) => p.categoria || p.cat).filter(Boolean)])];
}

function reRenderActiveGestorPage() {
  const contentArea = document.getElementById("content-area");
  const page = window.STATE?.currentPage;
  if (!contentArea || !page) return;
  if (page === "cadastrar") void renderCadastrar(contentArea);
  else if (page === "stock") renderStock(contentArea);
}

function getFormLucroValues() {
  const precoCompraCaixa = safeNum(document.getElementById("p-preco-caixa")?.value);
  const qtdPorCaixa = safeNum(document.getElementById("p-qtd-caixa")?.value, 1);
  const precoVendaUnidade = safeNum(document.getElementById("p-preco-unidade")?.value);
  const precoVendaCaixa = safeNum(document.getElementById("p-preco-venda-caixa")?.value);
  return calcularLucro({ precoCompraCaixa, qtdPorCaixa, precoVendaUnidade, precoVendaCaixa });
}

function updateLucroPreview() {
  const lucro = getFormLucroValues();
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof val === "number" ? fmt(val) : val;
  };
  set("lucro-custo-unit", lucro.custoPorUnidade);
  set("lucro-por-unidade", lucro.lucroPorUnidade);
  set("lucro-por-caixa", lucro.lucroPorCaixa);
  const margemEl = document.getElementById("lucro-margem");
  if (margemEl) margemEl.textContent = `${lucro.margemPercent}%`;
  const aviso = document.getElementById("lucro-aviso");
  if (aviso) {
    aviso.style.display = lucro.lucroPorUnidade < 0 ? "block" : "none";
  }

  const precoCxInput = document.getElementById("p-preco-venda-caixa");
  if (precoCxInput && !precoCxInput.dataset.userEdited) {
    const unit = safeNum(document.getElementById("p-preco-unidade")?.value);
    const qtd = Math.max(1, safeNum(document.getElementById("p-qtd-caixa")?.value, 1));
    if (unit > 0) precoCxInput.value = roundInput(unit * qtd);
  }
}

function roundInput(n) {
  const v = Math.round(safeNum(n) * 100) / 100;
  return Number.isFinite(v) ? v : "";
}

function initProdutoFormListeners() {
  const ids = ["p-preco-caixa", "p-qtd-caixa", "p-preco-unidade", "p-preco-venda-caixa"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      if (id === "p-preco-venda-caixa") el.dataset.userEdited = "1";
      updateLucroPreview();
    });
  });

  const unidade = document.getElementById("p-unidade");
  const tamanhoField = document.getElementById("p-tamanho-field");
  if (unidade && tamanhoField) {
    const toggleTamanho = () => {
      const show = unidade.value === "Tamanho" || unidade.value === "Outros";
      tamanhoField.style.display = show ? "block" : "none";
    };
    unidade.addEventListener("change", toggleTamanho);
    toggleTamanho();
  }

  updateLucroPreview();
}

function buildCategoriaOptions() {
  return currentCategorias.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
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
          <tbody>${hoje
            .slice(0, 8)
            .map(
              (v) => `
            <tr>
              <td>${v.data}</td>
              <td>${v.vendedor}</td>
              <td style="color:var(--accent)">${fmt(v.total)}</td>
              <td style="color:var(--green)">${fmt(v.lucro)}</td>
            </tr>
          `
            )
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

export async function renderCadastrar(el) {
  await loadCategorias();

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-plus" style="margin-right:8px"></i> Cadastrar Produtos</div>
      <div class="page-sub">Gestão avançada de inventário, preços e lucro</div>
    </div>

    <div class="card produto-form-card">
      <form id="form-produto" class="produto-form" onsubmit="return false">
        <section class="form-section">
          <h3 class="form-section-title"><i class="fa-solid fa-tag"></i> Informações do produto</h3>
          
          <div class="form-row cols2">
            <div class="field field-span2"><label>Nome do produto *</label><input id="p-nome" placeholder="Ex: Bolacha Maria" required/></div>
          </div>
          <div class="form-row cols3">
            <div class="field"><label>Categoria</label><select id="p-cat">${buildCategoriaOptions()}</select></div>
            <div class="field"><label>Nova categoria</label>
              
              <div class="input-with-btn">
                <input id="p-nova-cat" placeholder="Criar categoria..."/>
                <button type="button" class="btn btn-sm btn-blue" id="btn-add-cat">+</button>
              </div>
            </div>
            <div class="field"><label>Unidade de medida</label>
              <select id="p-unidade">${UNIDADES_MEDIDA.map((u) => `<option>${u}</option>`).join("")}</select>
            </div>
          </div>
          <div class="form-row cols3">
            <div class="field"><label>Marca</label><input id="p-marca" placeholder="Opcional"/></div>
            <div class="field"><label>Código de barras</label><input id="p-codigo-barras" placeholder="Opcional"/></div>
            <div class="field" id="p-tamanho-field" style="display:none"><label>Tamanho</label><input id="p-tamanho" placeholder="Ex: M, 500ml"/></div>
            <div class="field field-span2"><label>Descrição</label><textarea id="p-descricao" rows="2" placeholder="Descrição opcional"></textarea></div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-title"><i class="fa-solid fa-boxes-stacked"></i> Stock</h3>
          <div class="form-row cols3">
            <div class="field"><label>Quantidade total em stock</label><input type="number" id="p-stock" min="0" value="0" placeholder="0"/></div>
            <div class="field"><label>Quantidade por caixa</label><input type="number" id="p-qtd-caixa" min="1" value="1" placeholder="15"/></div>
            <div class="field"><label>Stock mínimo</label><input type="number" id="p-stockmin" min="0" value="10" placeholder="10"/></div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-title"><i class="fa-solid fa-coins"></i> Preços</h3>
          <div class="form-row cols3">
            <div class="field"><label>Preço de compra da caixa (MT)</label><input type="number" id="p-preco-caixa" min="0" step="0.01" placeholder="150"/></div>
            <div class="field"><label>Preço de venda por unidade (MT) *</label><input type="number" id="p-preco-unidade" min="0" step="0.01" placeholder="15" required/></div>
            <div class="field"><label>Preço de venda por caixa (MT)</label><input type="number" id="p-preco-venda-caixa" min="0" step="0.01" placeholder="225"/></div>
          </div>
        </section>

        <section class="form-section form-section-lucro">
          <h3 class="form-section-title"><i class="fa-solid fa-chart-line"></i> Lucro (calculado automaticamente)</h3>
          <div class="lucro-grid">
            <div class="lucro-item"><span class="lucro-label">Custo por unidade</span><span class="lucro-value" id="lucro-custo-unit">MT 0.00</span></div>
            <div class="lucro-item"><span class="lucro-label">Lucro por unidade</span><span class="lucro-value lucro-positive" id="lucro-por-unidade">MT 0.00</span></div>
            <div class="lucro-item"><span class="lucro-label">Lucro por caixa</span><span class="lucro-value lucro-positive" id="lucro-por-caixa">MT 0.00</span></div>
            <div class="lucro-item"><span class="lucro-label">Margem de lucro</span><span class="lucro-value lucro-margem" id="lucro-margem">0%</span></div>
          </div>
          <div class="alert-card alert-red" id="lucro-aviso" style="display:none;margin-top:12px">
            <i class="fa-solid fa-triangle-exclamation"></i> O preço de venda está abaixo do custo. Corrija antes de cadastrar.
          </div>
        </section>

        <div class="form-actions">
          <button type="button" class="btn btn-green btn-lg" id="btn-cadastrar-produto">
            <i class="fa-solid fa-check"></i> Cadastrar produto
          </button>
        </div>
      </form>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">Produtos cadastrados (${currentProdutos.length})</div></div>
      <div class="table-toolbar">
        <button class="btn btn-sm btn-green" onclick="window.exportarInventarioExcelWrapper()"><i class="fa-solid fa-file-excel"></i> Excel</button>
        <button class="btn btn-sm btn-blue" onclick="window.exportarInventarioPdfWrapper()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      </div>
      <div class="table-wrap">
        <table class="table-produtos">
          <thead><tr>
            <th>Nome</th><th>Categoria</th><th>Unidade</th><th>Stock</th>
            <th>Preço un.</th><th>Lucro un.</th><th>Ações</th>
          </tr></thead>
          <tbody>${currentProdutos
            .map((p) => {
              const qtd = Math.max(1, p.qtd_por_caixa || 1);
              const custoU = p.preco_custo || (p.preco_compra_caixa || 0) / qtd;
              const lucroU = (p.preco || 0) - custoU;
              return `
            <tr>
              <td><strong>${escapeHtml(p.nome)}</strong>${p.marca ? `<br><small class="text-muted">${escapeHtml(p.marca)}</small>` : ""}</td>
              <td>${escapeHtml(p.categoria || "Outros")}</td>
              <td>${escapeHtml(p.unidade_medida || "Unidade")}</td>
              <td><span class="${p.stock <= p.stockMin ? "stock-low" : "stock-ok"}">${p.stock}</span></td>
              <td>${fmt(p.preco)}</td>
              <td class="${lucroU >= 0 ? "lucro-positive" : "lucro-negative"}">${fmt(lucroU)}</td>
              <td class="table-actions">
                <button class="btn btn-sm btn-green" onclick="window.editarStockFromCadastrarWrapper(${p.id})">
                  <i class="fa-solid fa-pen-to-square"></i> Editar Stock
                </button>
                <button class="btn btn-sm btn-red" onclick="window.removerProdutoWrapper(${p.id})">
                  <i class="fa-solid fa-trash"></i> Apagar
                </button>
              </td>
            </tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btn-cadastrar-produto")?.addEventListener("click", () => window.cadastrarProdutoWrapper());
  document.getElementById("btn-add-cat")?.addEventListener("click", () => window.adicionarCategoriaInlineWrapper());
  initProdutoFormListeners();
}

window.adicionarCategoriaInlineWrapper = async function () {
  const input = document.getElementById("p-nova-cat");
  const nome = input?.value?.trim();
  if (!nome) {
    alert("Informe o nome da nova categoria.");
    return;
  }
  try {
    if (window.api?.addCategoria) await window.api.addCategoria({ nome });
    if (!currentCategorias.includes(nome)) currentCategorias.push(nome);
    currentCategorias.sort((a, b) => a.localeCompare(b, "pt"));
    const select = document.getElementById("p-cat");
    if (select) {
      select.innerHTML = buildCategoriaOptions();
      select.value = nome;
    }
    if (input) input.value = "";
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao adicionar categoria.");
  }
};

window.cadastrarProdutoWrapper = async function () {
  if (!currentUser?.id) {
    alert("Utilizador não autenticado.");
    return;
  }

  const nome = document.getElementById("p-nome")?.value?.trim();
  const novaCat = document.getElementById("p-nova-cat")?.value?.trim();
  const categoria = novaCat || document.getElementById("p-cat")?.value;
  const unidade_medida = document.getElementById("p-unidade")?.value || "Unidade";
  const stock = safeNum(document.getElementById("p-stock")?.value);
  const qtd_por_caixa = Math.max(1, safeNum(document.getElementById("p-qtd-caixa")?.value, 1));
  const stock_minimo = safeNum(document.getElementById("p-stockmin")?.value, 10);
  const preco_compra_caixa = safeNum(document.getElementById("p-preco-caixa")?.value);
  const preco_venda = safeNum(document.getElementById("p-preco-unidade")?.value);
  const preco_venda_caixa = safeNum(document.getElementById("p-preco-venda-caixa")?.value);
  const tamanho = document.getElementById("p-tamanho")?.value?.trim() || null;
  const marca = document.getElementById("p-marca")?.value?.trim() || null;
  const codigo_barras = document.getElementById("p-codigo-barras")?.value?.trim() || null;
  const descricao = document.getElementById("p-descricao")?.value?.trim() || null;

  if (!nome) {
    alert("Informe o nome do produto.");
    return;
  }
  if (preco_venda <= 0) {
    alert("Informe o preço de venda por unidade (maior que zero).");
    return;
  }
  if (!categoria) {
    alert("Seleccione ou crie uma categoria.");
    return;
  }

  const preco_custo = custoUnitarioFromCaixa(preco_compra_caixa, qtd_por_caixa);
  const precoCx = preco_venda_caixa > 0 ? preco_venda_caixa : preco_venda * qtd_por_caixa;
  if (preco_custo > 0 && preco_venda < preco_custo) {
    alert(`Margem negativa bloqueada.\n\nCusto por unidade: ${fmt(preco_custo)}\nPreço de venda: ${fmt(preco_venda)}`);
    return;
  }

  try {
    await window.api.addProduto({
      nome,
      categoria_id: categoria,
      preco_venda,
      preco_custo,
      stock_minimo,
      stock,
      unidade_medida,
      qtd_por_caixa,
      preco_compra_caixa,
      preco_venda_caixa: precoCx,
      tamanho,
      marca,
      codigo_barras,
      descricao,
    });
    await refreshProdutos();
    alert("Produto cadastrado com sucesso!");
    const contentArea = document.getElementById("content-area");
    if (contentArea) await renderCadastrar(contentArea);
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao cadastrar produto.");
  }
};

window.removerProdutoWrapper = async function (id) {
  if (!currentUser?.id) {
    alert("Utilizador não autenticado.");
    return;
  }
  const produto = currentProdutos.find((p) => p.id === id);
  const nome = produto?.nome || "este produto";
  if (!confirm(`Tem a certeza que deseja apagar "${nome}"?\n\nEsta acção não pode ser desfeita.`)) return;

  try {
    await window.api.deleteProduto({ id });
    await refreshProdutos();
    reRenderActiveGestorPage();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao apagar produto.");
  }
};

window.editarStockFromCadastrarWrapper = function (id) {
  const produto = currentProdutos.find((p) => p.id === id);
  if (!produto) {
    alert("Produto não encontrado.");
    return;
  }
  openEditStockModal(produto, currentUser, async () => {
    await refreshProdutos();
    reRenderActiveGestorPage();
  });
};

window.updateStockFromTable = async function (id, newStock) {
  if (!currentUser?.id) return;
  const produto = currentProdutos.find((p) => p.id === id);
  if (!produto) return;

  const stock = Math.max(0, safeNum(newStock));
  if (stock === produto.stock) return;

  try {
    await window.api.atualizarProduto(id, { stock });
    await refreshProdutos();
    const contentArea = document.getElementById("content-area");
    if (contentArea && window.STATE?.currentPage === "stock") renderStock(contentArea);
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erro ao atualizar stock.");
  }
};

function inventarioRows() {
  return currentProdutos.map((p) => {
    const qtd = Math.max(1, Number(p.qtd_por_caixa) || 1);
    const custo = Number(p.preco_custo || 0);
    const preco = Number(p.preco || p.preco_venda || 0);
    return {
      nome: p.nome,
      categoria: p.categoria || p.cat || "Outros",
      codigo: p.codigo_barras || "",
      stock: Number(p.stock || 0),
      minimo: Number(p.stockMin ?? p.stock_minimo ?? 10),
      unidade: p.unidade_medida || "Unidade",
      qtdCaixa: qtd,
      custo,
      preco,
      lucro: preco - custo,
      valorStock: preco * Number(p.stock || 0),
    };
  });
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

window.exportarInventarioExcelWrapper = function () {
  const rows = inventarioRows();
  const totalStock = rows.reduce((s, r) => s + r.stock, 0);
  const totalValor = rows.reduce((s, r) => s + r.valorStock, 0);
  const html = `
    <html><head><meta charset="utf-8"></head><body>
      <table border="1">
        <thead>
          <tr><th>Produto</th><th>Categoria</th><th>Codigo</th><th>Stock</th><th>Minimo</th><th>Unidade</th><th>Qtd/Caixa</th><th>Custo</th><th>Preco</th><th>Lucro</th><th>Valor Stock</th></tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.categoria)}</td><td>${escapeHtml(r.codigo)}</td><td>${r.stock}</td><td>${r.minimo}</td><td>${escapeHtml(r.unidade)}</td><td>${r.qtdCaixa}</td><td>${r.custo}</td><td>${r.preco}</td><td>${r.lucro}</td><td>${r.valorStock}</td></tr>`
            )
            .join("")}
          <tr><td colspan="3"><strong>Totais</strong></td><td><strong>${totalStock}</strong></td><td colspan="6"></td><td><strong>${totalValor}</strong></td></tr>
        </tbody>
      </table>
    </body></html>`;
  downloadBlob(`inventario-${new Date().toISOString().slice(0, 10)}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
};

window.exportarInventarioPdfWrapper = function () {
  const rows = inventarioRows();
  const win = window.open("", "_blank");
  if (!win) {
    alert("Permita pop-ups para exportar o PDF.");
    return;
  }
  win.document.write(`
    <html>
      <head>
        <title>Inventario</title>
        <style>
          body{font-family:Arial,sans-serif;color:#111;margin:24px}
          h1{font-size:20px;margin:0 0 4px}
          .sub{font-size:12px;color:#555;margin-bottom:18px}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th,td{border:1px solid #ccc;padding:6px;text-align:left}
          th{background:#f2f2f2}
          .neg{color:#b00020;font-weight:700}
        </style>
      </head>
      <body>
        <h1>Inventario de Produtos</h1>
        <div class="sub">Gerado em ${new Date().toLocaleString("pt-PT")}</div>
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Codigo</th><th>Stock</th><th>Min.</th><th>Preco</th><th>Lucro</th><th>Estado</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.categoria)}</td><td>${escapeHtml(r.codigo)}</td><td>${r.stock}</td><td>${r.minimo}</td><td>${fmt(r.preco)}</td><td class="${r.lucro < 0 ? "neg" : ""}">${fmt(r.lucro)}</td><td>${r.stock <= r.minimo ? "Atenção" : "OK"}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};

export function renderStock(el) {
  el.innerHTML = `
    
    <div class="page-header">
      <div class="page-title"><i class="fa-solid fa-box" style="margin-right:8px"></i> Nível de Stock</div>
      <div class="page-sub">Gerencie quantidades de produtos</div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Produtos em stock</div></div>
      <div class="table-toolbar">
        <button class="btn btn-sm btn-green" onclick="window.exportarInventarioExcelWrapper()"><i class="fa-solid fa-file-excel"></i> Excel</button>
        <button class="btn btn-sm btn-blue" onclick="window.exportarInventarioPdfWrapper()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Stock</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${currentProdutos
            .map((p) => {
              const status = p.stock === 0 ? "Esgotado" : p.stock <= p.stockMin ? "Baixo" : "OK";
              const badge =
                status === "Esgotado" ? "red" : status === "Baixo" ? "amber" : "green";
              return `
            <tr>
              <td>${escapeHtml(p.nome)}</td>
              <td>${escapeHtml(p.categoria || "Outros")}</td>
              <td><strong class="${p.stock <= p.stockMin ? "stock-low" : "stock-ok"}">${p.stock}</strong></td>
              <td>${p.stockMin}</td>
              <td><span class="badge ${badge}">${status}</span></td>
              <td class="table-actions">
                <button class="btn btn-sm btn-green" onclick="window.editarStockFromCadastrarWrapper(${p.id})">
                  <i class="fa-solid fa-pen-to-square"></i> Editar Stock
                </button>
              </td>
            </tr>`;
            })
            .join("")}</tbody>
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
