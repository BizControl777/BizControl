import React, { useEffect, useState } from "react";
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
  const [usuarioSelecionado, setUsuarioSelecionado] = useState("");
  const [perfilSelecionado, setPerfilSelecionado] = useState("");
  const [permsUsuario, setPermsUsuario] = useState([]);
  const [permsSelecionadas, setPermsSelecionadas] = useState([]);
  const [abaSelecionada, setAbaSelecionada] = useState("perfis");

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
  }, [hasPermission, user]);

  useEffect(() => {
    if (!usuarioSelecionado) return;
    window.api.getUsuarioPermissoes(usuarioSelecionado).then(setPermsUsuario).catch(console.error);
  }, [usuarioSelecionado]);

  useEffect(() => {
    if (!perfilSelecionado) return;
    const perfilData = perfis.find((item) => item.id === perfilSelecionado);
    setPermsSelecionadas(perfilData?.permissoes || []);
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
    } else {
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
      <div className="produtos-container">
        <h2>Acesso negado</h2>
        <p>Sem permissão para área administrativa.</p>
      </div>
    );
  }

  return (
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
          <h3>{alertas.filter((item) => !item.resolvido).length}</h3>
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
                {alertas.length > 0 ? (
                  alertas.map((alerta) => (
                    <tr key={alerta.id}>
                      <td>
                        <span className={`admin-badge ${alerta.tipo === "estoque_baixo" ? "is-warning" : "is-danger"}`}>
                          {alerta.tipo}
                        </span>
                      </td>
                      <td>{alerta.descricao}</td>
                      <td>{alerta.resolvido ? "Resolvido" : "Pendente"}</td>
                      <td>
                        {!alerta.resolvido ? (
                          <button className="admin-btn ghost" onClick={() => resolverAlerta(alerta.id)}>
                            Resolver
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-row">
                      Sem alertas no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {hasPermission("gerir_permissoes") && (
          <div className="admin-card">
            <div className="admin-card-title">
              <h3>Perfis e permissões</h3>
              <span>Controle de acesso</span>
            </div>

            <div className="admin-tabs">
              <button
                className={abaSelecionada === "perfis" ? "active" : ""}
                type="button"
                onClick={() => setAbaSelecionada("perfis")}
              >
                Perfis
              </button>
              <button
                className={abaSelecionada === "funcionarios" ? "active" : ""}
                type="button"
                onClick={() => setAbaSelecionada("funcionarios")}
              >
                Funcionários
              </button>
            </div>

            {abaSelecionada === "perfis" && (
              <div className="admin-permissions-section">
                <div className="admin-permissions-toolbar">
                  <select
                    value={perfilSelecionado || ""}
                    onChange={(event) => setPerfilSelecionado(Number(event.target.value))}
                    className="admin-select"
                  >
                    {perfis.map((perfil) => (
                      <option key={perfil.id} value={perfil.id}>
                        {perfil.nome}
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
                        onChange={(event) => {
                          setPermsSelecionadas((current) =>
                            event.target.checked
                              ? [...new Set([...current, perm.nome])]
                              : current.filter((item) => item !== perm.nome)
                          );
                        }}
                      />
                      <span>{perm.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {abaSelecionada === "funcionarios" && (
              <div className="admin-permissions-section">
                <div className="admin-permissions-toolbar">
                  <select
                    value={usuarioSelecionado || ""}
                    onChange={(event) => setUsuarioSelecionado(Number(event.target.value))}
                    className="admin-select"
                  >
                    <option value="">Selecione um funcionário</option>
                    {utilizadores.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} ({usuario.perfil})
                      </option>
                    ))}
                  </select>
                  <button className="admin-btn primary" onClick={salvarPermissoes} disabled={!usuarioSelecionado}>
                    Salvar permissões
                  </button>
                </div>
                {usuarioSelecionado && (
                  <div className="admin-permissions-list">
                    <p className="admin-permissions-help">
                      Permissões específicas para: <strong>{utilizadores.find((u) => u.id === usuarioSelecionado)?.nome}</strong>
                    </p>
                    {permissoes.map((perm) => (
                      <label key={perm.id} className="perm-item">
                        <input
                          type="checkbox"
                          checked={permsUsuario.includes(perm.nome)}
                          onChange={(event) => {
                            setPermsUsuario((current) =>
                              event.target.checked
                                ? [...new Set([...current, perm.nome])]
                                : current.filter((item) => item !== perm.nome)
                            );
                          }}
                        />
                        <span>{perm.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.criado_em).toLocaleString("pt-PT")}</td>
                    <td>
                      <span className="admin-badge is-neutral">{log.acao}</span>
                    </td>
                    <td>{log.tabela}</td>
                    <td>{log.descricao}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-row">
                    Nenhum log registrado.
                  </td>
                </tr>
              )}
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
              {movimentos.length > 0 ? (
                movimentos.slice(0, 200).map((movimento) => (
                  <tr key={movimento.id}>
                    <td className="admin-cell-compact">{new Date(movimento.criado_em || movimento.data).toLocaleString("pt-PT")}</td>
                    <td>{movimento.produto_nome || `#${movimento.produto_id}`}</td>
                    <td className="admin-cell-shrink">
                      <span className="admin-badge is-neutral">{movimento.tipo}</span>
                    </td>
                    <td className="admin-cell-num">
                      {Number(movimento.quantidade || 0).toFixed(3)} <span className="admin-unit">{movimento.unidade || "unidade"}</span>
                    </td>
                    <td className="admin-cell-num">{Number(movimento.total || 0).toFixed(2)} MT</td>
                    <td className="admin-cell-strong">{movimento.usuario_nome || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">
                    Nenhum movimento registrado.
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

export default Admin;
