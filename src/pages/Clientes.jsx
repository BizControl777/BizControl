import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import "./EntityListPage.css";

const Clientes = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ nome: "", telefone: "", endereco: "" });
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const rows = await window.api.getClientes();
    setClientes(rows);
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setLoading(true);
    try {
      await window.api.addCliente({ ...form, usuario_id: user.id });
      setForm({ nome: "", telefone: "", endereco: "" });
      await carregar();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-users" style={{ marginRight: 8 }}></i> Clientes
        </div>
        <div className="page-sub">Gestão de clientes e contactos</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 18 }}>Novo Cliente</div>
          <div className="form-row">
            <div className="field">
              <label>Nome Completo</label>
              <input
                placeholder="ex: João Silva"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row cols2">
            <div className="field">
              <label>Telefone</label>
              <input
                placeholder="ex: +258 84 123 4567"
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="ex: joao@email.com"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Endereço</label>
              <input
                placeholder="ex: Rua 1234, Maputo"
                value={form.endereco}
                onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn btn-green" onClick={salvar} disabled={loading}>
            <i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> {loading ? "A guardar..." : "Adicionar Cliente"}
          </button>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Clientes Registados ({clientes.length})</div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {clientes.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--sm-r)", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>{c.telefone || "Sem telefone"} • {c.endereco || "Sem endereço"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-sm btn-blue">
                    <i className="fa-solid fa-edit" style={{ marginRight: 6 }}></i>
                  </button>
                  <button className="btn btn-sm btn-red">
                    <i className="fa-solid fa-trash" style={{ marginRight: 6 }}></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clientes;
