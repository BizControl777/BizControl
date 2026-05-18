import { fmt } from "../utils.js";
import { COMPANIES } from "../data.js";
import { showModal, closeModal } from "./helpers.js";

let STATE_charts = {};

export function initSuperPages() {
  // Inicializar páginas super admin se necessário
}

export function cleanup() {
  Object.values(STATE_charts).forEach((c) => {
    try {
      c.destroy();
    } catch (e) {}
  });
  STATE_charts = {};
}

export function renderEmpresas(el) {
  el.innerHTML = `
    <div class="page-header"><div class="page-title"><i class="fa-solid fa-building" style="margin-right:8px"></i> Gestão de Empresas</div><div class="page-sub">Todas as empresas registadas na plataforma</div></div>
    <div style="margin-bottom:16px;display:flex;justify-content:flex-end"><button class="btn btn-green" onclick="window.novaEmpresaWrapper()">➕ Nova Empresa</button></div>
    <div class="cards-row cols3" style="margin-bottom:20px">
      <div class="card"><div class="card-title">Total Empresas</div><div class="metric">${COMPANIES.length}</div></div>
      <div class="card"><div class="card-title">Activas</div><div class="metric green">${COMPANIES.filter(c => c.active).length}</div></div>
      <div class="card"><div class="card-title">Inactivas</div><div class="metric red">${COMPANIES.filter(c => !c.active).length}</div></div>
    </div>
    ${COMPANIES.map(c => `
      <div class="company-card">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:46px;height:46px;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">🏪</div>
          <div><div style="font-family:'Syne',sans-serif;font-weight:600;font-size:15px">${c.name}</div><div style="font-size:12px;color:var(--text2)">Plano: ${c.plan} • ${c.vendedores} vendedores • Expira: ${c.expires}</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="badge ${c.active ? "green" : "red"}">${c.active ? "Activa" : "Inactiva"}</span>
          <div class="toggle ${c.active ? "on" : ""}" onclick="window.toggleEmpresaWrapper(${c.id})"></div>
        </div>
      </div>
    `).join("")}
  `;
}

window.toggleEmpresaWrapper = function(id) {
  const c = COMPANIES.find(x => x.id === id);
  if (c) c.active = !c.active;
  window.location.reload();
};

window.novaEmpresaWrapper = function() {
  const confirmarEmpresa = () => {
    const nome = document.getElementById("e-nome").value.trim();
    const plano = document.getElementById("e-plano").value;
    const vend = parseInt(document.getElementById("e-vend").value) || 1;
    if (!nome) { alert("Nome obrigatório"); return; }
    COMPANIES.push({ id: Date.now(), name: nome, plan: plano, active: true, vendedores: vend, expires: plano === "Anual" ? "2027-05-04" : "2026-06-04" });
    closeModal();
    window.location.reload();
  };
  
  showModal(`
    <div class="modal-title">🏢 Cadastrar Nova Empresa</div>
    <div class="form-row"><div class="field" style="margin-bottom:12px"><label>Nome da Empresa</label><input id="e-nome" placeholder="ex: SuperMercado X" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--sm-r);padding:10px;color:var(--text)"/></div></div>
    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="field"><label>Plano</label><select id="e-plano" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--sm-r);padding:10px;color:var(--text)"><option>Mensal</option><option>Anual</option></select></div>
      <div class="field"><label>N.º Vendedores</label><input type="number" id="e-vend" value="1" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--sm-r);padding:10px;color:var(--text)"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="window.closeModal()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text2)">Cancelar</button>
      <button class="btn btn-green" id="confirm-modal-btn"><i class="fa-solid fa-check" style="margin-right:6px"></i> Cadastrar</button>
    </div>
  `, confirmarEmpresa);
};

