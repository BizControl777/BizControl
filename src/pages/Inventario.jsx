import React, { useEffect, useState, useRef } from "react";
import "./Inventario.css";
import { useAuth } from "../context/useAuth";
import Chart from 'chart.js/auto';

const Inventario = () => {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [editando, setEditando] = useState(null);
  const [stockTemp, setStockTemp] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    carregarProdutos();
  }, []);

  useEffect(() => {
    if (produtos.length > 0) {
      renderChart();
    }
  }, [produtos]);

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
    setProdutoEditando(produto);
    setStockTemp(produto.stock.toString());
    setModalOpen(true);
  };

  const salvarStock = async () => {
    if (!produtoEditando) return;
    const stockNumero = Number(stockTemp);

    if (!user?.id) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }
    if (!Number.isFinite(stockNumero) || stockNumero < 0) {
      alert("Informe um stock válido (maior ou igual a 0).");
      return;
    }

    try {
      await window.api.updateProduto({
        ...produtoEditando,
        stock: stockNumero,
        quantidade_total: stockNumero,
        usuario_id: user.id,
      });
      await carregarProdutos();
      setModalOpen(false);
      setProdutoEditando(null);
      alert("✅ Stock atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar stock:", err);
      alert(`❌ ${err?.message || "Erro ao atualizar stock"}`);
    }
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setStockTemp("");
  };

  const renderChart = () => {
    const catStock = {};
    produtos.forEach((p) => {
      catStock[p.categoria] = (catStock[p.categoria] || 0) + p.stock;
    });

    const labels = Object.keys(catStock);
    const data = Object.values(catStock);

    const ctx = document.getElementById('chart-stock-pie');
    if (ctx) {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'],
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            }
          }
        }
      });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-box" style={{ marginRight: 8 }}></i> Nível de Stock
        </div>
        <div className="page-sub">Visão geral do inventário</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Distribuição por Categoria</div>
          </div>
          <div className="chart-container">
            <canvas id="chart-stock-pie" role="img" aria-label="Stock por categoria"></canvas>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Alertas</div>
          </div>
          {produtos.filter((p) => p.stock === 0).map((p) => (
            <div key={p.id} className="alert-card alert-red">
              <i className="fa-solid fa-ban" style={{ marginRight: 8 }}></i> {p.nome} — Esgotado!
            </div>
          ))}
          {produtos.filter((p) => p.stock > 0 && p.stock <= 5).map((p) => (
            <div key={p.id} className="alert-card alert-amber">
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i> {p.nome} — Apenas {p.stock} unidades
            </div>
          ))}
          {!produtos.some((p) => p.stock <= 5) && (
            <div className="alert-card alert-green">
              <i className="fa-solid fa-check" style={{ marginRight: 8 }}></i> Todos os stocks estão adequados!
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Tabela de Stock</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Stock Actual</th>
                <th>Mínimo</th>
                <th>Nível</th>
                <th>Acção</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const pct = Math.min(100, Math.round((p.stock / (5 * 3)) * 100));
                const oos = p.stock === 0;
                const low = p.stock > 0 && p.stock <= 5;
                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontSize: 16, marginRight: 6 }}>
                        <i className="fa-solid fa-box"></i>
                      </span>
                      <strong>{p.nome}</strong>
                    </td>
                    <td>
                      <span className="tag">{p.categoria}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: oos ? "var(--red)" : low ? "var(--amber)" : "var(--green)" }}>
                      {p.stock}
                    </td>
                    <td style={{ color: "var(--text2)" }}>5</td>
                    <td style={{ minWidth: 100 }}>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: oos ? "var(--red)" : low ? "var(--amber)" : "var(--green)"
                          }}
                        ></div>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-blue" onClick={() => iniciarEdicao(p)}>+ Repor</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {modalOpen && produtoEditando && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Repor Stock</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Produto</label>
                <input value={produtoEditando.nome} readOnly />
              </div>
              <div className="field">
                <label>Stock Atual</label>
                <input value={produtoEditando.stock} readOnly />
              </div>
              <div className="field">
                <label>Novo Stock</label>
                <input
                  type="number"
                  value={stockTemp}
                  onChange={(e) => setStockTemp(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarStock}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
