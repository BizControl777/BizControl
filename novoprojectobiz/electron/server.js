import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "seu_segredo_jwt_muito_seguro_aqui";

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Resolve DB path and ensure directory/file exist to avoid SQLITE_CANTOPEN
const defaultDbPath = path.resolve(path.join(__dirname, "..", "data", "bizcontrol.db"));
const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : defaultDbPath;

try {
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });
  // Ensure the DB file exists (open with append flag creates if missing)
  const fd = fs.openSync(dbPath, "a");
  fs.closeSync(fd);
  try {
    fs.chmodSync(dbPath, 0o644);
  } catch (e) {
    // Non-fatal: permission change may fail on some filesystems
  }
} catch (err) {
  console.error("Erro ao criar diretório/ficheiro do DB:", err);
}

// Inicializar banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
  } else {
    console.log("✓ Banco de dados conectado ->", dbPath);
    initDatabase();
  }
});

// Inicializar tabelas
function initDatabase() {
  db.serialize(() => {
    // Tabela de usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        role TEXT DEFAULT 'vendedor',
        empresa_id INTEGER,
        ativo INTEGER DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de empresas
    db.run(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cnpj TEXT UNIQUE,
        endereco TEXT,
        telefone TEXT,
        email TEXT,
        ativo INTEGER DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de categorias
    db.run(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        empresa_id INTEGER,
        ativo INTEGER DEFAULT 1
      )
    `);

    // Tabela de produtos
    db.run(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        categoria_id INTEGER,
        empresa_id INTEGER,
        preco_venda REAL NOT NULL,
        preco_custo REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        stock_minimo INTEGER DEFAULT 10,
        ativo INTEGER DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(categoria_id) REFERENCES categorias(id),
        FOREIGN KEY(empresa_id) REFERENCES empresas(id)
      )
    `);

    // Tabela de vendas
    db.run(`
      CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        empresa_id INTEGER,
        total REAL NOT NULL,
        status TEXT DEFAULT 'concluida',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(empresa_id) REFERENCES empresas(id)
      )
    `);

    // Tabela de itens de venda
    db.run(`
      CREATE TABLE IF NOT EXISTS itens_venda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER,
        produto_id INTEGER,
        quantidade INTEGER NOT NULL,
        preco_unitario REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY(venda_id) REFERENCES vendas(id),
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de movimentações de stock
    db.run(`
      CREATE TABLE IF NOT EXISTS movimentacoes_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        empresa_id INTEGER,
        tipo TEXT,
        quantidade INTEGER,
        usuario_id INTEGER,
        descricao TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(produto_id) REFERENCES produtos(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(empresa_id) REFERENCES empresas(id)
      )
    `);

    // Tabela de reservas
    db.run(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        produto_id INTEGER,
        empresa_id INTEGER,
        quantidade INTEGER NOT NULL,
        status TEXT DEFAULT 'pendente',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(produto_id) REFERENCES produtos(id),
        FOREIGN KEY(empresa_id) REFERENCES empresas(id)
      )
    `);

    migrateProdutosColumns();
    migrateVendasColumns();

    // Inserir dados demo
    db.all("SELECT COUNT(*) as count FROM usuarios", [], (err, rows) => {
      if (rows && rows[0].count === 0) {
        insertDemoData();
      }
    });
  });
}

function migrateProdutosColumns() {
  const columns = [
    ["unidade_medida", "TEXT DEFAULT 'Unidade'"],
    ["qtd_por_caixa", "INTEGER DEFAULT 1"],
    ["preco_compra_caixa", "REAL DEFAULT 0"],
    ["preco_venda_caixa", "REAL DEFAULT 0"],
    ["tamanho", "TEXT"],
    ["marca", "TEXT"],
    ["descricao", "TEXT"],
    ["codigo_barras", "TEXT"],
  ];
  columns.forEach(([name, type]) => {
    db.run(`ALTER TABLE produtos ADD COLUMN ${name} ${type}`, (err) => {
      if (err && !String(err.message).includes("duplicate column")) {
        // coluna já existe — ignorar
      }
    });
  });
}

