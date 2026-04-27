#!/usr/bin/env node

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./electron/db");

const isDev = !app.isPackaged;

console.log("\n" + "=".repeat(50));
console.log("🚀 TEST ELECTRON - Iniciando");
console.log("=".repeat(50));
console.log("isDev:", isDev);
console.log("__dirname:", __dirname);
console.log("Arquivo principal:", __filename);

// Handlers do IPC
ipcMain.handle("ping", () => {
  console.log("✅ [Main] Ping recebido e respondido");
  return "pong!";
});

ipcMain.handle("get-produtos", () => {
  return new Promise((resolve, reject) => {
    console.log("✅ [Main] getProdutos chamado");
    db.all("SELECT * FROM produtos", [], (err, rows) => {
      if (err) {
        console.error("❌ [Main] Erro ao buscar produtos:", err);
        reject(err);
      } else {
        console.log("✅ [Main] Retornando", rows?.length || 0, "produtos");
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle("add-produto", (_, produto) => {
  const { nome, categoria, preco, stock } = produto;
  console.log("✅ [Main] addProduto chamado com:", { nome, categoria, preco, stock });
  
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO produtos (nome, categoria, preco, stock) VALUES (?, ?, ?, ?)",
      [nome, categoria, preco, stock],
      function (err) {
        if (err) {
          console.error("❌ [Main] Erro ao adicionar:", err);
          reject(err);
        } else {
          console.log("✅ [Main] Produto adicionado com ID:", this.lastID);
          resolve({ id: this.lastID });
        }
      }
    );
  });
});

function createWindow() {
  console.log("\n📦 Criando janela Electron...");
  
  const preloadPath = path.join(__dirname, "electron", "preload.js");
  console.log("🔗 Preload path:", preloadPath);
  
  const testHtmlPath = path.join(__dirname, "simple.html");
  console.log("📄 Test HTML path:", testHtmlPath);
  
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    title: "BizControl - Test Preload",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      preload: preloadPath,
    },
  });

  // Abre DevTools
  win.webContents.openDevTools();
  
  // Carrega test.html
  win.loadFile(testHtmlPath);

  // Logs de eventos
  win.webContents.on("did-finish-load", () => {
    console.log("✅ Página carregada no renderer");
  });

  win.webContents.on("console-message", (level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  win.webContents.on("crashed", () => {
    console.error("❌ Renderer crashou!");
  });
}

app.whenReady().then(() => {
  console.log("✅ App pronto, criando janela...");
  createWindow();
});

app.on("window-all-closed", () => {
  console.log("👋 Todas as janelas fechadas, saindo...");
  app.quit();
});
