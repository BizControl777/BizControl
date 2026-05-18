import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import "./EntityListPage.css";

const Fornecedores = () => {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState([]);
  const [form, setForm] = useState({ nome: "", contacto: "" });

  const carregar = async () => {
    const rows = await window.api.getFornecedores();
    setFornecedores(rows);
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async () => {
    if (!form.nome.trim()) return;
    await window.api.addFornecedor({ ...form, usuario_id: user.id });
    setForm({ nome: "", contacto: "" });
    await carregar();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-truck-field" style={{ marginRight: 8 }}></i> Fornecedores
        </div>
        <div className="page-sub">Gestão de fornecedores e parceiros</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 18 }}>Novo Fornecedor</div>
          <div className="form-row">
            <div className="field">
              <label>Nome da Empresa</label>
              <input
                placeholder="ex: Distribuidora ABC"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Contacto</label>
              <input
                placeholder="ex: +258 84 987 6543"
                value={form.contacto}
                onChange={(e) => setForm((p) => ({ ...p, contacto: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn btn-green" onClick={salvar}>
            <i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Adicionar Fornecedor
          </button>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Fornecedores Registados ({fornecedores.length})</div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {fornecedores.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--sm-r)", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>{f.contacto || "Sem contacto"}</div>
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

export default Fornecedores;