function migrateVendasColumns() {
  const columns = [
    ["metodo_pagamento", "TEXT DEFAULT 'dinheiro'"],
    ["status_pagamento", "TEXT DEFAULT 'pago'"],
    ["cliente_nome", "TEXT DEFAULT 'Cliente balcão'"],
    ["cliente_contacto", "TEXT"],
    ["valor_recebido", "REAL DEFAULT 0"],
    ["troco", "REAL DEFAULT 0"],
  ];
  columns.forEach(([name, type]) => {
    db.run(`ALTER TABLE vendas ADD COLUMN ${name} ${type}`, (err) => {
      if (err && !String(err.message).includes("duplicate column")) {
        console.warn(`Falha ao migrar vendas.${name}:`, err.message);
      }
    });
  });
}

function resolveCategoriaId(categoria_id, empresaId, callback) {
  if (!categoria_id) return callback(null, null);
  if (typeof categoria_id === "number" || /^\d+$/.test(String(categoria_id))) {
    return callback(null, Number(categoria_id));
  }
  const nome = String(categoria_id).trim();
  db.get("SELECT id FROM categorias WHERE nome = ? AND empresa_id = ?", [nome, empresaId], (err, row) => {
    if (row) return callback(null, row.id);
    db.run("INSERT INTO categorias (nome, empresa_id) VALUES (?, ?)", [nome, empresaId], function (insErr) {
      if (insErr) return callback(insErr);
      callback(null, this.lastID);
    });
  });
}

// Inserir dados de demonstração
function insertDemoData() {
  const hashedPassword = bcrypt.hashSync("demo123", 10);

  db.run("INSERT INTO empresas (nome, cnpj, endereco, telefone, email) VALUES (?, ?, ?, ?, ?)", [
    "BizControl Demo",
    "12345678000100",
    "Maputo, Moçambique",
    "+258123456789",
    "contact@bizcontrol.local",
  ]);

  db.all("SELECT id FROM empresas LIMIT 1", [], (err, rows) => {
    if (rows && rows[0]) {
      const empresaId = rows[0].id;

      db.run(
        "INSERT INTO usuarios (nome, email, senha, role, empresa_id) VALUES (?, ?, ?, ?, ?)",
        ["Admin", "admin@bizcontrol.local", hashedPassword, "super", empresaId]
      );

      db.run(
        "INSERT INTO usuarios (nome, email, senha, role, empresa_id) VALUES (?, ?, ?, ?, ?)",
        ["Gestor", "gestor@bizcontrol.local", hashedPassword, "gestor", empresaId]
      );

      db.run(
        "INSERT INTO usuarios (nome, email, senha, role, empresa_id) VALUES (?, ?, ?, ?, ?)",
        ["Vendedor", "vendedor@bizcontrol.local", hashedPassword, "vendedor", empresaId]
      );

      // Categorias
      const categorias = ["Bebidas", "Alimentos", "Higiene", "Electrónica"];
      categorias.forEach((cat) => {
        db.run("INSERT INTO categorias (nome, empresa_id) VALUES (?, ?)", [cat, empresaId]);
      });

      console.log("✓ Dados de demonstração inseridos");
    }
  });
}

// Middleware de autenticação
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.empresaId = decoded.empresaId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

// ===== ROTAS DE AUTENTICAÇÃO =====
app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;

  db.get("SELECT * FROM usuarios WHERE email = ? AND ativo = 1", [email], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: "Utilizador não encontrado" });
    }

    const passwordValid = bcrypt.compareSync(senha, user.senha);
    if (!passwordValid) {
      return res.status(401).json({ message: "Senha incorreta" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, empresaId: user.empresa_id },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        empresa_id: user.empresa_id,
      },
    });
  });
});

// ===== ROTAS DE CATEGORIAS =====
app.get("/api/categorias", verifyToken, (req, res) => {
  db.all("SELECT id, nome FROM categorias WHERE empresa_id = ? AND ativo = 1 ORDER BY nome", [req.empresaId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar categorias" });
    res.json(rows);
  });
});

