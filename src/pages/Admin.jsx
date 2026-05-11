import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/useAuth";
import "./Admin.css";

const Admin = () => {
  const { user, hasPermission } = useAuth();
  const [logs, setLogs] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [permsUsuario, setPermsUsuario] = useState([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [permsSelecionadas, setPermsSelecionadas] = useState([]);
  const [abaSelecionada, setAbaSelecionada] = useState("perfis"); // "perfis" ou "funcionarios"

  const carregar = async () => {
    const [logsRows, alertasRows, movRows, perfilRows, permissaoRows, userRows] = await Promise.all([
      window.api.getLogs({ usuario_id: user.id }),
      window.api.getAlertas(),
      window.api.getMovimentos(),
      window.api.getPerfis(),
      window.api.getPermissoes(),
      window.api.getUtilizadores(),
    ]);
    setLogs(logsRows);
    setAlertas(alertasRows);
    setMovimentos(movRows);
    setPerfis(perfilRows);
    setPermissoes(permissaoRows);
    setUtilizadores(userRows);
    if (!perfilSelecionado && perfilRows.length) {
      setPerfilSelecionado(perfilRows[0].id);
      setPermsSelecionadas(perfilRows[0].permissoes || []);
    }
  };

  useEffect(() => {
    if (hasPermission("ver_logs")) {
      carregar();
    }
  }, []);

  useEffect(() => {
    const carregarPermissoesUsuario = async () => {
      if (!usuarioSelecionado) return;
      const list = await window.api.getUsuarioPermissoes(usuarioSelecionado);
      setPermsUsuario(list);
    };
    carregarPermissoesUsuario();
  }, [usuarioSelecionado]);

  useEffect(() => {
    const carregarPermissoesPerfil = async () => {
      if (!perfilSelecionado) return;
      const perfilData = perfis.find(p => p.id === perfilSelecionado);
      if (perfilData) {
        setPermsSelecionadas(perfilData.permissoes || []);
      }
    };
    carregarPermissoesPerfil();
  }, [perfilSelecionado, perfis]);

  const resolverAlerta = async (id) => {
    await window.api.resolverAlerta({ id, usuario_id: user.id });
    await carregar();
  };

  const salvarPermissoes = async () => {
    if (abaSelecionada === "perfis") {
      await window.api.setPerfilPermissoes({
        usuario_id: user.id,
        perfil_id: perfilSelecionado,
        permissoes: permsSelecionadas,
      });
    } else if (abaSelecionada === "funcionarios") {
      await window.api.setUsuarioPermissoes({
        usuario_id: user.id,
        funcionario_id: usuarioSelecionado,
        permissoes: permsUsuario,
      });
    }
    await carregar();
  };

  if (!hasPermission("ver_logs")) {
    return (
      <Layout>
        <div className="produtos-container">
          <h2>Acesso negado</h2>
          <p>Sem permissão para área administrativa.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <h2>Painel Administrativo</h2>
            <p>Gestão de permissões, alertas e auditoria em um único lugar.</p>
          </div>
          <button className="admin-refresh" onClick={carregar}>
            Atualizar dados
          </button>
        </header>

        <section className="admin-kpis">
          <article className="admin-kpi">
            <p>Alertas pendentes</p>
            <h3>{alertas.filter((a) => !a.resolvido).length}</h3>
          </article>
          <article className="admin-kpi">
            <p>Total de logs</p>
            <h3>{logs.length}</h3>
          </article>
          <article className="admin-kpi">
            <p>Perfis ativos</p>
            <h3>{perfis.length}</h3>
          </article>
          <article className="admin-kpi">
            <p>Permissões do perfil</p>
            <h3>{permsSelecionadas.length}</h3>
          </article>
        </section>

        <section className="admin-grid">
          <div className="admin-card">
            <div className="admin-card-title">
              <h3>Alertas</h3>
              <span>Resolução rápida</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className={`admin-badge ${a.tipo === "estoque_baixo" ? "is-warning" : "is-danger"}`}>
                          {a.tipo}
                        </span>
                      </td>
                      <td>{a.descricao}</td>
                      <td>{a.resolvido ? "Resolvido" : "Pendente"}</td>
                      <td>
                        {a.resolvido ? (
                          "—"
                        ) : (
                          <button className="admin-btn ghost" onClick={() => resolverAlerta(a.id)}>
                            Resolver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {alertas.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-row">
                        Sem alertas no momento.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {hasPermission("gerir_permissoes") ? (
            <div className="admin-card">
              <div className="admin-card-title">
                <h3>Perfis e permissões</h3>
                <span>Controle de acesso</span>
              </div>
              
              {/* Abas de navegação */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, borderBottom: "2px solid var(--border)" }}>
                <button
                  onClick={() => setAbaSelecionada("perfis")}
                  style={{
                    padding: "8px 16px",
                    background: abaSelecionada === "perfis" ? "var(--accent)" : "transparent",
                    color: abaSelecionada === "perfis" ? "white" : "var(--text2)",
                    border: "none",
                    borderBottom: abaSelecionada === "perfis" ? "3px solid var(--accent)" : "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Perfis
                </button>
                <button
                  onClick={() => setAbaSelecionada("funcionarios")}
                  style={{
                    padding: "8px 16px",
                    background: abaSelecionada === "funcionarios" ? "var(--accent)" : "transparent",
                    color: abaSelecionada === "funcionarios" ? "white" : "var(--text2)",
                    border: "none",
                    borderBottom: abaSelecionada === "funcionarios" ? "3px solid var(--accent)" : "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Funcionários
                </button>
              </div>

              {/* Conteúdo da aba Perfis */}
              {abaSelecionada === "perfis" && (
                <>
                  <div className="admin-permissions-toolbar">
                    <select
                      value={perfilSelecionado || ""}
                      onChange={(e) => setPerfilSelecionado(Number(e.target.value))}
                      className="admin-select"
                    >
                      {perfis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    <button className="admin-btn primary" onClick={salvarPermissoes}>
                      Salvar permissões
                    </button>
                  </div>
                  <div className="admin-permissions-list">
                    {permissoes.map((perm) => (
                      <label key={perm.id} className="perm-item">
                        <input
                          type="checkbox"
                          checked={permsSelecionadas.includes(perm.nome)}
                          onChange={(e) => {
                            setPermsSelecionadas((prev) =>
                              e.target.checked ? [...new Set([...prev, perm.nome])] : prev.filter((n) => n !== perm.nome)
                            );
                          }}
                        />
                        <span>{perm.nome}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* Conteúdo da aba Funcionários */}
              {abaSelecionada === "funcionarios" && (
                <>
                  <div className="admin-permissions-toolbar">
                    <select
                      value={usuarioSelecionado || ""}
                      onChange={(e) => setUsuarioSelecionado(Number(e.target.value))}
                      className="admin-select"
                    >
                      <option value="">Selecione um funcionário</option>
                      {utilizadores.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.perfil})
                        </option>
                      ))}
                    </select>
                    <button className="admin-btn primary" onClick={salvarPermissoes} disabled={!usuarioSelecionado}>
                      Salvar permissões
                    </button>
                  </div>
                  {usuarioSelecionado && (
                    <div className="admin-permissions-list">
                      <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
                        Permissões específicas para: <strong>{utilizadores.find(u => u.id === usuarioSelecionado)?.nome}</strong>
                      </p>
                      {permissoes.map((perm) => (
                        <label key={perm.id} className="perm-item">
                          <input
                            type="checkbox"
                            checked={permsUsuario.includes(perm.nome)}
                            onChange={(e) => {
                              setPermsUsuario((prev) =>
                                e.target.checked ? [...new Set([...prev, perm.nome])] : prev.filter((n) => n !== perm.nome)
                              );
                            }}
                          />
                          <span>{perm.nome}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </section>

        <div className="admin-card full">
          <div className="admin-card-title">
            <h3>Logs de auditoria</h3>
            <span>Últimas atividades</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Tabela</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.criado_em).toLocaleString("pt-PT")}</td>
                  <td>
                    <span className="admin-badge is-neutral">{log.acao}</span>
                  </td>
                  <td>{log.tabela}</td>
                  <td>{log.descricao}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">
                    Nenhum log registrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>

        <div className="admin-card full">
          <div className="admin-card-title">
            <h3>Movimentos recentes</h3>
            <span>Controle por funcionário</span>
          </div>
          <div className="admin-table-wrap admin-movements-scroll">
            <table className="admin-table admin-table-movimentos">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th className="admin-th-num">Quantidade</th>
                  <th className="admin-th-num">Total</th>
                  <th>Funcionário</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.slice(0, 200).map((m) => (
                  <tr key={m.id}>
                    <td className="admin-cell-compact">{new Date(m.criado_em || m.data).toLocaleString("pt-PT")}</td>
                    <td>{m.produto_nome || `#${m.produto_id}`}</td>
                    <td className="admin-cell-shrink">
                      <span className="admin-badge is-neutral">{m.tipo}</span>
                    </td>
                    <td className="admin-cell-num">
                      {Number(m.quantidade || 0).toFixed(3)} <span className="admin-unit">{m.unidade || "unidade"}</span>
                    </td>
                    <td className="admin-cell-num">{Number(m.total || 0).toFixed(2)} MT</td>
                    <td className="admin-cell-strong">{m.usuario_nome || "—"}</td>
                  </tr>
                ))}
                {movimentos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      Nenhum movimento registrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
