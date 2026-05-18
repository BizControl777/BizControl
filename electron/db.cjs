const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let db;

const dbDevLog = (...args) => {
  try {
    if (!app.isPackaged) console.log("[DB]", ...args);
  } catch (_) {
    /* antes de ready */
  }
};

const createTables = (database) => {
  dbDevLog("Criando/atualizando tabelas");

  database.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      categoria TEXT,
      preco REAL,
      stock INTEGER
    );

    CREATE TABLE IF NOT EXISTS movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER,
      tipo TEXT,
      quantidade INTEGER,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      observacao TEXT,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS utilizadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      telefone TEXT,
      funcao TEXT,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT DEFAULT 'admin',
      ativo INTEGER DEFAULT 1,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ultimo_login TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS perfis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS perfil_permissoes (
      perfil_id INTEGER NOT NULL,
      permissao_id INTEGER NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (perfil_id, permissao_id),
      FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE,
      FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usuario_permissoes (
      usuario_id INTEGER NOT NULL,
      permissao_id INTEGER NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (usuario_id, permissao_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil_id INTEGER NOT NULL,
      telefone TEXT,
      funcao TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ultimo_login TIMESTAMP,
      FOREIGN KEY (perfil_id) REFERENCES perfis(id)
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      endereco TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      contacto TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movimento_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (movimento_id) REFERENCES movimentos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      acao TEXT NOT NULL,
      tabela TEXT NOT NULL,
      registro_id INTEGER,
      descricao TEXT,
      dados_antes TEXT,
      dados_depois TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS alertas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      resolvido INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const tableHasColumn = (table, column) => {
    const cols = database.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((item) => item.name === column);
  };

  const ensureColumn = (table, column, definition) => {
    if (!tableHasColumn(table, column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  // Compatibilidade progressiva: adiciona campos sem destruir dados legados.
  ensureColumn("produtos", "preco_custo", "REAL DEFAULT 0");
  ensureColumn("produtos", "preco_venda", "REAL DEFAULT 0");
  ensureColumn("produtos", "unidade_base", "TEXT DEFAULT 'unidade'");
  ensureColumn("produtos", "quantidade_total", "REAL DEFAULT 0");
  ensureColumn("produtos", "preco_compra_total", "REAL DEFAULT 0");
  ensureColumn("produtos", "preco_venda_unitario", "REAL DEFAULT 0");

  ensureColumn("movimentos", "preco_unitario", "REAL DEFAULT 0");
  ensureColumn("movimentos", "total", "REAL DEFAULT 0");
  ensureColumn("movimentos", "usuario_id", "INTEGER");
  ensureColumn("movimentos", "cliente_id", "INTEGER");
  ensureColumn("movimentos", "fornecedor_id", "INTEGER");
  ensureColumn("movimentos", "forma_pagamento", "TEXT");
  ensureColumn("movimentos", "status_pagamento", "TEXT DEFAULT 'pago'");
  ensureColumn("movimentos", "unidade", "TEXT");
  // SQLite não permite CURRENT_TIMESTAMP em ALTER TABLE ADD COLUMN.
  // Para migração segura, adicionamos sem default e normalizamos via UPDATE abaixo.
  ensureColumn("movimentos", "criado_em", "TIMESTAMP");
  ensureColumn("usuarios", "telefone", "TEXT");
  ensureColumn("usuarios", "funcao", "TEXT");

  database.exec(`
    UPDATE produtos
    SET preco_custo = COALESCE(preco_custo, preco, 0),
        preco_venda = COALESCE(preco_venda, preco, 0),
        quantidade_total = CASE
          WHEN quantidade_total IS NULL OR quantidade_total <= 0 THEN COALESCE(stock, 0)
          ELSE quantidade_total
        END,
        preco_compra_total = CASE
          WHEN preco_compra_total IS NULL OR preco_compra_total <= 0
            THEN COALESCE(preco_custo, preco, 0) * COALESCE(
              CASE WHEN quantidade_total > 0 THEN quantidade_total ELSE stock END,
              0
            )
          ELSE preco_compra_total
        END,
        preco_venda_unitario = COALESCE(preco_venda_unitario, preco_venda, preco, 0),
        unidade_base = COALESCE(NULLIF(unidade_base, ''), 'unidade'),
        stock = COALESCE(stock, quantidade_total, 0);
  `);

  database.exec(`
    UPDATE usuarios
    SET telefone = COALESCE(
      (SELECT telefone FROM utilizadores v WHERE v.email = usuarios.email LIMIT 1),
      telefone
    ),
    funcao = COALESCE(
      (SELECT funcao FROM utilizadores v WHERE v.email = usuarios.email LIMIT 1),
      funcao
    )
    WHERE EXISTS (SELECT 1 FROM utilizadores v WHERE v.email = usuarios.email);
  `);

  database.exec(`
    UPDATE movimentos
    SET criado_em = COALESCE(criado_em, data, CURRENT_TIMESTAMP),
        total = CASE
          WHEN total IS NULL OR total = 0 THEN COALESCE(quantidade, 0) * COALESCE(preco_unitario, 0)
          ELSE total
        END,
        status_pagamento = COALESCE(NULLIF(status_pagamento, ''), 'pago');
  `);

  const upsertPerfil = database.prepare(
    "INSERT INTO perfis (nome) VALUES (?) ON CONFLICT(nome) DO NOTHING"
  );
  upsertPerfil.run("admin");
  upsertPerfil.run("funcionario");

  const basePermissoes = [
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

  const upsertPermissao = database.prepare(
    "INSERT INTO permissoes (nome) VALUES (?) ON CONFLICT(nome) DO NOTHING"
  );
  basePermissoes.forEach((nome) => upsertPermissao.run(nome));

  const perfis = database.prepare("SELECT id, nome FROM perfis").all();
  const permissoes = database.prepare("SELECT id, nome FROM permissoes").all();
  const permissaoByNome = new Map(permissoes.map((item) => [item.nome, item.id]));
  const upsertPerfilPermissao = database.prepare(
    "INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES (?, ?) ON CONFLICT(perfil_id, permissao_id) DO NOTHING"
  );

  perfis.forEach((perfil) => {
    const isAdmin = perfil.nome === "admin";
    basePermissoes.forEach((permNome) => {
      if (!isAdmin && ["apagar_produto", "alterar_preco", "ver_relatorios_financeiros", "gerir_permissoes"].includes(permNome)) {
        return;
      }
      upsertPerfilPermissao.run(perfil.id, permissaoByNome.get(permNome));
    });
  });

  const usersCount = database.prepare("SELECT COUNT(*) AS total FROM usuarios").get()?.total || 0;
  if (usersCount === 0) {
    const legacy = database
      .prepare("SELECT nome, email, senha_hash, perfil, ativo, data_criacao, ultimo_login FROM auth_users ORDER BY id ASC")
      .all();
    const adminId = database.prepare("SELECT id FROM perfis WHERE nome = 'admin'").get()?.id;
    const funcionarioId = database.prepare("SELECT id FROM perfis WHERE nome = 'funcionario'").get()?.id;
    const insertUsuario = database.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, criado_em, ultimo_login)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    legacy.forEach((item) => {
      const perfilId = item.perfil === "funcionario" ? funcionarioId : adminId;
      insertUsuario.run(
        item.nome,
        item.email,
        item.senha_hash,
        perfilId,
        item.ativo ?? 1,
        item.data_criacao || new Date().toISOString(),
        item.ultimo_login || null
      );
    });

    // Se ainda não há usuários, criar um admin padrão
    const finalUsersCount = database.prepare("SELECT COUNT(*) AS total FROM usuarios").get()?.total || 0;
    if (finalUsersCount === 0) {
      const crypto = require("crypto");
      const hashPassword = (password) => {
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
        return `${salt}:${hash}`;
      };
      const defaultPasswordHash = hashPassword("admin123");
      insertUsuario.run(
        "Administrador",
        "admin@bizcontrol.com",
        defaultPasswordHash,
        adminId,
        1,
        new Date().toISOString(),
        null
      );
      dbDevLog("Usuário padrão criado: admin@bizcontrol.com / admin123");
    }
  }

  dbDevLog("Tabelas prontas");
};

/**
 * Abre o SQLite numa pasta gravável (userData), não dentro do app.asar.
 * Deve ser chamado após app.whenReady() no processo principal.
 */
function initDatabase() {
  if (db) return db;

  const userDataPath = app.getPath("userData");
  fs.mkdirSync(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, "database.sqlite");
  dbDevLog("Base de dados:", dbPath);

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Evita falhas intermitentes em uso prolongado (ex.: app instalado no Windows)
  // quando há lock temporário do arquivo SQLite.
  db.pragma("busy_timeout = 5000");
  createTables(db);
  return db;
}

module.exports = { initDatabase };