app.post("/api/categorias", verifyToken, (req, res) => {
  const { nome } = req.body;
  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ message: "Nome da categoria é obrigatório" });
  }
  db.get("SELECT id FROM categorias WHERE nome = ? AND empresa_id = ?", [nome.trim(), req.empresaId], (err, row) => {
    if (row) return res.json({ id: row.id, message: "Categoria já existe" });
    db.run("INSERT INTO categorias (nome, empresa_id) VALUES (?, ?)", [nome.trim(), req.empresaId], function (insErr) {
      if (insErr) return res.status(500).json({ message: "Erro ao criar categoria" });
      res.json({ id: this.lastID, message: "Categoria criada com sucesso" });
    });
  });
});

// ===== ROTAS DE PRODUTOS =====
const PRODUTOS_SELECT = `
  SELECT p.*, c.nome AS categoria_nome
  FROM produtos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  WHERE p.empresa_id = ? AND p.ativo = 1
  ORDER BY p.nome
`;

app.get("/api/produtos", verifyToken, (req, res) => {
  db.all(PRODUTOS_SELECT, [req.empresaId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar produtos" });
    res.json(rows);
  });
});

app.post("/api/produtos", verifyToken, (req, res) => {
  const {
    nome,
    categoria_id,
    preco_venda,
    preco_custo,
    stock_minimo,
    stock,
    unidade_medida,
    qtd_por_caixa,
    preco_compra_caixa,
    preco_venda_caixa,
    tamanho,
    marca,
    descricao,
    codigo_barras,
  } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ message: "Nome do produto é obrigatório" });
  }

  const custo = Number(preco_custo ?? 0);
  const venda = Number(preco_venda ?? 0);
  if (venda <= 0) {
    return res.status(400).json({ message: "Preço de venda deve ser maior que zero" });
  }
  if (custo > 0 && venda < custo) {
    return res.status(400).json({ message: "Margem negativa bloqueada: preço de venda abaixo do custo" });
  }

  resolveCategoriaId(categoria_id, req.empresaId, (catErr, catId) => {
    if (catErr) return res.status(500).json({ message: "Erro ao resolver categoria" });

    const qtdCx = Math.max(1, Number(qtd_por_caixa) || 1);
    const precoCx = Number(preco_venda_caixa) || venda * qtdCx;
    const compraCx = Number(preco_compra_caixa) || custo * qtdCx;

    db.run(
      `INSERT INTO produtos (
        nome, categoria_id, empresa_id, preco_venda, preco_custo, stock, stock_minimo,
        unidade_medida, qtd_por_caixa, preco_compra_caixa, preco_venda_caixa, tamanho, marca, descricao, codigo_barras
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        catId,
        req.empresaId,
        venda,
        custo,
        Number(stock) || 0,
        Number(stock_minimo) ?? 10,
        unidade_medida || "Unidade",
        qtdCx,
        compraCx,
        precoCx,
        tamanho || null,
        marca || null,
        descricao || null,
        codigo_barras || null,
      ],
      function (err) {
        if (err) return res.status(500).json({ message: "Erro ao criar produto: " + err.message });
        res.json({ id: this.lastID, message: "Produto criado com sucesso" });
      }
    );
  });
});

app.put("/api/produtos/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const body = req.body;

  db.get("SELECT * FROM produtos WHERE id = ? AND empresa_id = ?", [id, req.empresaId], (err, produto) => {
    if (err || !produto) return res.status(404).json({ message: "Produto não encontrado" });

    const applyUpdate = (catId) => {
      const nome = body.nome != null ? body.nome : produto.nome;
      const preco_venda = body.preco_venda != null ? Number(body.preco_venda) : produto.preco_venda;
      const preco_custo = body.preco_custo != null ? Number(body.preco_custo) : produto.preco_custo;
      const stock = body.stock != null ? Number(body.stock) : produto.stock;
      const stock_minimo = body.stock_minimo != null ? Number(body.stock_minimo) : produto.stock_minimo;
      const categoria_id = catId != null ? catId : produto.categoria_id;
      const unidade_medida = body.unidade_medida ?? produto.unidade_medida;
      const qtd_por_caixa = body.qtd_por_caixa != null ? Math.max(1, Number(body.qtd_por_caixa)) : produto.qtd_por_caixa;
      const preco_compra_caixa = body.preco_compra_caixa != null ? Number(body.preco_compra_caixa) : produto.preco_compra_caixa;
      const preco_venda_caixa = body.preco_venda_caixa != null ? Number(body.preco_venda_caixa) : produto.preco_venda_caixa;
      const tamanho = body.tamanho !== undefined ? body.tamanho : produto.tamanho;
      const marca = body.marca !== undefined ? body.marca : produto.marca;
      const descricao = body.descricao !== undefined ? body.descricao : produto.descricao;
      const codigo_barras = body.codigo_barras !== undefined ? body.codigo_barras : produto.codigo_barras;

      if (preco_venda <= 0) {
        return res.status(400).json({ message: "Preço de venda deve ser maior que zero" });
      }
      if (preco_custo > 0 && preco_venda < preco_custo) {
        return res.status(400).json({ message: "Margem negativa bloqueada: preço de venda abaixo do custo" });
      }

      db.run(
        `UPDATE produtos SET
          nome = ?, categoria_id = ?, preco_venda = ?, preco_custo = ?, stock = ?, stock_minimo = ?,
          unidade_medida = ?, qtd_por_caixa = ?, preco_compra_caixa = ?, preco_venda_caixa = ?,
          tamanho = ?, marca = ?, descricao = ?, codigo_barras = ?
        WHERE id = ? AND empresa_id = ?`,
        [
          nome,
          categoria_id,
          preco_venda,
          preco_custo,
          stock,
          stock_minimo,
          unidade_medida,
          qtd_por_caixa,
          preco_compra_caixa,
          preco_venda_caixa,
          tamanho,
          marca,
          descricao,
          codigo_barras,
          id,
          req.empresaId,
        ],
        function (updErr) {
          if (updErr) return res.status(500).json({ message: "Erro ao atualizar produto" });
          res.json({ message: "Produto atualizado com sucesso" });
        }
      );
    };

    if (body.categoria_id != null) {
      resolveCategoriaId(body.categoria_id, req.empresaId, (catErr, catId) => {
        if (catErr) return res.status(500).json({ message: "Erro ao resolver categoria" });
        applyUpdate(catId);
      });
    } else {
      applyUpdate(null);
    }
  });
});

app.delete("/api/produtos/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE produtos SET ativo = 0 WHERE id = ? AND empresa_id = ?",
    [id, req.empresaId],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao remover produto" });
      if (this.changes === 0) return res.status(404).json({ message: "Produto não encontrado" });
      res.json({ message: "Produto removido com sucesso" });
    }
  );
});

// ===== MOVIMENTAÇÕES DE STOCK =====
app.post("/api/movimentacoes", verifyToken, (req, res) => {
  const { produto_id, quantidade, tipo, descricao, observacao } = req.body;
  const qty = Math.abs(Number(quantidade) || 0);
  if (!produto_id || qty <= 0) {
    return res.status(400).json({ message: "Produto e quantidade são obrigatórios" });
  }

  const tipoNorm = String(tipo || "entrada").toLowerCase();
  const desc = descricao || observacao || `Movimento: ${tipoNorm}`;

  db.get("SELECT stock FROM produtos WHERE id = ? AND empresa_id = ? AND ativo = 1", [produto_id, req.empresaId], (err, produto) => {
    if (err || !produto) return res.status(404).json({ message: "Produto não encontrado" });

    let delta = qty;
    if (tipoNorm === "saida" || tipoNorm === "venda") delta = -qty;
    if (tipoNorm === "entrada") delta = qty;

    const novoStock = produto.stock + delta;
    if (novoStock < 0) {
      return res.status(400).json({ message: "Stock insuficiente para esta operação" });
    }

    db.run(
      "INSERT INTO movimentacoes_stock (produto_id, empresa_id, tipo, quantidade, usuario_id, descricao) VALUES (?, ?, ?, ?, ?, ?)",
      [produto_id, req.empresaId, tipoNorm, qty, req.userId, desc],
      function (movErr) {
        if (movErr) return res.status(500).json({ message: "Erro ao registar movimento" });
        const movId = this.lastID;
        db.run("UPDATE produtos SET stock = ? WHERE id = ?", [novoStock, produto_id], (updErr) => {
          if (updErr) return res.status(500).json({ message: "Erro ao atualizar stock" });
          res.json({ id: movId, stock: novoStock, message: "Movimento registado com sucesso" });
        });
      }
    );
  });
});

app.get("/api/movimentacoes", verifyToken, (req, res) => {
  db.all(
    `SELECT m.*, p.nome AS produto_nome, p.preco_custo AS produto_preco_custo,
            u.nome AS usuario_nome
     FROM movimentacoes_stock m
     LEFT JOIN produtos p ON m.produto_id = p.id
     LEFT JOIN usuarios u ON m.usuario_id = u.id
     WHERE m.empresa_id = ?
     ORDER BY m.criado_em DESC
     LIMIT 500`,
    [req.empresaId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erro ao buscar movimentos" });
      res.json(rows);
    }
  );
});

// ===== ROTAS DE VENDAS =====
app.post("/api/vendas", verifyToken, (req, res) => {
  const {
    itens,
    total,
    metodo_pagamento = "dinheiro",
    status_pagamento = "pago",
    cliente_nome = "Cliente balcão",
    cliente_contacto = "",
    valor_recebido = 0,
    troco = 0,
  } = req.body;

  if (!Array.isArray(itens) || !itens.length) {
    return res.status(400).json({ message: "Itens da venda são obrigatórios" });
  }

  const validarStock = (cb) => {
    let pending = itens.length;
    let erro = null;
    let custoTotal = 0;
    let totalCalculado = 0;

    itens.forEach((item) => {
      const qty = Number(item.quantidade) || 0;
      const pid = item.produto_id;
      const lineTotal = Number(item.total) || 0;
      if (qty <= 0) {
        erro = "Quantidade inválida na venda";
        pending--;
        if (pending === 0) cb(erro, custoTotal, totalCalculado);
        return;
      }
      if (lineTotal <= 0) {
        erro = "Total inválido na venda";
        pending--;
        if (pending === 0) cb(erro, custoTotal, totalCalculado);
        return;
      }
      db.get(
        "SELECT id, nome, stock, preco_custo FROM produtos WHERE id = ? AND empresa_id = ? AND ativo = 1",
        [pid, req.empresaId],
        (err, row) => {
          pending--;
          if (err || !row) erro = erro || "Produto não encontrado";
          else if (row.stock < qty) erro = `Stock insuficiente para ${row.nome}`;
          else {
            custoTotal += (Number(row.preco_custo) || 0) * qty;
            totalCalculado += lineTotal;
          }
          if (pending === 0) cb(erro, custoTotal, totalCalculado);
        }
      );
    });
  };

  validarStock((stockErr, custoTotal, totalCalculado) => {
    if (stockErr) return res.status(400).json({ message: stockErr });
    const vendaTotal = Number(totalCalculado || total || 0);
    if (vendaTotal <= 0) return res.status(400).json({ message: "Total da venda deve ser maior que zero" });
    if (vendaTotal < custoTotal) {
      return res.status(400).json({ message: "Venda bloqueada: margem negativa" });
    }

    db.run(
      `INSERT INTO vendas (
        usuario_id, empresa_id, total, metodo_pagamento, status_pagamento,
        cliente_nome, cliente_contacto, valor_recebido, troco
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        req.empresaId,
        vendaTotal,
        String(metodo_pagamento || "dinheiro"),
        String(status_pagamento || "pago"),
        String(cliente_nome || "Cliente balcão"),
        String(cliente_contacto || ""),
        Number(valor_recebido) || 0,
        Number(troco) || 0,
      ],
      function (err) {
        if (err) return res.status(500).json({ message: "Erro ao registar venda" });

        const vendaId = this.lastID;

        itens.forEach((item) => {
          const qty = Number(item.quantidade) || 0;
          db.run(
            "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, total) VALUES (?, ?, ?, ?, ?)",
            [vendaId, item.produto_id, qty, item.preco_unitario, item.total]
          );
          db.run("UPDATE produtos SET stock = stock - ? WHERE id = ? AND empresa_id = ?", [
            qty,
            item.produto_id,
            req.empresaId,
          ]);
          db.run(
            "INSERT INTO movimentacoes_stock (produto_id, empresa_id, tipo, quantidade, usuario_id, descricao) VALUES (?, ?, ?, ?, ?, ?)",
            [item.produto_id, req.empresaId, "venda", qty, req.userId, "Venda POS"]
          );
        });

        res.json({ id: vendaId, message: "Venda registada com sucesso" });
      }
    );
  });
});

