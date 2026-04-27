const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");

console.log("✅ Importações carregadas");
console.log("__dirname:", __dirname);
console.log("path.join(__dirname, 'preload.js'):", path.join(__dirname, "preload.js"));

const fs = require("fs");
const preloadPath = path.join(__dirname, "electron", "preload.js");
console.log("Preload path:", preloadPath);
console.log("Preload existe?", fs.existsSync(preloadPath));

if (fs.existsSync(preloadPath)) {
  console.log("Preload contents:");
  console.log(fs.readFileSync(preloadPath, 'utf-8').slice(0, 100));
}

// Simular IPC handlers
ipcMain.handle("ping", () => {
  console.log("📡 Ping recebido!");
  return "pong";
});

function createWindow() {
  console.log("🪟 Criando janela...");
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  win.webContents.openDevTools();
  win.loadURL("http://localhost:5173").catch((err) => {
    console.error("❌ Não conseguiu carregar URL:", err?.message);
    console.log("Tentando porta 5174...");
    win.loadURL("http://localhost:5174");
  });

  win.webContents.on("console-message", (level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });
}

app.whenReady().then(() => {
  console.log("✅ App pronto!");
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
