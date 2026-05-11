const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { initDatabase } = require("./db.cjs");

let db;
let mainWindow;

const isDev = !app.isPackaged;

const devLog = (...args) => {
  if (isDev) console.log(...args);
};

/**
 * Senha mestre para o primeiro registo (nunca commitar valores reais no código).
 * - Desenvolvimento: valor fixo "bizcontrol-dev-registration" se não configurar outra coisa.
 * - Produção: variável de ambiente BIZCONTROL_MASTER_PASSWORD ou ficheiro electron/.registration-secret (gerado na build CI).
 */
const getMasterRegistrationPassword = () => {
  const fromEnv = String(process.env.BIZCONTROL_MASTER_PASSWORD || "").trim();
  if (fromEnv) return fromEnv;

  if (isDev) {
    return process.env.BIZCONTROL_MASTER_PASSWORD_DEV || "bizcontrol-dev-registration";
  }

  try {
    const secretPath = path.join(__dirname, ".registration-secret");
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, "utf8").trim();
    }
  } catch (_) {
    /* ignorar */
  }
  return "";
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
};

function createWindow() {
  devLog("BizControl: criar janela principal");

  const preloadPath = path.join(__dirname, "preload.cjs");
  devLog("Preload:", preloadPath, fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "BizControl",
    backgroundColor: "#0a0f18",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      /* sandbox Chromium desativado por compatibilidade (Linux/chrome-sandbox; Windows OK). Isolate via preload + contextIsolation. */
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    devLog("Carregar servidor Vite (5174)…");
    mainWindow.loadURL("http://localhost:5174").catch(() => {
      devLog("Porta 5174 indisponível, a tentar 5173…");
      mainWindow.loadURL("http://localhost:5173");
    });
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });

  app
    .whenReady()
    .then(() => {
      db = initDatabase();
      createWindow();
    })
    .catch((error) => {
      console.error("[BizControl] Falha ao iniciar:", error);
      app.quit();
    });
}

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

const BASE_PERMISSOES = [
  "criar_produto",
  "editar_produto",
  "apagar_produto",
  "alterar_preco",
  "ver_relatorios",
  "ver_relatorios_financeiros",
  "criar_venda",
  "registrar_pagamento",
  "gerir_usuarios",
  "gerir_permissoes",
  "ver_logs",
];

const resolvePerfil = (perfilNome) => {
  const nome = perfilNome === "funcionario" ? "funcionario" : "admin";
  return db.prepare("SELECT id, nome FROM perfis WHERE nome = ? LIMIT 1").get(nome);
};

const getPermissoesPorPerfil = (perfilId) =>
  db
    .prepare(
      `
      SELECT p.nome
      FROM perfil_permissoes pp
      JOIN permissoes p ON p.id = pp.permissao_id
      WHERE pp.perfil_id = ?
    `
    )
    .all(perfilId)
    .map((item) => item.nome);

const getUsuarioContext = (userId) => {
  if (!userId) return null;
  return db
    .prepare(
      `
      SELECT u.id, u.nome, u.email, u.ativo, pf.nome AS perfil, u.perfil_id
      FROM usuarios u
      JOIN perfis pf ON pf.id = u.perfil_id
      WHERE u.id = ?
      LIMIT 1
    `
    )
    .get(userId);
};

const requirePermissao = (userId, permissao) => {
  const user = getUsuarioContext(userId);
  if (!user || user.ativo !== 1) {
    throw new Error("Utilizador sem sessão válida.");
  }
  const permissoes = getPermissoesPorPerfil(user.perfil_id);
  if (!permissoes.includes(permissao)) {
    throw new Error("Ação não autorizada para o seu perfil.");
  }
  return user;
};

/** Evita gravar campo de senha em texto nos logs de auditoria. */
const sanitizeUsuarioParaLog = (row) => {
  if (!row) return null;
  const clone = { ...row };
  delete clone.senha;
  return clone;
};