app.get("/api/vendas", verifyToken, (req, res) => {
  db.all(
    `SELECT v.*, u.nome AS vendedor,
            COALESCE(v.total - SUM(iv.quantidade * COALESCE(p.preco_custo, 0)), v.total) AS lucro
     FROM vendas v
     LEFT JOIN usuarios u ON v.usuario_id = u.id
     LEFT JOIN itens_venda iv ON iv.venda_id = v.id
     LEFT JOIN produtos p ON p.id = iv.produto_id
     WHERE v.empresa_id = ?
     GROUP BY v.id
     ORDER BY v.criado_em DESC
     LIMIT 300`,
    [req.empresaId],
    (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Erro ao buscar vendas" });
    }
    res.json(rows);
    }
  );
});

app.put("/api/vendas/:id/pagamento", verifyToken, (req, res) => {
  const { id } = req.params;
  const {
    metodo_pagamento = "dinheiro",
    status_pagamento = "pago",
    valor_recebido = 0,
    troco = 0,
  } = req.body;

  db.run(
    `UPDATE vendas
     SET metodo_pagamento = ?, status_pagamento = ?, valor_recebido = ?, troco = ?
     WHERE id = ? AND empresa_id = ?`,
    [
      String(metodo_pagamento || "dinheiro"),
      String(status_pagamento || "pago"),
      Number(valor_recebido) || 0,
      Number(troco) || 0,
      id,
      req.empresaId,
    ],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao atualizar pagamento" });
      if (this.changes === 0) return res.status(404).json({ message: "Venda não encontrada" });
      res.json({ message: "Pagamento atualizado com sucesso" });
    }
  );
});

