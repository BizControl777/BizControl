import React, { useEffect, useState } from "react";
import "./Relatorio.css";
import { useAuth } from "../context/useAuth";

const Relatorio = () => {
  const { hasPermission } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [filtros, setFiltros] = useState({
    periodo: "mes",
    dataInicio: "",
    dataFim: "",
    produtoId: "",
  });
  const [relatorio, setRelatorio] = useState({
    resumo: { total_vendas: 0, total_lucro: 0, numero_vendas: 0 },
    lucroDiario: [],
    produtosMaisVendidos: [],
    filtrosAplicados: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarProdutos();
    gerarRelatorio();
  }, []);

  const carregarProdutos = async () => {
    try {
      const prods = await window.api.getProdutos();
      setProdutos(prods);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  const formatMoney = (value) => `${Number(value || 0).toFixed(2)} MT`;

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const payload = {
        periodo: filtros.periodo,
        dataInicio: filtros.dataInicio || null,
        dataFim: filtros.dataFim || null,
        produtoId: filtros.produtoId || null,
      };
      const data = await window.api.getRelatorioAnalise(payload);
      setRelatorio(data);
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      alert(`Erro ao gerar relatório: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-chart-line" style={{ marginRight: 8 }}></i> Relatórios
        </div>
        <div className="page-sub">Análise de desempenho e vendas</div>
      </div>
      <div className="cards-row cols3">
        <div className="card">
          <div className="card-title">Total de Vendas</div>
          <div className="metric green">{formatMoney(relatorio.resumo.total_vendas)}</div>
          <div className="metric-sub">{relatorio.resumo.numero_vendas} vendas realizadas</div>
        </div>
        <div className="card">
          <div className="card-title">Número de Vendas</div>
          <div className="metric">{relatorio.resumo.numero_vendas}</div>
          <div className="metric-sub">registos no período</div>
        </div>
        {hasPermission("ver_relatorios_financeiros") && (
          <div className="card">
            <div className="card-title">Lucro Total</div>
            <div className="metric blue">{formatMoney(relatorio.resumo.total_lucro)}</div>
            <div className="metric-sub">margem do período</div>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Filtros</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={filtros.periodo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, periodo: e.target.value }))}
          >
            <option value="hoje">Hoje</option>
            <option value="semana">Semana</option>
            <option value="mes">Mês</option>
            <option value="personalizado">Personalizado</option>
          </select>
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros((prev) => ({ ...prev, dataInicio: e.target.value }))}
            disabled={filtros.periodo !== "personalizado"}
          />
          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros((prev) => ({ ...prev, dataFim: e.target.value }))}
            disabled={filtros.periodo !== "personalizado"}
          />
          <select
            value={filtros.produtoId}
            onChange={(e) => setFiltros((prev) => ({ ...prev, produtoId: e.target.value }))}
          >
            <option value="">Todos produtos</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button className="btn btn-blue" onClick={gerarRelatorio} disabled={loading}>
            {loading ? "Gerando..." : "Gerar Relatório"}
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Lucro Diário</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Total de Vendas</th>
                {hasPermission("ver_relatorios_financeiros") && <th>Total de Lucro</th>}
              </tr>
            </thead>
            <tbody>
              {relatorio.lucroDiario.length > 0 ? (
                relatorio.lucroDiario.map((item) => (
                  <tr key={item.data}>
                    <td>{item.data}</td>
                    <td style={{ color: "var(--green)", fontWeight: 600 }}>{formatMoney(item.total_vendas)}</td>
                    {hasPermission("ver_relatorios_financeiros") && (
                      <td style={{ color: "var(--blue)", fontWeight: 600 }}>{formatMoney(item.total_lucro)}</td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={hasPermission("ver_relatorios_financeiros") ? 3 : 2} style={{ textAlign: "center", color: "var(--text2)" }}>
                    Sem dados no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Produtos Mais Vendidos</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade Vendida</th>
                <th>Ranking</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.produtosMaisVendidos.length > 0 ? (
                relatorio.produtosMaisVendidos.map((item, index) => (
                  <tr key={item.produto_id}>
                    <td>{item.nome}</td>
                    <td style={{ fontWeight: 600 }}>{item.quantidade_total_vendida}</td>
                    <td><span className="badge green">#{index + 1}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", color: "var(--text2)" }}>
                    Sem dados no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Relatorio;
