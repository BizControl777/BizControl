import { destroyCharts } from "./utils.js";
import { showModal, closeModal } from "./paginas/helpers.js";
import * as vendedorPages from "./paginas/vendedor.js";
import * as gestorPages from "./paginas/gestor.js";
import * as superPages from "./paginas/super.js";
import { initElectronApiBridge, loginWithElectronApi } from "./electron-bridge.js";

// Estado global
export const STATE = {
  role: "vendedor",
  user: null,
  currentPage: "",
  cart: [],
  charts: {},
};

// Callbacks para atualizar estado
let setProdutosCallback = null;
let setVendasCallback = null;
let currentProdutos = null;
let currentVendas = null;
let initVendedorPagesCallback = null;

export function setInitVendedorCallback(callback) {
  initVendedorPagesCallback = callback;
}

// Menus por role
const MENUS = {
  vendedor: [
    { id: "vender", icon: "<i class='fa-solid fa-credit-card'></i>", label: "Efectuar Venda" },
    { id: "produtos-v", icon: "<i class='fa-solid fa-box'></i>", label: "Produtos" },
    { id: "reservar", icon: "<i class='fa-solid fa-clipboard'></i>", label: "Reservar Produtos" }
  ],
  gestor: [
    { id: "dashboard", icon: "<i class='fa-solid fa-house'></i>", label: "Dashboard" },
    { id: "cadastrar", icon: "<i class='fa-solid fa-plus'></i>", label: "Cadastrar Produtos" },
    { id: "stock", icon: "<i class='fa-solid fa-box'></i>", label: "Nível de Stock" },
    { id: "financas", icon: "<i class='fa-solid fa-money-bill-wave'></i>", label: "Finanças" },
    { id: "ponto-venda", icon: "<i class='fa-solid fa-user-group'></i>", label: "Ponto de Venda" },
    { id: "estatisticas", icon: "<i class='fa-solid fa-chart-line'></i>", label: "Estatísticas" },
    { id: "reservas-g", icon: "<i class='fa-solid fa-clipboard'></i>", label: "Reservas" },
    { id: "definicoes", icon: "<i class='fa-solid fa-gear'></i>", label: "Definições" }
  ],
  super: [
    { id: "dashboard", icon: "<i class='fa-solid fa-house'></i>", label: "Dashboard" },
    { id: "empresas", icon: "<i class='fa-solid fa-building'></i>", label: "Empresas" },
    { id: "subscricoes", icon: "<i class='fa-solid fa-credit-card'></i>", label: "Subscrições" },
    { id: "super-stats", icon: "<i class='fa-solid fa-chart-simple'></i>", label: "Estatísticas Globais" }
  ]
};

// Registro de páginas
export const PAGES = {
  // Vendedor
  vender: vendedorPages.renderVender,
  "produtos-v": vendedorPages.renderProdutosV,
  reservar: vendedorPages.renderReservar,
  // Gestor
  dashboard: gestorPages.renderDashboard,
  cadastrar: gestorPages.renderCadastrar,
  stock: gestorPages.renderStock,
  financas: gestorPages.renderFinancas,
  "ponto-venda": gestorPages.renderPontoVenda,
  estatisticas: gestorPages.renderEstatisticas,
  "reservas-g": gestorPages.renderReservasG,
  definicoes: gestorPages.renderDefinicoes,
  // Super
  empresas: superPages.renderEmpresas,
  subscricoes: superPages.renderSubscricoes,
  "super-stats": superPages.renderSuperStats
};

export function setDataCallbacks(produtos, setProdutos, vendas, setVendas) {
  currentProdutos = produtos;
  setProdutosCallback = setProdutos;
  currentVendas = vendas;
  setVendasCallback = setVendas;
}

const mapUserRole = (user) => {
  if (!user) return "vendedor";
  const r = String(user.role || "").toLowerCase();
  if (r === "super") return "super";
  if (r === "gestor") return "gestor";
  if (user.perfil === "admin") return "super";
  if (Array.isArray(user.permissoes) && user.permissoes.includes("criar_produto")) return "gestor";
  return "vendedor";
};

