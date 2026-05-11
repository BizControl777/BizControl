import React, { useEffect, useState } from "react";
import "./Utilizadores.css";
import { useAuth } from "../context/useAuth";

const Utilizadores = () => {
  const { user } = useAuth();
  const [utilizadores, setUtilizadores] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modo, setModo] = useState("add");
  const [form, setForm] = useState({
    id: null,
    nome: "",
    email: "",
    telefone: "",
    perfil: "funcionario",
    senha: ""
  });

  useEffect(() => {
    carregarUtilizadores();
  }, []);

  const carregarUtilizadores = async () => {
    try {
      if (!window.api) {
        console.error("❌ window.api não está disponível");
        return;
      }
      const data = await window.api.getUtilizadores();
      setUtilizadores(data);
    } catch (err) {
      console.error("Erro ao carregar utilizadores:", err);
    }
  };

  const filtrados = utilizadores.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const abrirAdd = () => {
    setModo("add");
    setForm({ id: null, nome: "", email: "", telefone: "", perfil: "funcionario", senha: "" });
    setModalOpen(true);
  };

  const abrirEdit = (utilizador) => {
    setModo("edit");
    setForm(utilizador);
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.email || !form.perfil) {
      alert("Preencha os campos obrigatórios!");
      return;
    }

    try {
      if (modo === "add") {
        const s = String(form.senha || "").trim();
        if (s.length < 6) {
          alert("Na criação, defina uma senha com pelo menos 6 caracteres.");
          return;
        }
        await window.api.addUtilizador({ ...form, usuario_id: user.id, funcao: form.perfil });
      } else {
        await window.api.updateUtilizador({ ...form, usuario_id: user.id, funcao: form.perfil });
      }
      setModalOpen(false);
      await carregarUtilizadores();
      alert("✅ " + (modo === "add" ? "Utilizador adicionado" : "Utilizador atualizado") + " com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert(`❌ ${err?.message || "Erro ao salvar utilizador"}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tens certeza que queres apagar este utilizador?")) return;

    try {
      await window.api.deleteUtilizador({ id, usuario_id: user.id });
      await carregarUtilizadores();
      alert("✅ Utilizador removido com sucesso!");
    } catch (err) {
      console.error("Erro ao apagar:", err);
      alert("❌ Erro ao apagar utilizador");
    }
  };

  const getFuncaoColor = (funcao) => {
    switch (funcao?.toLowerCase()) {
      case "admin": return "funcao-admin";
      case "funcionario": return "funcao-operador";
      default: return "funcao-user";
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return "—";
    const data = new Date(dataStr);
    return data.toLocaleDateString("pt-PT");
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <i className="fa-solid fa-user-group" style={{ marginRight: 8 }}></i> Utilizadores
        </div>
        <div className="page-sub">Gestão de contas e permissões</div>
      </div>
      <div className="cards-row cols4">
        <div className="card">
          <div className="card-title">Total</div>
          <div className="metric">{utilizadores.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Administradores</div>
          <div className="metric red">{utilizadores.filter(u => u.perfil === "admin").length}</div>
        </div>
        <div className="card">
          <div className="card-title">Funcionários</div>
          <div className="metric blue">{utilizadores.filter(u => u.perfil === "funcionario").length}</div>
        </div>
        <div className="card">
          <div className="card-title">Ativos</div>
          <div className="metric green">{utilizadores.filter(u => u.ativo !== false).length}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Utilizadores Registados</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--sm-r)", background: "var(--bg2)", color: "var(--text)" }}
            />
            <button className="btn btn-green" onClick={abrirAdd}>
              <i className="fa-solid fa-plus" style={{ marginRight: 8 }}></i> Novo Utilizador
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length > 0 ? (
                filtrados.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{u.telefone || "—"}</td>
                    <td>
                      <span className={`badge ${u.perfil === "admin" ? "red" : "blue"}`}>
                        {u.perfil === "admin" ? "Admin" : "Funcionário"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.ativo !== false ? "green" : "red"}`}>
                        {u.ativo !== false ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-sm btn-blue" onClick={() => abrirEdit(u)}>
                          <i className="fa-solid fa-edit" style={{ marginRight: 6 }}></i>
                        </button>
                        <button className="btn btn-sm btn-red" onClick={() => handleDelete(u.id)}>
                          <i className="fa-solid fa-trash" style={{ marginRight: 6 }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--text2)" }}>
                    Nenhum utilizador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modo === "add" ? "Novo Utilizador" : "Editar Utilizador"}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Nome *</label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Nome completo"
                />
              </div>
              <div className="field">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="+258 82..."
                />
              </div>
              <div className="field">
                <label>Função *</label>
                <select
                  name="perfil"
                  value={form.perfil}
                  onChange={handleChange}
                >
                  <option value="admin">Administrador</option>
                  <option value="funcionario">Funcionário</option>
                </select>
              </div>
              {modo === "add" && (
                <div className="field">
                  <label>Senha *</label>
                  <input
                    type="password"
                    name="senha"
                    value={form.senha}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-green" onClick={handleSalvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilizadores;
