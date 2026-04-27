const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const isDev = !app.isPackaged;
const MASTER_REGISTRATION_PASSWORD = "21savage258";

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
};

function createWindow() {
  console.log("📦 Criando janela...");
  
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("🔗 Caminho do preload:", preloadPath);
  console.log("🔗 Arquivo existe?", require("fs").existsSync(preloadPath));
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "BizControl",
    backgroundColor: "#0a0f18",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  win.setMenuBarVisibility(false);

  if (isDev) {
    console.log("🌐 Carregando http://localhost:5174");
    win.loadURL("http://localhost:5174").catch(() => {
      console.log("⚠️ Porta 5174 não disponível, tentando 5173...");
      win.loadURL("http://localhost:5173");
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const verifyPassword = (plainPassword, storedHash) => {
  if (!storedHash || !plainPassword) return false;

  const [salt, savedKey] = storedHash.split(":");
  if (!salt || !savedKey) return false;

  const key = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  const savedBuffer = Buffer.from(savedKey, "hex");
  const keyBuffer = Buffer.from(key, "hex");

  if (savedBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(savedBuffer, keyBuffer);
};

/* =========================
   SQLITE IPC
========================= */

ipcMain.handle("get-produtos", () => {
  console.log("📋 [MAIN] Buscando produtos");
  try {
    const rows = db.prepare("SELECT * FROM produtos").all();
    console.log("✅ [MAIN] Produtos encontrados:", rows.length);
    return rows;
  } catch (err) {
    console.error("❌ [MAIN] Erro ao buscar produtos:", err);
    throw err;
  }
});

ipcMain.handle("add-produto", (_, produto) => {
  console.log("➕ [MAIN] Adicionando produto:", produto);
  try {
    const result = db
      .prepare("INSERT INTO produtos (nome, categoria, preco, stock) VALUES (?, ?, ?, ?)")
      .run(produto.nome, produto.categoria, produto.preco, produto.stock);

    console.log("✅ [MAIN] Produto adicionado com ID:", result.lastInsertRowid);
    return { id: result.lastInsertRowid };
  } catch (err) {
    console.error("❌ [MAIN] Erro ao inserir produto:", err);
    throw err;
  }
});

ipcMain.handle("update-produto", (_, produto) => {
  try {
    db.prepare("UPDATE produtos SET nome=?, categoria=?, preco=?, stock=? WHERE id=?").run(
      produto.nome,
      produto.categoria,
      produto.preco,
      produto.stock,
      produto.id
    );
    return true;
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("delete-produto", (_, id) => {
  try {
    db.prepare("DELETE FROM produtos WHERE id=?").run(id);
    return true;
  } catch (err) {
    throw err;
  }
});

/* =========================
   MOVIMENTOS IPC
========================= */

ipcMain.handle("get-movimentos", () => {
  try {
    return db
      .prepare(
        `
      SELECT m.*, p.nome as produto_nome 
      FROM movimentos m 
      LEFT JOIN produtos p ON m.produto_id = p.id 
      ORDER BY m.data DESC
    `
      )
      .all();
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("add-movimento", (_, movimento) => {
  const produtoId = Number(movimento.produto_id);
  const quantidade = Number(movimento.quantidade);
  const tipo = movimento.tipo === "saida" ? "saida" : "entrada";

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    throw new Error("Produto inválido.");
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error("Quantidade inválida.");
  }

  const insertMovimentoStmt = db.prepare(
    "INSERT INTO movimentos (produto_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?)"
  );
  const updateStockStmt = db.prepare(
    tipo === "entrada"
      ? "UPDATE produtos SET stock = stock + ? WHERE id = ?"
      : "UPDATE produtos SET stock = stock - ? WHERE id = ?"
  );

  const tx = db.transaction(() => {
    const inserted = insertMovimentoStmt.run(produtoId, tipo, quantidade, movimento.observacao || "");
    updateStockStmt.run(quantidade, produtoId);
    return inserted.lastInsertRowid;
  });

  const insertedMovimentoId = tx();
  return { id: insertedMovimentoId };
});

/* =========================
   UTILIZADORES IPC
========================= */

ipcMain.handle("get-utilizadores", () => {
  try {
    return db.prepare("SELECT * FROM utilizadores ORDER BY data_criacao DESC").all();
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("add-utilizador", (_, utilizador) => {
  try {
    const result = db
      .prepare("INSERT INTO utilizadores (nome, email, telefone, funcao) VALUES (?, ?, ?, ?)")
      .run(utilizador.nome, utilizador.email, utilizador.telefone, utilizador.funcao);
    return { id: result.lastInsertRowid };
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("update-utilizador", (_, utilizador) => {
  try {
    db.prepare("UPDATE utilizadores SET nome=?, email=?, telefone=?, funcao=? WHERE id=?").run(
      utilizador.nome,
      utilizador.email,
      utilizador.telefone,
      utilizador.funcao,
      utilizador.id
    );
    return true;
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("delete-utilizador", (_, id) => {
  try {
    db.prepare("DELETE FROM utilizadores WHERE id=?").run(id);
    return true;
  } catch (err) {
    throw err;
  }
});

/* =========================
   AUTH IPC
========================= */

ipcMain.handle("auth-login", (_, credentials) => {
  const email = String(credentials?.email || "").trim().toLowerCase();
  const password = String(credentials?.password || "");

  if (!email || !password) {
    throw new Error("Informe email e senha para iniciar sessão.");
  }

  let row;
  try {
    row = db
      .prepare("SELECT id, nome, email, perfil, ativo, senha_hash FROM auth_users WHERE email = ? LIMIT 1")
      .get(email);
  } catch (err) {
    throw new Error("Erro interno ao validar credenciais.");
  }

  if (!row || row.ativo !== 1) {
    throw new Error("Credenciais inválidas.");
  }

  const passwordOk = verifyPassword(password, row.senha_hash);
  if (!passwordOk) {
    throw new Error("Credenciais inválidas.");
  }

  db.prepare("UPDATE auth_users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
  };
});

ipcMain.handle("auth-can-register", () => {
  try {
    const row = db.prepare("SELECT COUNT(*) AS total FROM auth_users WHERE ativo = 1").get();
    return (row?.total || 0) === 0;
  } catch (err) {
    throw new Error("Não foi possível validar contas existentes.");
  }
});

ipcMain.handle("auth-register", (_, payload) => {
  const nome = String(payload?.nome || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");
  const masterPassword = String(payload?.masterPassword || "");

  if (!nome || !email || !password) {
    throw new Error("Preencha nome, email e senha para criar a conta.");
  }

  if (masterPassword !== MASTER_REGISTRATION_PASSWORD) {
    throw new Error("Senha mestre inválida.");
  }

  let row;
  try {
    row = db.prepare("SELECT COUNT(*) AS total FROM auth_users WHERE ativo = 1").get();
  } catch (err) {
    throw new Error("Erro ao validar disponibilidade para registo.");
  }

  if ((row?.total || 0) > 0) {
    throw new Error("Já existe uma conta ativa no sistema.");
  }

  const passwordHash = hashPassword(password);
  try {
    const result = db
      .prepare("INSERT INTO auth_users (nome, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)")
      .run(nome, email, passwordHash, "owner");

    return {
      id: result.lastInsertRowid,
      nome,
      email,
      perfil: "owner",
    };
  } catch (err) {
    if (err?.message?.includes("UNIQUE")) {
      throw new Error("Este email já está registado.");
    }
    throw new Error("Não foi possível criar a conta.");
  }
});

ipcMain.handle("ping", () => "ok");

// Listener para confirmar preload carregado
ipcMain.on("preload-loaded", () => {
  console.log("✅ [MAIN] Preload script carregado e executado com sucesso!");
});