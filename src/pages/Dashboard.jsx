import React, { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
// Na 
const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRefs = useRef({});

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

  useEffect(() => {
    if (!loading && products.length > 0) {
      renderCharts();
    }
  }, [loading, products]);

  const renderCharts = () => {
    // Trend chart
    const trendCtx = chartRefs.current.trend;
    if (trendCtx) {
      new Chart(trendCtx, {
        type: "bar",
        data: {
          labels: ["30/04", "01/05", "02/05", "03/05", "04/05"],
          datasets: [
            {
              label: "Receita",
              data: [310, 520, 280, 325, 400], // Mock data
              backgroundColor: "rgba(0,150,255,0.4)",
              borderColor: "#0096ff",
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: "Lucro",
              data: [110, 190, 100, 145, 150], // Mock data
              backgroundColor: "rgba(0,212,170,0.3)",
              borderColor: "#00d4aa",
              borderWidth: 2,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "#8fa3c0" },
            },
            y: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "#8fa3c0", callback: (v) => "MT " + v },
            },
          },
        },
      });
    }

    // Pie chart
    const pieCtx = chartRefs.current.pie;
    if (pieCtx) {
      const catData = {};
      products.forEach((p) => {
        catData[p.categoria || "Outros"] = (catData[p.categoria || "Outros"] || 0) + (p.preco * p.stock);
      });
      const labels = Object.keys(catData);
      const data = Object.values(catData);
      const colors = ["#00d4aa", "#0096ff", "#ffb142", "#ff6b35", "#a55eea", "#ff4757"];
      new Chart(pieCtx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: "65%",
        },
      });
    }
  };

  const totalProdutos = products.length;
  const totalStock = products.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const totalValor = products.reduce(
    (sum, item) => sum + Number(item.preco || 0) * Number(item.stock || 0),
    0
  );
  const lowStockCount = products.filter((item) => item.stock > 0 && item.stock <= 10).length;
  const outOfStockCount = products.filter((item) => item.stock <= 0).length;

  const fmt = (n) => "MT " + Number(n).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-house" style={{ marginRight: 8 }}></i> Dashboard
        </div>
        <div className="page-sub">Visão geral do negócio hoje — {new Date().toLocaleDateString("pt-PT")}</div>
      </div>
      <div className="cards-row cols4">
        <div className="card">
          <div className="card-title">Receita Hoje</div>
          <div className="metric green">{fmt(400)}</div>
          <div className="metric-sub">5 vendas realizadas</div>
        </div>
        <div className="card">
          <div className="card-title">Lucro Hoje</div>
          <div className="metric blue">{fmt(150)}</div>
          <div className="metric-sub">Margem 37%</div>
        </div>
        <div className="card">
          <div className="card-title">Alertas Stock</div>
          <div className="metric amber">{lowStockCount + outOfStockCount}</div>
          <div className="metric-sub">produtos em nível baixo</div>
        </div>
        <div className="card">
          <div className="card-title">Produtos Activos</div>
          <div className="metric">{totalProdutos}</div>
          <div className="metric-sub">{products.filter((p) => p.stock > 0).length} em stock</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Vendas dos Últimos 5 Dias</div>
          </div>
          <div className="chart-container">
            <canvas ref={(el) => (chartRefs.current.trend = el)} role="img" aria-label="Vendas diárias"></canvas>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Lucro por Categoria</div>
          </div>
          <div className="chart-container-sm">
            <canvas ref={(el) => (chartRefs.current.pie = el)} role="img" aria-label="Lucro por categoria"></canvas>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Últimas Vendas</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vendedor</th>
                <th>Produtos</th>
                <th>Total</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {/* Mock data */}
              <tr>
                <td>{new Date().toLocaleDateString("pt-PT")}</td>
                <td>Ana Machava</td>
                <td style={{ color: "var(--text2)" }}>Coca-Cola x3, Água x2</td>
                <td style={{ color: "var(--accent)", fontWeight: 600 }}>{fmt(210)}</td>
                <td style={{ color: "var(--green)" }}>{fmt(90)}</td>
              </tr>
              <tr>
                <td>{new Date(Date.now() - 86400000).toLocaleDateString("pt-PT")}</td>
                <td>Ana Machava</td>
                <td style={{ color: "var(--text2)" }}>Sabão x1</td>
                <td style={{ color: "var(--accent)", fontWeight: 600 }}>{fmt(180)}</td>
                <td style={{ color: "var(--green)" }}>{fmt(60)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
