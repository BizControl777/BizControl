import React, { useEffect, useState } from "react";
import "./Relatorio.css";
import Layout from "../components/Layout";

const Relatorio = () => {
  const [produtos, setProdutos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const [prods, movs] = await Promise.all([
        window.api.getProdutos(),
        window.api.getMovimentos()
      ]);
      setProdutos(prods);
      setMovimentos(movs);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  // Estatísticas
  const totalProdutos = produtos.length;
  const totalStock = produtos.reduce((sum, p) => sum + p.stock, 0);
  const valorTotal = produtos.reduce((sum, p) => sum + (p.stock * p.preco), 0);
  const produtosMaisValosos = [...produtos]
    .sort((a, b) => (b.stock * b.preco) - (a.stock * a.preco))
    .slice(0, 5);
  const produtosBaixoStock = produtos.filter(p => p.stock <= 5).length;
  const produtosSemStock = produtos.filter(p => p.stock === 0).length;
  const totalCategorias = [...new Set(produtos.map(p => p.categoria))].length;
  const totalMovimentos = movimentos.length;
  const entradas = movimentos.filter(m => m.tipo === "entrada").length;
  const saidas = movimentos.filter(m => m.tipo === "saida").length;

  // Top categorias por valor
  const categoriasPorValor = [...new Set(produtos.map(p => p.categoria))]
    .map(cat => ({
      categoria: cat,
      valor: produtos
        .filter(p => p.categoria === cat)
        .reduce((sum, p) => sum + (p.stock * p.preco), 0),
      quantidade: produtos.filter(p => p.categoria === cat).length
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <Layout>
      <div className="relatorio-container">
        <header className="topbar">
          <h2>Relatórios e Análises</h2>
          <p>Visão geral das estatísticas do seu inventário</p>
        </header>

        <div className="relatorio-hero">
          <span className="hero-pill">Dados em tempo real</span>
          <p>Acompanhe métricas importantes do seu inventário com gráficos e estatísticas detalhadas.</p>
        </div>

        {/* KPIs Principais */}
        <div className="kpis-grid">
          <div className="kpi">
            <div className="kpi-header">
              <h4>Total de Produtos</h4>
              <span className="icon">📦</span>
            </div>
            <p className="kpi-value">{totalProdutos}</p>
            <span className="kpi-subtitle">cadastrados no sistema</span>
          </div>

          <div className="kpi">
            <div className="kpi-header">
              <h4>Stock Total</h4>
              <span className="icon">📊</span>
            </div>
            <p className="kpi-value">{totalStock}</p>
            <span className="kpi-subtitle">unidades em stock</span>
          </div>

          <div className="kpi">
            <div className="kpi-header">
              <h4>Valor Total</h4>
              <span className="icon">💰</span>
            </div>
            <p className="kpi-value">{(valorTotal / 1000).toFixed(1)}K</p>
            <span className="kpi-subtitle">MT em inventário</span>
          </div>

          <div className="kpi">
            <div className="kpi-header">
              <h4>Categorias</h4>
              <span className="icon">🏷️</span>
            </div>
            <p className="kpi-value">{totalCategorias}</p>
            <span className="kpi-subtitle">tipos de produtos</span>
          </div>
        </div>

        {/* Alertas */}
        <div className="alertas-section">
          <h3>⚠️ Alertas de Stock</h3>
          <div className="alertas-grid">
            <div className="alerta danger">
              <h5>Sem Stock</h5>
              <p>{produtosSemStock}</p>
              <span>produtos esgotados</span>
            </div>
            <div className="alerta warning">
              <h5>Stock Baixo</h5>
              <p>{produtosBaixoStock}</p>
              <span>produtos com stock ≤ 5</span>
            </div>
            <div className="alerta info">
              <h5>Movimentos Hoje</h5>
              <p>{totalMovimentos}</p>
              <span>movimentações registadas</span>
            </div>
          </div>
        </div>

        {/* Dois Painéis Lado a lado */}
        <div className="paineis-grid">
          {/* Painel 1: Top Produtos */}
          <div className="painel">
            <h3>🏆 Top 5 Produtos por Valor</h3>
            <div className="lista">
              {produtosMaisValosos.map((p, idx) => (
                <div key={p.id} className="item-lista">
                  <div className="rank">#{idx + 1}</div>
                  <div className="info">
                    <h5>{p.nome}</h5>
                    <p>{p.categoria} • {p.stock} un.</p>
                  </div>
                  <div className="valor">
                    {(p.stock * p.preco).toLocaleString()} MT
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel 2: Categorias */}
          <div className="painel">
            <h3>📂 Distribuição por Categoria</h3>
            <div className="lista">
              {categoriasPorValor.map((cat) => (
                <div key={cat.categoria} className="item-lista">
                  <div className="info">
                    <h5>{cat.categoria}</h5>
                    <p>{cat.quantidade} produtos</p>
                  </div>
                  <div className="valor">
                    {cat.valor.toLocaleString()} MT
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estatísticas de Movimentos */}
        <div className="painel full">
          <h3>📈 Estatísticas de Movimentos</h3>
          <div className="movimentos-stats">
            <div className="stat-card entrada">
              <h4>Entradas</h4>
              <p className="big-number">{entradas}</p>
              <span>movimentações de entrada</span>
            </div>
            <div className="stat-card saida">
              <h4>Saídas</h4>
              <p className="big-number">{saidas}</p>
              <span>movimentações de saída</span>
            </div>
            <div className="stat-card total">
              <h4>Total</h4>
              <p className="big-number">{totalMovimentos}</p>
              <span>movimentações registadas</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Relatorio;
