import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";

const Dividas = () => {
  const { user } = useAuth();
  const [dividas, setDividas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);

  const carregar = async () => {
    const [listaDividas, movs] = await Promise.all([window.api.getDividas(), window.api.getMovimentos()]);
    setDividas(listaDividas);
    setMovimentos(movs.filter((m) => m.tipo === "venda" && m.status_pagamento === "pendente"));
  };

  useEffect(() => {
    carregar();
  }, []);

  const marcarPago = async (movimento) => {
    await window.api.marcarDividaPaga({
      usuario_id: user.id,
      movimento_id: movimento.id,
      valor: movimento.total,
    });
    await carregar();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: 8 }}></i> Dívidas
        </div>
        <div className="page-sub">Contas pendentes e gestão de pagamentos</div>
      </div>
      <div className="cards-row cols2">
        <div className="card">
          <div className="card-title">Total em Dívida</div>
          <div className="metric red">{dividas.reduce((sum, d) => sum + Number(d.total_divida || 0), 0).toLocaleString()} MT</div>
        </div>
        <div className="card">
          <div className="card-title">Clientes em Dívida</div>
          <div className="metric amber">{dividas.length}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Resumo por Cliente</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Total em Dívida</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dividas.length > 0 ? (
                dividas.map((d) => (
                  <tr key={d.cliente_id}>
                    <td>{d.cliente_nome}</td>
                    <td style={{ color: "var(--red)", fontWeight: 600 }}>{Number(d.total_divida || 0).toLocaleString()} MT</td>
                    <td><span className="badge red">Pendente</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", color: "var(--text2)" }}>
                    Nenhum cliente em dívida
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Movimentos Pendentes</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Movimento</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.length > 0 ? (
                movimentos.map((m) => (
                  <tr key={m.id}>
                    <td>#{m.id}</td>
                    <td>{m.cliente_nome || "Sem cliente"}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>{Number(m.total || 0).toLocaleString()} MT</td>
                    <td>
                      <button className="btn btn-sm btn-green" onClick={() => marcarPago(m)}>
                        <i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> Marcar Pago
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", color: "var(--text2)" }}>
                    Nenhum movimento pendente
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

export default Dividas;
