const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");
console.log("🗄️ [DB] Inicializando banco em:", dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const createTables = () => {
  console.log("🛠️ [DB] Criando tabelas");

  db.exec(`
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
  `);

  console.log("✅ [DB] Tabelas criadas/verificadas com sucesso");
};

createTables();

module.exports = db;