const logAuditoria = ({ usuario_id, acao, tabela, registro_id, descricao, dados_antes, dados_depois }) => {
  db.prepare(
    `
    INSERT INTO logs (usuario_id, acao, tabela, registro_id, descricao, dados_antes, dados_depois)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    usuario_id || null,
    acao,
    tabela,
    registro_id || null,
    descricao || "",
    dados_antes ? JSON.stringify(dados_antes) : null,
    dados_depois ? JSON.stringify(dados_depois) : null
  );
};

const registrarAlerta = ({ tipo, descricao }) => {
  db.prepare("INSERT INTO alertas (tipo, descricao, resolvido) VALUES (?, ?, 0)").run(tipo, descricao);
};

const sanitizeNumero = (valor, fallback = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
};

/** Primeiro preço de venda unitário > 0 (evita `0 ?? x` ficar preso a colunas legacy `preco`=0 no spread do cliente). */
const resolvePrecoVendaUnitario = (produto, before = {}) => {
  const tryPositive = (obj, keys) => {
    for (const k of keys) {
      const raw = obj[k];
      if (raw === undefined || raw === null || raw === "") continue;
      const n = sanitizeNumero(raw, NaN);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };
  return (
    tryPositive(produto, ["preco_venda_unitario", "preco_venda", "preco"]) ??
    tryPositive(before, ["preco_venda_unitario", "preco_venda", "preco"]) ??
    0
  );
};

const normalizeProdutoPayload = (produto, before = {}) => {
  const unidade_base = String(
    produto.unidade_base || produto.unidade || before.unidade_base || before.unidade || "unidade"
  ).trim() || "unidade";
  const quantidade_total = sanitizeNumero(
    produto.quantidade_total ?? produto.stock ?? before.quantidade_total ?? before.stock,
    0
  );
  const preco_compra_total = sanitizeNumero(
    produto.preco_compra_total ??
      (produto.preco_custo !== undefined ? sanitizeNumero(produto.preco_custo, 0) * quantidade_total : null) ??
      before.preco_compra_total ??
      (sanitizeNumero(before.preco_custo ?? before.preco, 0) * quantidade_total),
    0
  );
  const custo_unitario =
    quantidade_total > 0
      ? preco_compra_total / quantidade_total
      : sanitizeNumero(produto.preco_custo ?? before.preco_custo ?? before.preco, 0);
  const preco_venda_unitario = resolvePrecoVendaUnitario(produto, before);

  return {
    nome: produto.nome ?? before.nome ?? "",
    categoria: produto.categoria ?? before.categoria ?? "",
    unidade_base,
    quantidade_total,
    preco_compra_total,
    preco_venda_unitario,
    preco_custo: custo_unitario,
    preco_venda: preco_venda_unitario,
    preco: preco_venda_unitario,
    stock: quantidade_total,
  };
};

const verificarAlertasProduto = (produtoId) => {
  const produto = db.prepare("SELECT id, nome, stock, preco_custo, preco_venda FROM produtos WHERE id = ?").get(produtoId);
  if (!produto) return;
  if (Number(produto.stock) <= 5) {
    registrarAlerta({
      tipo: "estoque_baixo",
      descricao: `Produto "${produto.nome}" com stock baixo (${produto.stock}).`,
    });
  }
};

/* =========================
   SQLITE IPC
========================= */

ipcMain.handle("get-produtos", () => {
  devLog("Buscando produtos");
  try {
    const rows = db
      .prepare(
        `
        SELECT *,
          COALESCE(preco_venda, preco, 0) AS preco_venda,
          COALESCE(preco_custo, preco, 0) AS preco_custo,
          COALESCE(preco_venda_unitario, preco_venda, preco, 0) AS preco_venda_unitario,
          COALESCE(quantidade_total, stock, 0) AS quantidade_total,
          COALESCE(unidade_base, 'unidade') AS unidade_base,
          COALESCE(preco_compra_total, COALESCE(preco_custo, preco, 0) * COALESCE(quantidade_total, stock, 0), 0) AS preco_compra_total,
          CASE
            WHEN COALESCE(quantidade_total, stock, 0) > 0
              THEN COALESCE(preco_compra_total, COALESCE(preco_custo, preco, 0) * COALESCE(quantidade_total, stock, 0), 0) / COALESCE(quantidade_total, stock, 0)
            ELSE COALESCE(preco_custo, preco, 0)
          END AS custo_unitario,
          (
            COALESCE(preco_venda_unitario, preco_venda, preco, 0)
            - CASE
                WHEN COALESCE(quantidade_total, stock, 0) > 0
                  THEN COALESCE(preco_compra_total, COALESCE(preco_custo, preco, 0) * COALESCE(quantidade_total, stock, 0), 0) / COALESCE(quantidade_total, stock, 0)
                ELSE COALESCE(preco_custo, preco, 0)
              END
          ) AS margem_unitaria,
          (
            COALESCE(preco_venda_unitario, preco_venda, preco, 0) * COALESCE(quantidade_total, stock, 0)
            - COALESCE(preco_compra_total, COALESCE(preco_custo, preco, 0) * COALESCE(quantidade_total, stock, 0), 0)
          ) AS lucro_estoque
        FROM produtos
        ORDER BY nome ASC
      `
      )
      .all();
    devLog("Produtos encontrados:", rows.length);
    return rows;
  } catch (err) {
    console.error("❌ [MAIN] Erro ao buscar produtos:", err);
    throw err;
  }
});

ipcMain.handle("add-produto", (_, produto) => {
  devLog("Adicionando produto");
  try {
    const actor = requirePermissao(produto.usuario_id, "criar_produto");
    const normalized = normalizeProdutoPayload(produto);
    if (normalized.quantidade_total <= 0) {
      throw new Error("Quantidade total deve ser maior que zero.");
    }
    if (normalized.preco_venda_unitario <= 0) {
      throw new Error("Preço de venda unitário deve ser maior que zero.");
    }
    const result = db
      .prepare(
        `
        INSERT INTO produtos (
          nome, categoria, preco, stock, preco_custo, preco_venda,
          unidade_base, quantidade_total, preco_compra_total, preco_venda_unitario
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        normalized.nome,
        normalized.categoria,
        normalized.preco,
        normalized.stock,
        normalized.preco_custo,
        normalized.preco_venda,
        normalized.unidade_base,
        normalized.quantidade_total,
        normalized.preco_compra_total,
        normalized.preco_venda_unitario
      );

    devLog("Produto adicionado, id:", result.lastInsertRowid);
    logAuditoria({
      usuario_id: actor.id,
      acao: "criou",
      tabela: "produtos",
      registro_id: result.lastInsertRowid,
      descricao: `Criou o produto ${produto.nome}`,
      dados_depois: produto,
    });
    return { id: result.lastInsertRowid };
  } catch (err) {
    console.error("❌ [MAIN] Erro ao inserir produto:", err);
    throw err;
  }
});

