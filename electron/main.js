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
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM produtos", [], (err, rows) => {
      if (err) {
        console.error("❌ [MAIN] Erro ao buscar produtos:", err);
        reject(err);
      } else {
        console.log("✅ [MAIN] Produtos encontrados:", rows.length);
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("add-produto", (_, produto) => {
  console.log("➕ [MAIN] Adicionando produto:", produto);
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO produtos (nome, categoria, preco, stock) VALUES (?, ?, ?, ?)",
      [produto.nome, produto.categoria, produto.preco, produto.stock],
      function (err) {
        if (err) {
          console.error("❌ [MAIN] Erro ao inserir produto:", err);
          reject(err);
        } else {
          console.log("✅ [MAIN] Produto adicionado com ID:", this.lastID);
          resolve({ id: this.lastID });
        }
      }
    );
  });
});

ipcMain.handle("update-produto", (_, produto) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE produtos SET nome=?, categoria=?, preco=?, stock=? WHERE id=?",
      [produto.nome, produto.categoria, produto.preco, produto.stock, produto.id],
      (err) => {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
});

ipcMain.handle("delete-produto", (_, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM produtos WHERE id=?", [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

/* =========================
   MOVIMENTOS IPC
========================= */

ipcMain.handle("get-movimentos", () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT m.*, p.nome as produto_nome 
      FROM movimentos m 
      LEFT JOIN produtos p ON m.produto_id = p.id 
      ORDER BY m.data DESC
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("add-movimento", (_, movimento) => {
  const produtoId = Number(movimento.produto_id);
  const quantidade = Number(movimento.quantidade);
  const tipo = movimento.tipo === 'saida' ? 'saida' : 'entrada';

  return new Promise((resolve, reject) => {
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      reject(new Error('Produto inválido.')); 
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      reject(new Error('Quantidade inválida.')); 
      return;
    }

    db.run(
      "INSERT INTO movimentos (produto_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?)",
      [produtoId, tipo, quantidade, movimento.observacao || ""],
      function (err) {
        if (err) {
          reject(err);
          return;
        }

        const insertedMovimentoId = this.lastID;
        const updateQuery = tipo === 'entrada'
          ? "UPDATE produtos SET stock = stock + ? WHERE id = ?"
          : "UPDATE produtos SET stock = stock - ? WHERE id = ?";

        db.run(
          updateQuery,
          [quantidade, produtoId],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: insertedMovimentoId });
            }
          }
        );
      }
    );
  });
});

/* =========================
   UTILIZADORES IPC
========================= */

ipcMain.handle("get-utilizadores", () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM utilizadores ORDER BY data_criacao DESC", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("add-utilizador", (_, utilizador) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO utilizadores (nome, email, telefone, funcao) VALUES (?, ?, ?, ?)",
      [utilizador.nome, utilizador.email, utilizador.telefone, utilizador.funcao],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
});

ipcMain.handle("update-utilizador", (_, utilizador) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE utilizadores SET nome=?, email=?, telefone=?, funcao=? WHERE id=?",
      [utilizador.nome, utilizador.email, utilizador.telefone, utilizador.funcao, utilizador.id],
      (err) => {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
});

ipcMain.handle("delete-utilizador", (_, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM utilizadores WHERE id=?", [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

/* =========================
   AUTH IPC
========================= */

ipcMain.handle("auth-login", (_, credentials) => {
  const email = String(credentials?.email || "").trim().toLowerCase();
  const password = String(credentials?.password || "");

  return new Promise((resolve, reject) => {
    if (!email || !password) {
      reject(new Error("Informe email e senha para iniciar sessão."));
      return;
    }

    db.get(
      "SELECT id, nome, email, perfil, ativo, senha_hash FROM auth_users WHERE email = ? LIMIT 1",
      [email],
      (err, row) => {
        if (err) {
          reject(new Error("Erro interno ao validar credenciais."));
          return;
        }

        if (!row || row.ativo !== 1) {
          reject(new Error("Credenciais inválidas."));
          return;
        }

        const passwordOk = verifyPassword(password, row.senha_hash);
        if (!passwordOk) {
          reject(new Error("Credenciais inválidas."));
          return;
        }

        db.run(
          "UPDATE auth_users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?",
          [row.id],
          () => {
            resolve({
              id: row.id,
              nome: row.nome,
              email: row.email,
              perfil: row.perfil,
            });
          }
        );
      }
    );
  });
});

ipcMain.handle("auth-can-register", () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) AS total FROM auth_users WHERE ativo = 1", [], (err, row) => {
      if (err) {
        reject(new Error("Não foi possível validar contas existentes."));
      } else {
        resolve((row?.total || 0) === 0);
      }
    });
  });
});

ipcMain.handle("auth-register", (_, payload) => {
  const nome = String(payload?.nome || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");
  const masterPassword = String(payload?.masterPassword || "");

  return new Promise((resolve, reject) => {
    if (!nome || !email || !password) {
      reject(new Error("Preencha nome, email e senha para criar a conta."));
      return;
    }

    if (masterPassword !== MASTER_REGISTRATION_PASSWORD) {
      reject(new Error("Senha mestre inválida."));
      return;
    }

    db.get("SELECT COUNT(*) AS total FROM auth_users WHERE ativo = 1", [], (countErr, row) => {
      if (countErr) {
        reject(new Error("Erro ao validar disponibilidade para registo."));
        return;
      }

      if ((row?.total || 0) > 0) {
        reject(new Error("Já existe uma conta ativa no sistema."));
        return;
      }

      const passwordHash = hashPassword(password);
      db.run(
        "INSERT INTO auth_users (nome, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)",
        [nome, email, passwordHash, "owner"],
        function (insertErr) {
          if (insertErr) {
            if (insertErr?.message?.includes("UNIQUE")) {
              reject(new Error("Este email já está registado."));
            } else {
              reject(new Error("Não foi possível criar a conta."));
            }
            return;
          }

          resolve({
            id: this.lastID,
            nome,
            email,
            perfil: "owner",
          });
        }
      );
    });
  });
});

ipcMain.handle("ping", () => "ok");

// Listener para confirmar preload carregado
ipcMain.on("preload-loaded", () => {
  console.log("✅ [MAIN] Preload script carregado e executado com sucesso!");
});