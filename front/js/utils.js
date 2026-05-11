// Funções utilitárias

export function fmt(valor) {
  return "MT " + Number(valor).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function debounce(fn, wait) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
}

export function destroyCharts(charts) {
  Object.values(charts).forEach((c) => {
    try {
      c.destroy();
    } catch (e) {}
  });
  return {};
}

export function getRandomHour(index) {
  const horas = ["09:12", "10:35", "11:20", "13:45", "15:02", "16:30"];
  return horas[index] || "—";
}

export function formatDate(date) {
  return date.toISOString().split("T")[0];
}