export function renderSubscricoes(el) {
  el.innerHTML = `
    <div class="page-header"><div class="page-title"><i class="fa-solid fa-credit-card" style="margin-right:8px"></i> Controlo de Subscrições</div><div class="page-sub">Estado das subscrições por empresa</div></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Empresa</th><th>Plano</th><th>Estado</th><th>Expira</th><th>Receita/Ano</th><th>Acção</th></tr></thead><tbody>${COMPANIES.map(c => {
      const hoje = new Date("2026-05-04");
      const exp = new Date(c.expires);
      const dias = Math.round((exp - hoje) / (1000 * 60 * 60 * 24));
      const urgente = dias <= 30 && dias > 0;
      const expirado = dias < 0;
      return `<tr><td><strong>${c.name}</strong></td><td><span class="badge blue">${c.plan}</span></td><td><span class="badge ${c.active ? "green" : "red"}">${c.active ? "Activa" : "Suspensa"}</span></td><td style="color:${expirado ? "var(--red)" : urgente ? "var(--amber)" : "var(--text2)"}">${c.expires} ${urgente ? `<span class="notif-dot"></span>` : ""} ${expirado ? "(Expirado)" : urgente ? `(${dias}d)` : ""}</td><td style="color:var(--green)">${fmt(c.plan === "Anual" ? 3600 : 4800)}</td><td><button class="btn btn-sm btn-blue" onclick="window.renovarSubWrapper(${c.id})">🔄 Renovar</button></td></tr>`;
    }).join("")}</tbody></table></div></div>
    <div class="cards-row cols3" style="margin-top:20px">
      <div class="card"><div class="card-title">Receita Mensal Total</div><div class="metric green">${fmt(COMPANIES.filter(c => c.active).reduce((s, c) => s + (c.plan === "Anual" ? 300 : 400), 0))}</div></div>
      <div class="card"><div class="card-title">Receita Anual Projectada</div><div class="metric blue">${fmt(COMPANIES.filter(c => c.active).reduce((s, c) => s + (c.plan === "Anual" ? 3600 : 4800), 0))}</div></div>
      <div class="card"><div class="card-title">A expirar (30 dias)</div><div class="metric amber">${COMPANIES.filter(c => { const d = Math.round((new Date(c.expires) - new Date("2026-05-04")) / 86400000); return d >= 0 && d <= 30; }).length}</div></div>
    </div>
  `;
}

window.renovarSubWrapper = function(id) {
  const c = COMPANIES.find(x => x.id === id);
  if (!c) return;
  c.expires = c.plan === "Anual" ? "2027-05-04" : "2026-06-04";
  c.active = true;
  alert(`Subscrição de "${c.name}" renovada até ${c.expires}`);
  window.location.reload();
};

export function renderSuperStats(el) {
  el.innerHTML = `
    <div class="page-header"><div class="page-title"><i class="fa-solid fa-chart-simple" style="margin-right:8px"></i> Estatísticas Globais</div><div class="page-sub">Visão geral de toda a plataforma BizController</div></div>
    <div class="cards-row cols4">
      <div class="card"><div class="card-title">Total Empresas</div><div class="metric">${COMPANIES.length}</div></div>
      <div class="card"><div class="card-title">Activas</div><div class="metric green">${COMPANIES.filter(c => c.active).length}</div></div>
      <div class="card"><div class="card-title">Total Vendedores</div><div class="metric blue">${COMPANIES.reduce((s, c) => s + c.vendedores, 0)}</div></div>
      <div class="card"><div class="card-title">MRR</div><div class="metric amber">${fmt(COMPANIES.filter(c => c.active).reduce((s, c) => s + (c.plan === "Anual" ? 300 : 400), 0))}</div></div>
    </div>
    <div class="card"><div class="card-header"><div class="card-title">Crescimento de Empresas (últimos 6 meses)</div></div><div class="chart-container"><canvas id="chart-super-trend"></canvas></div></div>
  `;
  setTimeout(() => {
    const ctx = document.getElementById("chart-super-trend");
    if (ctx) {
      STATE_charts["super-trend"] = new Chart(ctx, { 
        type: "bar", 
        data: { 
          labels: ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"], 
          datasets: [
            { label: "Plano Mensal", data: [1, 1, 1, 2, 2, 2], backgroundColor: "rgba(0,150,255,0.5)", borderRadius: 4 }, 
            { label: "Plano Anual", data: [0, 0, 1, 1, 1, 1], backgroundColor: "rgba(0,212,170,0.5)", borderRadius: 4 }
          ] 
        }, 
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { labels: { color: "#8fa3c0" } } }, 
          scales: { 
            x: { stacked: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8fa3c0" } }, 
            y: { stacked: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8fa3c0", stepSize: 1 } } 
          } 
        } 
      });
    }
  }, 200);
}