export async function doLogin() {
  console.log("doLogin() chamado");
  const email = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value;
  console.log("Email:", email, "Senha:", password ? "***" : "(vazia)");

  if (!email || !password) {
    alert("Informe email e senha para entrar.");
    return;
  }

  initElectronApiBridge();

  const runLogin = () =>
    window.api?.authLogin
      ? window.api.authLogin({ email, password })
      : loginWithElectronApi(email, password);

  console.log("Verificando APIs:", {
    hasElectronAPI: !!window.electronAPI,
    hasElectronPost: !!window.electronAPI?.post,
    hasApi: !!window.api,
    hasApiAuthLogin: !!window.api?.authLogin
  });

  if (!window.electronAPI?.post && !window.api?.authLogin) {
    console.error("API Electron não disponível");
    alert("API Electron não disponível. Inicie a app com: npm start (não abra o HTML no browser).");
    return;
  }

  console.log("Iniciando login...", { hasElectronAPI: !!window.electronAPI?.post, hasApiAuthLogin: !!window.api?.authLogin });

  const btn = document.querySelector("#login-screen .btn-primary");
  if (btn) {
    btn.disabled = true;
    btn.dataset.prevText = btn.textContent;
    btn.textContent = "A entrar…";
  }

  let user;
  try {
    user = await runLogin();
  } catch (error) {
    console.error("Falha ao autenticar:", error);
    alert(error?.message || "Não foi possível autenticar.");
    return;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.prevText || "Entrar no Sistema";
    }
  }

  const nome = String(user?.nome || "Utilizador").trim() || "Utilizador";
  const initials =
    nome
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  STATE.user = user;
  STATE.role = mapUserRole(user);

  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");

  document.getElementById("topbar-username").textContent = nome;
  document.getElementById("topbar-userrole").textContent =
    STATE.role === "super" ? "Super Utilizador" : STATE.role === "gestor" ? "Gestor" : "Vendedor";
  document.getElementById("topbar-avatar").textContent = initials;
  document.getElementById("topbar-company").textContent = user.email || email;

  try {
    if (initVendedorPagesCallback) {
      await initVendedorPagesCallback(user);
    }
    buildSidebar();
  } catch (syncErr) {
    console.error("Erro após login (dados/menu):", syncErr);
    try {
      buildSidebar();
    } catch (e2) {
      console.error(e2);
    }
    alert(
      "Entrou no sistema, mas houve um erro ao preparar o ecrã: " + (syncErr?.message || String(syncErr))
    );
  }
}

export function logout() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-shell").classList.add("hidden");
  STATE.user = null;
  STATE.role = "vendedor";
  try {
    localStorage.removeItem("auth_token");
  } catch (_) {
    /* ignore */
  }
  STATE.cart = [];
  STATE.charts = destroyCharts(STATE.charts);
}

export function buildSidebar() {
  const sb = document.getElementById("sidebar");
  if (!sb) return;
  const items = MENUS[STATE.role] || MENUS.vendedor;
  sb.innerHTML = '<div class="nav-section">Menu</div>';
  items.forEach((m) => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.id = "nav-" + m.id;
    div.innerHTML = `<span class="nav-icon">${m.icon}</span><span>${m.label}</span>`;
    div.onclick = () => navigateTo(m.id);
    sb.appendChild(div);
  });
  navigateTo(items[0].id);
}

export function navigateTo(page) {
  STATE.currentPage = page;
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  const ni = document.getElementById("nav-" + page);
  if (ni) ni.classList.add("active");
  STATE.charts = destroyCharts(STATE.charts);
  const ca = document.getElementById("content-area");
  if (!ca) return;
  ca.innerHTML = "";
  if (PAGES[page]) {
    PAGES[page](ca);
  }
}

window.STATE = STATE;
window.navigateTo = navigateTo;
window.doLogin = doLogin;
window.logout = logout;
window.closeModal = closeModal;
window.showModalWrapper = showModal;

/** Delegado pelo carrinho (helpers) — implementação em vendedor.js */
window.changeQtyWrapper = function (id, delta) {
  if (typeof window.changeQtyWrapperImpl === "function") {
    window.changeQtyWrapperImpl(id, delta);
  }
};

initElectronApiBridge();