// ===== ROTAS DE RESERVAS =====
app.post("/api/reservas", verifyToken, (req, res) => {
  const { produto_id, quantidade } = req.body;

  db.run(
    "INSERT INTO reservas (usuario_id, produto_id, empresa_id, quantidade) VALUES (?, ?, ?, ?)",
    [req.userId, produto_id, req.empresaId, quantidade],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Erro ao criar reserva" });
      }
      res.json({ id: this.lastID, message: "Reserva criada com sucesso" });
    }
  );
});

app.get("/api/reservas", verifyToken, (req, res) => {
  db.all("SELECT * FROM reservas WHERE empresa_id = ?", [req.empresaId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Erro ao buscar reservas" });
    }
    res.json(rows);
  });
});

// ===== ROTAS DE DASHBOARD =====
app.get("/api/dashboard/stats", verifyToken, (req, res) => {
  const empresaId = req.empresaId;

  db.all(
    `
    SELECT 
      (SELECT COUNT(*) FROM produtos WHERE empresa_id = ?) as totalProdutos,
      (SELECT COUNT(*) FROM vendas WHERE empresa_id = ?) as totalVendas,
      (SELECT SUM(total) FROM vendas WHERE empresa_id = ?) as totalVendido
  `,
    [empresaId, empresaId, empresaId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao buscar estatísticas" });
      }
      res.json(rows[0]);
    }
  );
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✓ Servidor backend rodando em http://localhost:${PORT}`);
});

// Tratamento de erros não capturados
process.on("uncaughtException", (err) => {
  console.error("Erro não capturado:", err);
});
