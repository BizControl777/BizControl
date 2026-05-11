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
const { contextBridge, ipcRenderer } = require("electron");

// Lista de canais IPC que o renderer pode usar para enviar mensagens para o main process
const validSendChannels = [];

// Lista de canais IPC que o renderer pode usar para chamar handlers (request/response) no main process
const validInvokeChannels = [
  "ping",
  "auth-login", // Adicionar canal para login
  "get-produtos",
  "add-produto",
  "update-produto", // Adicionar canais para CRUD completo
  "delete-produto",
  "get-utilizadores",
  "add-utilizador",
  "update-utilizador",
  "delete-utilizador",
  "get-movimentos",
  "add-movimento",
  "get-clientes",
  "get-fornecedores",
  "get-relatorio-analise",
  // Adicionar aqui todos os outros canais IPC necessários para CRUDs de Clientes, Fornecedores, Dívidas, etc.
];

contextBridge.exposeInMainWorld("api", {
  // Exemplo de uma função bidirecional (invoke)
  invoke: (channel, ...args) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      console.error(`Canal inválido para invoke: ${channel}`);
      return Promise.reject(new Error(`Canal IPC inválido: ${channel}`));
    }
  },
  // Exemplo de uma função unidirecional (send) - menos comum para APIs de frontend
  send: (channel, ...args) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.error(`Canal inválido para send: ${channel}`);
    }
  },
  // Exemplo de uma função para receber eventos (on)
  on: (channel, func) => {
    const validOnChannels = []; // Canais que o renderer pode ouvir
    if (validOnChannels.includes(channel)) {
      // Remover listener ao ser chamado para evitar múltiplas chamadas
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    } else {
      console.error(`Canal inválido para 'on': ${channel}`);
    }
  },
});

console.log("✅ [Preload] API exposta com contextBridge.");