ipcMain.handle("update-produto", (_, produto) => {
  try {
    const actor = requirePermissao(produto.usuario_id, "editar_produto");
    const before = db.prepare("SELECT * FROM produtos WHERE id = ?").get(produto.id);
    if (!before) throw new Error("Produto não encontrado.");

    const querAlterarPreco =
      produto.preco_custo !== undefined ||
      produto.preco_venda !== undefined ||
      produto.preco !== undefined ||
      produto.preco_compra_total !== undefined ||
      produto.preco_venda_unitario !== undefined;
    if (querAlterarPreco) {
      requirePermissao(produto.usuario_id, "alterar_preco");
    }
    const normalized = normalizeProdutoPayload(produto, before);
    if (normalized.quantidade_total <= 0) {
      throw new Error("Quantidade total deve ser maior que zero.");
    }
    if (normalized.preco_venda_unitario <= 0) {
      throw new Error("Preço de venda unitário deve ser maior que zero.");
    }

    db.prepare(
      `
      UPDATE produtos
      SET nome = ?, categoria = ?, preco = ?, stock = ?, preco_custo = ?, preco_venda = ?,
          unidade_base = ?, quantidade_total = ?, preco_compra_total = ?, preco_venda_unitario = ?
      WHERE id = ?
    `
    ).run(
      normalized.nome,
      normalized.categoria,
      normalized.preco,
      normalized.stock,
      normalized.preco_custo,
      normalized.preco_venda,
      normalized.unidade_base,
      normalized.quantidade_total,
      normalized.preco_compra_total,
      normalized.preco_venda_unitario,
      produto.id
    );
    logAuditoria({
      usuario_id: actor.id,
      acao: "editou",
      tabela: "produtos",
      registro_id: produto.id,
      descricao: `Editou o produto ${produto.nome}`,
      dados_antes: before,
      dados_depois: produto,
    });
    return true;
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("delete-produto", (_, id) => {
  try {
    const actor = requirePermissao(id?.usuario_id, "apagar_produto");
    const produtoId = Number(id?.id || id);
    const before = db.prepare("SELECT * FROM produtos WHERE id = ?").get(produtoId);
    db.prepare("DELETE FROM produtos WHERE id=?").run(produtoId);
    logAuditoria({
      usuario_id: actor.id,
      acao: "apagou",
      tabela: "produtos",
      registro_id: produtoId,
      descricao: `Apagou produto #${produtoId}`,
      dados_antes: before,
    });
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
      SELECT
        m.*,
        p.nome as produto_nome,
        p.preco_custo as produto_preco_custo,
        COALESCE(m.unidade, p.unidade_base, 'unidade') AS unidade,
        c.nome AS cliente_nome,
        f.nome AS fornecedor_nome,
        u.nome AS usuario_nome
      FROM movimentos m 
      LEFT JOIN produtos p ON m.produto_id = p.id 
      LEFT JOIN clientes c ON m.cliente_id = c.id
      LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY COALESCE(m.criado_em, m.data) DESC
    `
      )
      .all();
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("add-movimento", (_, movimento) => {
  const produtoId = Number(movimento.produto_id);
  const quantidade = sanitizeNumero(movimento.quantidade, 0);
  const tipo = movimento.tipo === "venda" ? "venda" : "entrada";
  const actor = requirePermissao(movimento.usuario_id, "criar_venda");

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    throw new Error("Produto inválido.");
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error("Quantidade inválida.");
  }

  const produto = db
    .prepare(
      `
      SELECT id, nome, stock, preco_custo, preco_venda, preco_venda_unitario, preco_compra_total, unidade_base
      FROM produtos
      WHERE id = ?
    `
    )
    .get(produtoId);
  if (!produto) {
    throw new Error("Produto não encontrado.");
  }

  if (tipo === "venda" && Number(produto.stock) < quantidade) {
    throw new Error("Stock insuficiente para efetuar a venda.");
  }

  const tx = db.transaction(() => {
    const precoUnitario =
      tipo === "entrada"
        ? sanitizeNumero(movimento.preco_unitario || produto.preco_custo || 0)
        : sanitizeNumero(movimento.preco_unitario || produto.preco_venda || produto.preco_venda_unitario || 0);
    const total = quantidade * precoUnitario;

    const inserted = db
      .prepare(
        `
        INSERT INTO movimentos (
          produto_id, tipo, quantidade, unidade, data, observacao, preco_unitario, total,
          usuario_id, cliente_id, fornecedor_id, forma_pagamento, status_pagamento, criado_em
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
      )
      .run(
        produtoId,
        tipo,
        quantidade,
        String(movimento.unidade || produto.unidade_base || "unidade"),
        movimento.observacao || "",
        precoUnitario,
        total,
        actor.id,
        movimento.cliente_id || null,
        movimento.fornecedor_id || null,
        movimento.forma_pagamento || (tipo === "venda" ? "dinheiro" : null),
        movimento.status_pagamento || "pago"
      );

    if (tipo === "entrada") {
      const novoStock = sanitizeNumero(produto.stock, 0) + quantidade;
      const novoPrecoCompraTotal = sanitizeNumero(produto.preco_compra_total, 0) + total;
      const novoCustoUnitario = novoStock > 0 ? novoPrecoCompraTotal / novoStock : 0;
      db.prepare(
        `
        UPDATE produtos
        SET stock = ?, quantidade_total = ?, preco_compra_total = ?, preco_custo = ?
        WHERE id = ?
      `
      ).run(
        novoStock,
        novoStock,
        novoPrecoCompraTotal,
        novoCustoUnitario,
        produtoId
      );
    } else {
      const stockAtual = sanitizeNumero(produto.stock, 0);
      const custoAtualUnitario = sanitizeNumero(produto.preco_custo, 0);
      const novoStock = stockAtual - quantidade;
      const novoPrecoCompraTotal = Math.max(0, sanitizeNumero(produto.preco_compra_total, custoAtualUnitario * stockAtual) - (custoAtualUnitario * quantidade));
      db.prepare(
        `
        UPDATE produtos
        SET stock = ?, quantidade_total = ?, preco_compra_total = ?
        WHERE id = ?
      `
      ).run(novoStock, novoStock, novoPrecoCompraTotal, produtoId);
      if (precoUnitario < custoAtualUnitario) {
        registrarAlerta({
          tipo: "atividade_suspeita",
          descricao: `Venda abaixo do custo para "${produto.nome}" (custo: ${produto.preco_custo}, venda: ${precoUnitario}).`,
        });
      }
      if ((movimento.status_pagamento || "pago") === "pendente") {
        db.prepare("INSERT INTO pagamentos (movimento_id, valor) VALUES (?, ?)").run(inserted.lastInsertRowid, 0);
      } else {
        db.prepare("INSERT INTO pagamentos (movimento_id, valor) VALUES (?, ?)").run(inserted.lastInsertRowid, total);
      }
    }

    logAuditoria({
      usuario_id: actor.id,
      acao: "criou",
      tabela: "movimentos",
      registro_id: inserted.lastInsertRowid,
      descricao: `${tipo === "venda" ? "Registou venda" : "Registou entrada"} de ${quantidade} ${produto.unidade_base || "un."} de ${produto.nome}`,
      dados_depois: movimento,
    });

    verificarAlertasProduto(produtoId);
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
    return db
      .prepare(
        `
        SELECT u.id, u.nome, u.email, u.criado_em, u.ativo, pf.nome AS perfil
        FROM usuarios u
        JOIN perfis pf ON pf.id = u.perfil_id
        ORDER BY u.criado_em DESC
      `
      )
      .all();
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("add-utilizador", (_, utilizador) => {
  try {
    const actor = requirePermissao(utilizador.usuario_id, "gerir_usuarios");
    const perfil = resolvePerfil(utilizador.perfil || "funcionario");
    const senhaNova = String(utilizador.senha || "").trim();
    if (senhaNova.length < 6) {
      throw new Error("Defina uma senha com pelo menos 6 caracteres para o novo utilizador.");
    }
    const passwordHash = hashPassword(senhaNova);
    const result = db
      .prepare("INSERT INTO utilizadores (nome, email, telefone, funcao) VALUES (?, ?, ?, ?)")
      .run(utilizador.nome, utilizador.email, utilizador.telefone, utilizador.funcao);
    db.prepare(
      "INSERT INTO usuarios (nome, email, senha, perfil_id, ativo, criado_em) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)"
    ).run(utilizador.nome, utilizador.email, passwordHash, perfil.id);
    logAuditoria({
      usuario_id: actor.id,
      acao: "criou",
      tabela: "usuarios",
      registro_id: result.lastInsertRowid,
      descricao: `Criou utilizador ${utilizador.email}`,
      dados_depois: sanitizeUsuarioParaLog(utilizador),
    });
    return { id: result.lastInsertRowid };
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("update-utilizador", (_, utilizador) => {
  try {
    const actor = requirePermissao(utilizador.usuario_id, "gerir_usuarios");
    const perfil = resolvePerfil(utilizador.perfil || "funcionario");
    const before = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(utilizador.id);
    db.prepare("UPDATE utilizadores SET nome=?, email=?, telefone=?, funcao=? WHERE id=?").run(
      utilizador.nome,
      utilizador.email,
      utilizador.telefone,
      utilizador.funcao,
      utilizador.id
    );
    db.prepare("UPDATE usuarios SET nome = ?, email = ?, perfil_id = ? WHERE id = ?").run(
      utilizador.nome,
      utilizador.email,
      perfil.id,
      utilizador.id
    );
    logAuditoria({
      usuario_id: actor.id,
      acao: "editou",
      tabela: "usuarios",
      registro_id: utilizador.id,
      descricao: `Editou utilizador ${utilizador.email}`,
      dados_antes: sanitizeUsuarioParaLog(before),
      dados_depois: sanitizeUsuarioParaLog(utilizador),
    });
    return true;
  } catch (err) {
    throw err;
  }
});

ipcMain.handle("delete-utilizador", (_, id) => {
  try {
    const actor = requirePermissao(id?.usuario_id, "gerir_usuarios");
    const userId = Number(id?.id || id);
    const before = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(userId);
    db.prepare("DELETE FROM utilizadores WHERE id=?").run(userId);
    db.prepare("DELETE FROM usuarios WHERE id=?").run(userId);
    logAuditoria({
      usuario_id: actor.id,
      acao: "apagou",
      tabela: "usuarios",
      registro_id: userId,
      descricao: `Apagou utilizador #${userId}`,
      dados_antes: sanitizeUsuarioParaLog(before),
    });
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
      .prepare(
        `
        SELECT u.id, u.nome, u.email, u.ativo, u.senha AS senha_hash, u.perfil_id, pf.nome AS perfil
        FROM usuarios u
        JOIN perfis pf ON pf.id = u.perfil_id
        WHERE u.email = ?
        LIMIT 1
      `
      )
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

  db.prepare("UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  const permissoes = getPermissoesPorPerfil(row.perfil_id);

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
    permissoes,
  };
});

ipcMain.handle("auth-can-register", () => {
  try {
    const row = db.prepare("SELECT COUNT(*) AS total FROM usuarios WHERE ativo = 1").get();
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

  const expectedMaster = getMasterRegistrationPassword();
  if (!expectedMaster) {
    throw new Error(
      "Registo inicial não configurado nesta versão instalada. Quem compilou deve definir BIZCONTROL_MASTER_PASSWORD ou criar electron/.registration-secret antes do empacotamento."
    );
  }
  if (masterPassword !== expectedMaster) {
    throw new Error("Senha mestre inválida.");
  }

  let row;
  try {
    row = db.prepare("SELECT COUNT(*) AS total FROM usuarios WHERE ativo = 1").get();
  } catch (err) {
    throw new Error("Erro ao validar disponibilidade para registo.");
  }

  if ((row?.total || 0) > 0) {
    throw new Error("Já existe uma conta ativa no sistema.");
  }

  const passwordHash = hashPassword(password);
  try {
    const perfilAdmin = resolvePerfil("admin");
    const result = db
      .prepare("INSERT INTO usuarios (nome, email, senha, perfil_id, ativo) VALUES (?, ?, ?, ?, 1)")
      .run(nome, email, passwordHash, perfilAdmin.id);
    db.prepare("INSERT INTO utilizadores (nome, email, telefone, funcao) VALUES (?, ?, ?, ?)").run(
      nome,
      email,
      "",
      "admin"
    );
    logAuditoria({
      usuario_id: result.lastInsertRowid,
      acao: "criou",
      tabela: "usuarios",
      registro_id: result.lastInsertRowid,
      descricao: "Conta administrativa inicial criada",
      dados_depois: { nome, email },
    });

    return {
      id: result.lastInsertRowid,
      nome,
      email,
      perfil: "admin",
      permissoes: BASE_PERMISSOES,
    };
  } catch (err) {
    if (err?.message?.includes("UNIQUE")) {
      throw new Error("Este email já está registado.");
    }
    throw new Error("Não foi possível criar a conta.");
  }
});

ipcMain.handle("get-clientes", () => db.prepare("SELECT * FROM clientes ORDER BY nome ASC").all());
ipcMain.handle("add-cliente", (_, payload) => {
  const actor = requirePermissao(payload.usuario_id, "criar_venda");
  const result = db
    .prepare("INSERT INTO clientes (nome, telefone, endereco) VALUES (?, ?, ?)")
    .run(payload.nome, payload.telefone || "", payload.endereco || "");
  logAuditoria({
    usuario_id: actor.id,
    acao: "criou",
    tabela: "clientes",
    registro_id: result.lastInsertRowid,
    descricao: `Criou cliente ${payload.nome}`,
    dados_depois: payload,
  });
  return { id: result.lastInsertRowid };
});

ipcMain.handle("get-fornecedores", () =>
  db.prepare("SELECT * FROM fornecedores ORDER BY nome ASC").all()
);

ipcMain.handle("add-fornecedor", (_, payload) => {
  const actor = requirePermissao(payload.usuario_id, "criar_venda");
  const result = db
    .prepare("INSERT INTO fornecedores (nome, contacto) VALUES (?, ?)")
    .run(payload.nome, payload.contacto || "");
  logAuditoria({
    usuario_id: actor.id,
    acao: "criou",
    tabela: "fornecedores",
    registro_id: result.lastInsertRowid,
    descricao: `Criou fornecedor ${payload.nome}`,
    dados_depois: payload,
  });
  return { id: result.lastInsertRowid };
});

ipcMain.handle("get-dividas", () => {
  return db
    .prepare(
      `
      SELECT c.id AS cliente_id, c.nome AS cliente_nome, SUM(m.total - COALESCE(pago.total_pago, 0)) AS total_divida
      FROM movimentos m
      JOIN clientes c ON c.id = m.cliente_id
      LEFT JOIN (
        SELECT movimento_id, SUM(valor) AS total_pago
        FROM pagamentos
        GROUP BY movimento_id
      ) pago ON pago.movimento_id = m.id
      WHERE m.tipo = 'venda'
        AND m.status_pagamento = 'pendente'
      GROUP BY c.id, c.nome
      HAVING total_divida > 0
      ORDER BY total_divida DESC
    `
    )
    .all();
});

ipcMain.handle("marcar-divida-paga", (_, payload) => {
  const actor = requirePermissao(payload.usuario_id, "registrar_pagamento");
  const movimento = db.prepare("SELECT * FROM movimentos WHERE id = ?").get(payload.movimento_id);
  if (!movimento) throw new Error("Movimento não encontrado.");
  db.transaction(() => {
    db.prepare("INSERT INTO pagamentos (movimento_id, valor) VALUES (?, ?)").run(
      payload.movimento_id,
      Number(payload.valor || movimento.total)
    );
    db.prepare("UPDATE movimentos SET status_pagamento = 'pago' WHERE id = ?").run(payload.movimento_id);
  })();
  logAuditoria({
    usuario_id: actor.id,
    acao: "editou",
    tabela: "movimentos",
    registro_id: payload.movimento_id,
    descricao: `Marcou dívida do movimento #${payload.movimento_id} como paga`,
  });
  return true;
});

ipcMain.handle("get-alertas", () =>
  db.prepare("SELECT * FROM alertas ORDER BY resolvido ASC, criado_em DESC LIMIT 100").all()
);
ipcMain.handle("resolver-alerta", (_, payload) => {
  const actor = requirePermissao(payload.usuario_id, "ver_logs");
  db.prepare("UPDATE alertas SET resolvido = 1 WHERE id = ?").run(payload.id);
  logAuditoria({
    usuario_id: actor.id,
    acao: "editou",
    tabela: "alertas",
    registro_id: payload.id,
    descricao: `Resolveu alerta #${payload.id}`,
  });
  return true;
});

ipcMain.handle("get-logs", (_, payload) => {
  const actor = requirePermissao(payload?.usuario_id, "ver_logs");
  void actor;
  return db.prepare("SELECT * FROM logs ORDER BY criado_em DESC LIMIT 300").all();
});

ipcMain.handle("get-perfis", () => db.prepare("SELECT * FROM perfis ORDER BY nome ASC").all());
ipcMain.handle("get-permissoes", () => db.prepare("SELECT * FROM permissoes ORDER BY nome ASC").all());
ipcMain.handle("get-perfil-permissoes", (_, perfilId) =>
  db
    .prepare(
      `
      SELECT p.nome
      FROM perfil_permissoes pp
      JOIN permissoes p ON p.id = pp.permissao_id
      WHERE pp.perfil_id = ?
    `
    )
    .all(perfilId)
    .map((item) => item.nome)
);

ipcMain.handle("get-usuario-permissoes", (_, usuarioId) => {
  try {
    const userContext = getUsuarioContext(usuarioId);
    if (!userContext) throw new Error("Usuário não encontrado ou inativo.");
    return getPermissoesPorPerfil(userContext.perfil_id);
  } catch (err) {
    console.error("❌ [MAIN] Erro ao buscar permissões do usuário:", err);
    throw err;
  }
});

ipcMain.handle("set-usuario-permissoes", (_, payload) => {
  // ATENÇÃO: A arquitetura atual de permissões é baseada em perfis (perfil_permissoes).
  // Para definir permissões específicas por usuário diretamente, seria necessário:
  // 1. Uma nova tabela `usuario_permissoes` no esquema da base de dados.
  // 2. Lógica para resolver permissões combinando perfil e usuário.
  // Por enquanto, esta funcionalidade não é suportada diretamente pelo backend.
  throw new Error(
    "Definição de permissões diretas por utilizador não suportada na arquitetura atual. As permissões são geridas por perfis."
  );
});

const getIntervaloPorPeriodo = (periodo) => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const toDateOnly = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  if (periodo === "hoje") {
    return { inicio: toDateOnly(now), fim: toDateOnly(now) };
  }

  if (periodo === "semana") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    return { inicio: toDateOnly(monday), fim: toDateOnly(now) };
  }

  if (periodo === "mes") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { inicio: toDateOnly(firstDay), fim: toDateOnly(now) };
  }

  return null;
};

ipcMain.handle("set-perfil-permissoes", (_, payload) => {
  const actor = requirePermissao(payload.usuario_id, "gerir_permissoes");
  const perfil = db.prepare("SELECT id FROM perfis WHERE id = ?").get(payload.perfil_id);
  if (!perfil) throw new Error("Perfil não encontrado.");
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM perfil_permissoes WHERE perfil_id = ?").run(payload.perfil_id);
    const insert = db.prepare("INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES (?, ?)");
    payload.permissoes.forEach((nome) => {
      const permissao = db.prepare("SELECT id FROM permissoes WHERE nome = ?").get(nome);
      if (permissao) insert.run(payload.perfil_id, permissao.id);
    });
  });
  tx();
  logAuditoria({
    usuario_id: actor.id,
    acao: "editou",
    tabela: "perfil_permissoes",
    registro_id: payload.perfil_id,
    descricao: `Atualizou permissões do perfil #${payload.perfil_id}`,
    dados_depois: payload.permissoes,
  });
  return true;
});

ipcMain.handle("get-relatorio-vendas", (_, filtro = {}) => {
  const inicio = filtro.dataInicio || "1970-01-01";
  const fim = filtro.dataFim || "2999-12-31";
  const produtoId = filtro.produtoId || null;
  const clienteId = filtro.clienteId || null;
  const whereProduto = produtoId ? "AND m.produto_id = @produtoId" : "";
  const whereCliente = clienteId ? "AND m.cliente_id = @clienteId" : "";
  return db
    .prepare(
      `
      SELECT m.*, p.nome AS produto_nome, c.nome AS cliente_nome,
      (m.preco_unitario - COALESCE(p.preco_custo, 0)) * m.quantidade AS lucro
      FROM movimentos m
      JOIN produtos p ON p.id = m.produto_id
      LEFT JOIN clientes c ON c.id = m.cliente_id
      WHERE m.tipo = 'venda'
        AND DATE(COALESCE(m.criado_em, m.data)) BETWEEN @inicio AND @fim
        ${whereProduto}
        ${whereCliente}
      ORDER BY COALESCE(m.criado_em, m.data) DESC
    `
    )
    .all({ inicio, fim, produtoId, clienteId });
});

ipcMain.handle("get-relatorio-analise", (_, filtro = {}) => {
  const periodo = String(filtro.periodo || "").trim().toLowerCase();
  const intervaloPeriodo = getIntervaloPorPeriodo(periodo);
  const inicio = filtro.dataInicio || intervaloPeriodo?.inicio || "1970-01-01";
  const fim = filtro.dataFim || intervaloPeriodo?.fim || "2999-12-31";
  const produtoId = filtro.produtoId ? Number(filtro.produtoId) : null;

  const whereProduto = produtoId ? "AND m.produto_id = @produtoId" : "";
  const params = { inicio, fim, produtoId };

  const resumo = db
    .prepare(
      `
      SELECT
        COUNT(*) AS numero_vendas,
        COALESCE(SUM(m.total), 0) AS total_vendas,
        COALESCE(SUM((m.preco_unitario - COALESCE(p.preco_custo, 0)) * m.quantidade), 0) AS total_lucro
      FROM movimentos m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.tipo = 'venda'
        AND DATE(COALESCE(m.criado_em, m.data)) BETWEEN @inicio AND @fim
        ${whereProduto}
    `
    )
    .get(params);

  const lucroDiario = db
    .prepare(
      `
      SELECT
        DATE(COALESCE(m.criado_em, m.data)) AS data,
        COALESCE(SUM(m.total), 0) AS total_vendas,
        COALESCE(SUM((m.preco_unitario - COALESCE(p.preco_custo, 0)) * m.quantidade), 0) AS total_lucro
      FROM movimentos m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.tipo = 'venda'
        AND DATE(COALESCE(m.criado_em, m.data)) BETWEEN @inicio AND @fim
        ${whereProduto}
      GROUP BY DATE(COALESCE(m.criado_em, m.data))
      ORDER BY data DESC
    `
    )
    .all(params);

  const maisVendidos = db
    .prepare(
      `
      SELECT
        m.produto_id,
        p.nome,
        COALESCE(SUM(m.quantidade), 0) AS quantidade_total_vendida
      FROM movimentos m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.tipo = 'venda'
        AND DATE(COALESCE(m.criado_em, m.data)) BETWEEN @inicio AND @fim
        ${whereProduto}
      GROUP BY m.produto_id, p.nome
      ORDER BY quantidade_total_vendida DESC, p.nome ASC
    `
    )
    .all(params);

  return {
    filtrosAplicados: { periodo, dataInicio: inicio, dataFim: fim, produtoId },
    resumo: {
      total_vendas: Number(resumo?.total_vendas || 0),
      total_lucro: Number(resumo?.total_lucro || 0),
      numero_vendas: Number(resumo?.numero_vendas || 0),
    },
    lucroDiario,
    produtosMaisVendidos: maisVendidos,
  };
});

ipcMain.handle("ping", () => "ok");

// Listener para confirmar preload carregado
ipcMain.on("preload-loaded", () => {
  devLog("Preload carregado");
});
