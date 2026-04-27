const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto");

const dbPath = path.join(__dirname, "database.sqlite");
console.log("🗄️ [DB] Inicializando banco em:", dbPath);

const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
  console.log("🛠️ [DB] Criando tabelas");
  
  // Tabela de produtos
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      categoria TEXT,
      preco REAL,
      stock INTEGER
    )
  `, (err) => {
    if (err) {
      console.error("❌ [DB] Erro ao criar tabela produtos:", err);
    } else {
      console.log("✅ [DB] Tabela produtos criada/verificada");
    }
  });

  // Tabela de movimentos
  db.run(`
    CREATE TABLE IF NOT EXISTS movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER,
      tipo TEXT,
      quantidade INTEGER,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      observacao TEXT,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `, (err) => {
    if (err) {
      console.error("❌ [DB] Erro ao criar tabela movimentos:", err);
    } else {
      console.log("✅ [DB] Tabela movimentos criada/verificada");
    }
  });

  // Tabela de utilizadores
  db.run(`
    CREATE TABLE IF NOT EXISTS utilizadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      telefone TEXT,
      funcao TEXT,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error("❌ [DB] Erro ao criar tabela utilizadores:", err);
    } else {
      console.log("✅ [DB] Tabela utilizadores criada/verificada");
    }
  });

  // Tabela de autenticação
  db.run(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT DEFAULT 'admin',
      ativo INTEGER DEFAULT 1,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ultimo_login TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error("❌ [DB] Erro ao criar tabela auth_users:", err);
    } else {
      console.log("✅ [DB] Tabela auth_users criada/verificada");
    }
  });
});

module.exports = db;