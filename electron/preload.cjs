const { contextBridge, ipcRenderer } = require("electron");

/** API segura exposta ao React (isolamento em relação ao Node). */
const api = {
  getProdutos: () => ipcRenderer.invoke("get-produtos"),
  addProduto: (data) => ipcRenderer.invoke("add-produto", data),
  updateProduto: (data) => ipcRenderer.invoke("update-produto", data),
  deleteProduto: (data) => ipcRenderer.invoke("delete-produto", data),

  getMovimentos: () => ipcRenderer.invoke("get-movimentos"),
  addMovimento: (data) => ipcRenderer.invoke("add-movimento", data),

  getUtilizadores: () => ipcRenderer.invoke("get-utilizadores"),
  addUtilizador: (data) => ipcRenderer.invoke("add-utilizador", data),
  updateUtilizador: (data) => ipcRenderer.invoke("update-utilizador", data),
  deleteUtilizador: (data) => ipcRenderer.invoke("delete-utilizador", data),

  getClientes: () => ipcRenderer.invoke("get-clientes"),
  addCliente: (data) => ipcRenderer.invoke("add-cliente", data),
  getFornecedores: () => ipcRenderer.invoke("get-fornecedores"),
  addFornecedor: (data) => ipcRenderer.invoke("add-fornecedor", data),

  getDividas: () => ipcRenderer.invoke("get-dividas"),
  marcarDividaPaga: (data) => ipcRenderer.invoke("marcar-divida-paga", data),

  getAlertas: () => ipcRenderer.invoke("get-alertas"),
  resolverAlerta: (data) => ipcRenderer.invoke("resolver-alerta", data),
  getLogs: (data) => ipcRenderer.invoke("get-logs", data),

  getPerfis: () => ipcRenderer.invoke("get-perfis"),
  getPermissoes: () => ipcRenderer.invoke("get-permissoes"),
  getPerfilPermissoes: (perfilId) => ipcRenderer.invoke("get-perfil-permissoes", perfilId),
  setPerfilPermissoes: (data) => ipcRenderer.invoke("set-perfil-permissoes", data),
  getUsuarioPermissoes: (usuarioId) => ipcRenderer.invoke("get-usuario-permissoes", usuarioId),
  setUsuarioPermissoes: (data) => ipcRenderer.invoke("set-usuario-permissoes", data),

  getRelatorioVendas: (filtros) => ipcRenderer.invoke("get-relatorio-vendas", filtros),
  getRelatorioAnalise: (filtros) => ipcRenderer.invoke("get-relatorio-analise", filtros),

  authLogin: (credentials) => ipcRenderer.invoke("auth-login", credentials),
  authRegister: (payload) => ipcRenderer.invoke("auth-register", payload),
  authCanRegister: () => ipcRenderer.invoke("auth-can-register"),

  ping: () => ipcRenderer.invoke("ping"),
};

try {
  contextBridge.exposeInMainWorld("api", api);
} catch (err) {
  console.error("[BizControl] Preload não pôde expor a API:", err);
}

ipcRenderer.send("preload-loaded");
