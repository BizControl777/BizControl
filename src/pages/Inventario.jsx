import React, { useEffect, useState } from "react";
import "./Inventario.css";
import Layout from "../components/Layout";

const Inventario = () => {
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [editando, setEditando] = useState(null);
  const [stockTemp, setStockTemp] = useState("");

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const data = await window.api.getProdutos();
      setProdutos(data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  const filtrados = produtos.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = filtroCategoria === "" || p.categoria === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  const categorias = [...new Set(produtos.map(p => p.categoria || "Sem categoria"))];

  const iniciarEdicao = (produto) => {
    setEditando(produto.id);
    setStockTemp(produto.stock.toString());
  };

  const salvarStock = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    try {
      await window.api.updateProduto({
        ...produto,
        stock: parseInt(stockTemp)
      });
      await carregarProdutos();
      setEditando(null);
      alert("✅ Stock atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar stock:", err);
      alert("❌ Erro ao atualizar stock");
    }
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setStockTemp("");
  };

  const getStockClass = (stock) => {
    if (stock <= 0) return "stock-danger";
    if (stock <= 5) return "stock-warning";
    return "stock-ok";
  };

  return (
    <Layout>
      <div className="inventario-container">
        <header className="topbar">
          <h2>Gestão de Inventário</h2>
          <p>Monitorar e gerenciar stock de produtos</p>
        </header>

        <div className="inventario-hero">
          <span className="hero-pill">Offline pronto</span>
          <p>Visualize e atualize o stock de todos os produtos em tempo real, mesmo sem conexão.</p>
        </div>

        <div className="inventario-controls">
          <input
            type="text"
            placeholder="Pesquisar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="inventario-stats">
          <div className="stat">
            <h4>Total Produtos</h4>
            <p>{filtrados.length}</p>
          </div>
          <div className="stat">
            <h4>Stock Total</h4>
            <p>{filtrados.reduce((sum, p) => sum + p.stock, 0)}</p>
          </div>
          <div className="stat">
            <h4>Valor Total</h4>
            <p>{(filtrados.reduce((sum, p) => sum + (p.stock * p.preco), 0)).toLocaleString()} MT</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Stock</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.nome}</td>
                  <td>{p.categoria}</td>
                  <td>{p.preco.toLocaleString()} MT</td>
                  <td className={getStockClass(p.stock)}>
                    {editando === p.id ? (
                      <input
                        type="number"
                        value={stockTemp}
                        onChange={(e) => setStockTemp(e.target.value)}
                        className="stock-input"
                        autoFocus
                      />
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td className="valor-total">{(p.stock * p.preco).toLocaleString()} MT</td>
                  <td className="actions">
                    {editando === p.id ? (
                      <>
                        <button className="btn-save" onClick={() => salvarStock(p.id)}>✓</button>
                        <button className="btn-cancel" onClick={cancelarEdicao}>✕</button>
                      </>
                    ) : (
                      <button className="btn-edit" onClick={() => iniciarEdicao(p)}>Editar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Inventario;
