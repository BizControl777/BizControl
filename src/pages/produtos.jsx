import React, { useEffect, useState } from "react";
import "./produtos.css";
import Layout from "../components/Layout";

const Produtos = () => {
  const [search, setSearch] = useState("");

  const [produtos, setProdutos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modo, setModo] = useState("add");

  const [form, setForm] = useState({
    id: null,
    nome: "",
    categoria: "",
    preco: "",
    stock: "",
  });

  // 🔥 CARREGAR DO SQLITE
  useEffect(() => {
    console.log("🔄 [Produtos] UseEffect inicial");
    console.log("window.api disponível?", !!window.api);
    console.log("window.api:", window.api);
    
    // Verificar se a API está disponível
    if (!window.api) {
      console.error("❌ [Produtos] window.api não está disponível!");
      console.log("📋 Propriedades de window:", Object.keys(window).slice(0, 20));
      alert("❌ ERRO CRÍTICO: API não foi inicializada!\n\n1. Feche a aplicação\n2. Execute: npm run start\n3. Aguarde o Electron abrir\n\nNÃO use 'npm run dev'");
      return;
    }
    
    console.log("✅ [Produtos] API disponível, carregando produtos...");
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const data = await window.api.getProdutos();
      console.log("📋 Produtos carregados:", data.length);
      setProdutos(data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  // 🔍 FILTRO
  const filtrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  // ➕ ABRIR ADD
  const abrirAdd = () => {
    console.log("📬 Abrindo modal de adicionar produto");
    setModo("add");
    setForm({ id: null, nome: "", categoria: "", preco: "", stock: "" });
    setModalOpen(true);
    console.log("✅ Modal aberto");
  };

  // ✏️ ABRIR EDIT
  const abrirEdit = (produto) => {
    setModo("edit");
    setForm(produto);
    setModalOpen(true);
  };

  // 📝 CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Converter para número se for preco ou stock
    let finalValue = value;
    if (name === "preco" || name === "stock") {
      // Substituir vírgula por ponto para compatibilidade
      const normalizedValue = value.replace(',', '.');
      finalValue = normalizedValue === "" ? "" : Number(normalizedValue);
    }
    
    setForm((prev) => ({ ...prev, [name]: finalValue }));
  };

  // 💾 SALVAR (ADD OU EDIT NO SQLITE)
  const handleSalvar = async () => {
    console.log("🔄 handleSalvar chamado");
    console.log("Form atual:", form);
    console.log("window.api disponível?", !!window.api);

    // Verificar se a API está disponível
    if (!window.api) {
      console.error("❌ window.api não está disponível");
      alert("❌ Erro: API não disponível!\n\nExecute: npm run start (não npm run dev)");
      return;
    }

    // Validar campos obrigatórios
    if (!form.nome || !form.nome.trim()) {
      console.warn("⚠️ Nome vazio");
      alert("O nome é obrigatório!");
      return;
    }
    if (!form.categoria || !form.categoria.trim()) {
      console.warn("⚠️ Categoria vazia");
      alert("A categoria é obrigatória!");
      return;
    }
    if (!form.preco || isNaN(form.preco) || form.preco <= 0) {
      console.warn("⚠️ Preço inválido:", form.preco);
      alert("O preço deve ser um número maior que 0!");
      return;
    }
    if (form.stock === "" || form.stock === null || isNaN(form.stock) || form.stock < 0) {
      console.warn("⚠️ Stock inválido:", form.stock);
      alert("O stock deve ser um número maior ou igual a 0!");
      return;
    }

    try {
      console.log("💾 Salvando produto:", form);
      
      if (modo === "add") {
        console.log("➕ Adicionando novo produto");
        const resultado = await window.api.addProduto(form);
        console.log("✅ Produto adicionado:", resultado);
      } else {
        console.log("✏️ Atualizando produto");
        const resultado = await window.api.updateProduto(form);
        console.log("✅ Produto atualizado:", resultado);
      }

      console.log("🚪 Fechando modal");
      setModalOpen(false);
      console.log("🔄 Recarregando produtos");
      await carregarProdutos();
      console.log("✅ Produto salvo com sucesso!");
      
      if (modo === "add") {
        alert("✅ Produto adicionado com sucesso!");
      } else {
        alert("✅ Produto atualizado com sucesso!");
      }
    } catch (err) {
      console.error("❌ Erro ao salvar:", err);
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  // 🗑️ DELETE SQLITE
  const handleDelete = async (id) => {
    if (!window.api) {
      alert("❌ Erro: API não disponível");
      return;
    }
    
    if (!window.confirm("Tens certeza que queres apagar?")) return;

    try {
      await window.api.deleteProduto(id);
      await carregarProdutos(); // 🔥 atualiza lista
      alert("✅ Produto removido com sucesso!");
    } catch (err) {
      console.error("Erro ao apagar:", err);
      alert(`Erro ao apagar: ${err.message}`);
    }
  };

  // 📊 STOCK CLASS
  const getStockClass = (stock) => {
    if (stock <= 0) return "stock-danger";
    if (stock <= 5) return "stock-warning";
    return "stock-ok";
  };

  return (
    <Layout>

      <div className="produtos-container">

        {/* HEADER */}
        <div className="produtos-header">
          <div>
            <h2>Gestão de Produtos</h2>
            <p>Controle completo do inventário</p>
          </div>

          <button className="btn-add" onClick={abrirAdd}>
            + Novo Produto
          </button>
        </div>

        <div className="produtos-hero">
          <span className="hero-pill">Offline pronto</span>
          <p>Este espaço foi pensado para gestão de produtos rápida e confiável, mesmo sem ligação à internet.</p>
        </div>

        {/* SEARCH */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Pesquisar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* KPIs */}
        <div className="kpis">
          <div className="kpi-card">
            <h4>Total Produtos</h4>
            <p>{produtos.length}</p>
          </div>

          <div className="kpi-card warning">
            <h4>Stock Baixo</h4>
            <p>{produtos.filter(p => p.stock <= 5 && p.stock > 0).length}</p>
          </div>

          <div className="kpi-card danger">
            <h4>Sem Stock</h4>
            <p>{produtos.filter(p => p.stock <= 0).length}</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-wrapper">

          <table className="produtos-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Stock</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.nome}</td>
                  <td>{p.categoria}</td>
                  <td>{p.preco} MT</td>
                  <td className={getStockClass(p.stock)}>
                    {p.stock}
                  </td>

                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => abrirEdit(p)}
                    >
                      Editar
                    </button>

                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(p.id)}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="modal-overlay">
            <div className="modal">

              <h3>
                {modo === "add" ? "Adicionar Produto" : "Editar Produto"}
              </h3>

              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Nome"
              />

              <input
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                placeholder="Categoria"
              />

              <input
                name="preco"
                type="number"
                value={form.preco}
                onChange={handleChange}
                placeholder="Preço"
              />

              <input
                name="stock"
                type="number"
                value={form.stock}
                onChange={handleChange}
                placeholder="Stock"
              />

              <div className="modal-actions">

                <button className="btn-edit" onClick={handleSalvar}>
                  {modo === "add" ? "Adicionar" : "Salvar"}
                </button>

                <button
                  className="btn-delete"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>

              </div>

            </div>
          </div>
        )}

      </div>

    </Layout>
  );
};

export default Produtos;