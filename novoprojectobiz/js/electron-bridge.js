/**
 * Liga `window.electronAPI` (preload) a `window.api` esperado por `app.js` e páginas.
 */

function unwrap(result) {
  if (result && typeof result === "object" && result.error != null && result.error !== "") {
    throw new Error(String(result.error));
  }
  return result;
}

function mapProdutoRow(row) {
  const preco = Number(row.preco_venda ?? row.preco ?? 0);
  const preco_custo = Number(row.preco_custo ?? row.custo ?? 0);
  const qtdCx = Math.max(1, Number(row.qtd_por_caixa) || 1);

  return {
    ...row,
    id: Number(row.id),
    nome: String(row.nome || "").trim() || "Produto",
    preco,
    preco_custo,
    custo: preco_custo,
    stock: Math.max(0, Number(row.stock) || 0),
    stockMin: Number(row.stock_minimo ?? row.stockMin ?? 10),
    icon: row.icon || "<i class='fa-solid fa-box'></i>",
    categoria: row.categoria_nome || row.categoria || row.cat || "Outros",
    cat: row.categoria_nome || row.categoria || row.cat || "Outros",
    unidade_medida: row.unidade_medida || "Unidade",
    qtd_por_caixa: qtdCx,
    preco_compra_caixa: Number(row.preco_compra_caixa ?? preco_custo * qtdCx),
    preco_venda_caixa: Number(row.preco_venda_caixa ?? preco * qtdCx),
    tamanho: row.tamanho || "",
    marca: row.marca || "",
    descricao: row.descricao || "",
    codigo_barras: row.codigo_barras || "",
  };
}

export function initElectronApiBridge() {
  if (typeof window === "undefined" || !window.electronAPI) {
    return false;
  }

  const e = window.electronAPI;

  window.api = {
    async authLogin({ email, password }) {
      return loginWithElectronApi(email, password);
    },

    async getProdutos() {
      const rows = unwrap(await e.get("/produtos"));
      return Array.isArray(rows) ? rows.map(mapProdutoRow) : [];
    },

    async getCategorias() {
      const rows = unwrap(await e.get("/categorias"));
      return Array.isArray(rows) ? rows : [];
    },

    async addCategoria({ nome }) {
      return unwrap(await e.post("/categorias", { nome }));
    },

    async getMovimentos() {
      const rows = unwrap(await e.get("/movimentacoes"));
      return Array.isArray(rows) ? rows : [];
    },

    async getVendas() {
      const rows = unwrap(await e.get("/vendas"));
      return Array.isArray(rows) ? rows : [];
    },

    async addProduto(produto) {
      return unwrap(await e.post("/produtos", produto));
    },

    async atualizarProduto(id, dados) {
      return unwrap(await e.put(`/produtos/${id}`, dados));
    },

    async deleteProduto({ id }) {
      return unwrap(await e.delete(`/produtos/${id}`));
    },

    async addMovimento(movimento) {
      return unwrap(await e.post("/movimentacoes", movimento));
    },

    async registarVenda(venda) {
      return unwrap(await e.post("/vendas", venda));
    },

    async atualizarPagamentoVenda(id, dados) {
      return unwrap(await e.put(`/vendas/${id}/pagamento`, dados));
    },
  };
  return true;
}

/** Login directo pelo preload (fallback se `window.api` não foi montado). */
export async function loginWithElectronApi(email, senha) {
  if (typeof window === "undefined" || !window.electronAPI?.post) {
    throw new Error("API Electron indisponível. Abra a app com: npm start");
  }
  const data = unwrap(await window.electronAPI.post("/auth/login", { email, senha }));
  if (data.token) localStorage.setItem("auth_token", data.token);
  if (!data.user) throw new Error("Resposta de login inválida.");
  return data.user;
}
