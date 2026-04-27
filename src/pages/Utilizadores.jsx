import React, { useEffect, useState } from "react";
import "./Utilizadores.css";
import Layout from "../components/Layout";

const Utilizadores = () => {
  const [utilizadores, setUtilizadores] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modo, setModo] = useState("add");
  const [form, setForm] = useState({
    id: null,
    nome: "",
    email: "",
    telefone: "",
    funcao: ""
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
    setForm({ id: null, nome: "", email: "", telefone: "", funcao: "" });
    setModalOpen(true);
  };

  const abrirEdit = (utilizador) => {
    setModo("edit");
    setForm(utilizador);
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.email || !form.funcao) {
      alert("Preencha os campos obrigatórios!");
      return;
    }

    try {
      if (modo === "add") {
        await window.api.addUtilizador(form);
      } else {
        await window.api.updateUtilizador(form);
      }
      setModalOpen(false);
      await carregarUtilizadores();
      alert("✅ " + (modo === "add" ? "Utilizador adicionado" : "Utilizador atualizado") + " com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("❌ Erro ao salvar utilizador");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tens certeza que queres apagar este utilizador?")) return;

    try {
      await window.api.deleteUtilizador(id);
      await carregarUtilizadores();
      alert("✅ Utilizador removido com sucesso!");
    } catch (err) {
      console.error("Erro ao apagar:", err);
      alert("❌ Erro ao apagar utilizador");
    }
  };

  const getFuncaoColor = (funcao) => {
    switch (funcao?.toLowerCase()) {
      case "administrador": return "funcao-admin";
      case "gerente": return "funcao-gerente";
      case "operador": return "funcao-operador";
      default: return "funcao-user";
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return "—";
    const data = new Date(dataStr);
    return data.toLocaleDateString("pt-PT");
  };

  return (
    <Layout>
      <div className="utilizadores-container">
        <header className="topbar">
          <h2>Gestão de Utilizadores</h2>
          <p>Controle de acesso e funções dos utilizadores</p>
        </header>

        <div className="utilizadores-hero">
          <span className="hero-pill">Acesso seguro</span>
          <p>Crie e gerencie contas de utilizadores com diferentes níveis de acesso e permissões.</p>
        </div>

        <div className="utilizadores-header">
          <div>
            <input
              type="text"
              placeholder="Pesquisar utilizador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn-add" onClick={abrirAdd}>
            + Novo Utilizador
          </button>
        </div>

        <div className="utilizadores-stats">
          <div className="stat">
            <h4>Total</h4>
            <p>{utilizadores.length}</p>
          </div>
          <div className="stat">
            <h4>Admin</h4>
            <p>{utilizadores.filter(u => u.funcao === "administrador").length}</p>
          </div>
          <div className="stat">
            <h4>Gerentes</h4>
            <p>{utilizadores.filter(u => u.funcao === "gerente").length}</p>
          </div>
          <div className="stat">
            <h4>Operadores</h4>
            <p>{utilizadores.filter(u => u.funcao === "operador").length}</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="utilizadores-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Função</th>
                <th>Data Criação</th>
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
                      <span className={`funcao-badge ${getFuncaoColor(u.funcao)}`}>
                        {u.funcao}
                      </span>
                    </td>
                    <td>{formatarData(u.data_criacao)}</td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => abrirEdit(u)}>Editar</button>
                      <button className="btn-delete" onClick={() => handleDelete(u.id)}>Apagar</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#64748b" }}>
                    Nenhum utilizador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{modo === "add" ? "Novo Utilizador" : "Editar Utilizador"}</h3>

              <label>Nome *</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Nome completo"
                className="modal-input"
              />

              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@exemplo.com"
                className="modal-input"
              />

              <label>Telefone</label>
              <input
                type="tel"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                placeholder="+258 82..."
                className="modal-input"
              />

              <label>Função *</label>
              <select
                name="funcao"
                value={form.funcao}
                onChange={handleChange}
                className="modal-input"
              >
                <option value="">Selecione uma função</option>
                <option value="administrador">Administrador</option>
                <option value="gerente">Gerente</option>
                <option value="operador">Operador</option>
              </select>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-save" onClick={handleSalvar}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Utilizadores;
