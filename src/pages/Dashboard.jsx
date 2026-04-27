import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import InventoryTable from "../components/InventoryTable";
import Layout from "../components/Layout";

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const carregarProdutos = async () => {
      if (!window.api) {
        setError("API não disponível");
        setLoading(false);
        return;
      }

      try {
        const data = await window.api.getProdutos();
        setProducts(data || []);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        setError(err?.message || "Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };

    carregarProdutos();
  }, []);

  const totalProdutos = products.length;
  const totalStock = products.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const totalValor = products.reduce(
    (sum, item) => sum + Number(item.preco || 0) * Number(item.stock || 0),
    0
  );

  const lowStockCount = products.filter((item) => item.stock > 0 && item.stock <= 10).length;
  const outOfStockCount = products.filter((item) => item.stock <= 0).length;

  return (
    <Layout>
      <header className="topbar">
        <h2>Dashboard Overview</h2>
        <p>Visão geral do seu negócio em tempo real</p>
      </header>

      <section className="hero-panel">
        <div className="hero-text">
          <span className="hero-pill">Offline pronto</span>
          <h3>Dados carregados diretamente do banco</h3>
          <p>Os indicadores agora refletem o inventário atual em SQLite para uma visão mais fiel do seu negócio.</p>
          {error && <p className="hero-error">{error}</p>}
          {loading && <p className="hero-info">Carregando dados do banco...</p>}
        </div>
      </section>

      {/* ALERTAS */}
      <section className="alerts">
        <div className="alert warning">
          <span className="alert-icon">⚠️</span>
          <span>{lowStockCount} produtos com stock baixo</span>
        </div>
        <div className="alert danger">
          <span className="alert-icon">🚨</span>
          <span>{outOfStockCount} produtos em falta</span>
        </div>
      </section>

      {/* CARDS */}
      <section className="cards">
        <div className="card" title="Total de produtos cadastrados no sistema">
          <h4>Total Produtos</h4>
          <p>{loading ? "..." : totalProdutos}</p>
        </div>

        <div className="card emergency" title="Produtos com stock baixo (menos de 10 unidades)">
          <h4>Stock Baixo</h4>
          <p><b>{loading ? "..." : lowStockCount}</b></p>
        </div>

        <div className="card" title="Valor total do inventário em Metical">
          <h4>Valor Total</h4>
          <p><b>{loading ? "..." : totalValor.toLocaleString()} MT</b></p>
        </div>

        <div className="card" title="Produtos sem stock no inventário">
          <h4>Sem Stock</h4>
          <p><b>{loading ? "..." : outOfStockCount}</b></p>
        </div>
      </section>

      {/* TABELA */}
      <InventoryTable products={products} />
    </Layout>
  );
};

export default Dashboard;
