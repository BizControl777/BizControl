const { ipcRenderer } = require("electron");

console.log("🚀 [PRELOAD] Iniciando preload.js...");
console.log("[PRELOAD] ipcRenderer disponível:", !!ipcRenderer);

if (!ipcRenderer) {
  console.error("❌ [PRELOAD] ipcRenderer não disponível");
  return;
}

console.log("[PRELOAD] Expondo API...");

window.api = {
  // Produtos
  getProdutos: () => ipcRenderer.invoke("get-produtos"),
  addProduto: (data) => ipcRenderer.invoke("add-produto", data),
  updateProduto: (data) => ipcRenderer.invoke("update-produto", data),
  deleteProduto: (id) => ipcRenderer.invoke("delete-produto", id),
  
  // Movimentos
  getMovimentos: () => ipcRenderer.invoke("get-movimentos"),
  addMovimento: (data) => ipcRenderer.invoke("add-movimento", data),
  
  // Utilizadores
  getUtilizadores: () => ipcRenderer.invoke("get-utilizadores"),
  addUtilizador: (data) => ipcRenderer.invoke("add-utilizador", data),
  updateUtilizador: (data) => ipcRenderer.invoke("update-utilizador", data),
  deleteUtilizador: (id) => ipcRenderer.invoke("delete-utilizador", id),

  // Auth
  authLogin: (credentials) => ipcRenderer.invoke("auth-login", credentials),
  authRegister: (payload) => ipcRenderer.invoke("auth-register", payload),
  authCanRegister: () => ipcRenderer.invoke("auth-can-register"),
  
  ping: () => ipcRenderer.invoke("ping"),
};

console.log("✅ [PRELOAD] API exposta para renderer com sucesso!");

// Enviar confirmação para main process
ipcRenderer.send("preload-loaded");