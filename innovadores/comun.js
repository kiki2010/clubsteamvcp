/* Código compartido por la página de votación (index.html) y la de resultados (resultados.html) */

/* ============ CONFIGURACIÓN ============ */
const CONFIG = {
  nombreEvento: "Votación en vivo",
  // Enlace CSV de la hoja "Participacion" (solo la columna Institución). Dejalo vacío para ver la demostración.
  urlParticipacion: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmpDznCK7JJAH8za5Ybr7UiTtdfxs4mjmjombJ7XXMX_Vq3azTsLHVt9XVh4Mji3d8n7j9nnuWAOV2/pub?gid=203801108&single=true&output=csv",
  // Enlace CSV de la hoja "ResultadosPublicos". Dejalo vacío hasta el momento de mostrar los resultados.
  urlResultados: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmpDznCK7JJAH8za5Ybr7UiTtdfxs4mjmjombJ7XXMX_Vq3azTsLHVt9XVh4Mji3d8n7j9nnuWAOV2/pub?gid=795406573&single=true&output=csv",
  segundosEntreActualizaciones: 30
};
/* ======================================= */

/* Datos de ejemplo para el modo demostración */
const DEMO_INSTITUCIONES = ["IPET N.º 382","Universidad Siglo 21","Universidad Siglo 21","Centro Educativo Monte","Centro Educativo Monte","Centro Educativo Monte","Centro Educativo Monte","Escuela Primaria de Jóvenes","Universidad Nacional","Veteranos","Veteranos","Veteranos"];
const DEMO_RESULTADOS = [
  ["Biointelligence","Biointelligence","Biointelligence","IPET N.º 382"],
  ["Biointelligence","Biointelligence","Biointelligence","Universidad Siglo 21"],
  ["Biointelligence","Biointelligence","Biointelligence","Universidad Siglo 21"],
  ["TropiBot","TropiBot","Biointelligence","Centro Educativo Monte"],
  ["TropiBot","TropiBot","TropiBot","Centro Educativo Monte"],
  ["TropiBot","TropiBot","TropiBot","Centro Educativo Monte"],
  ["TropiBot","TropiBot","TropiBot","Centro Educativo Monte"],
  ["Biointelligence","TropiBot","Biointelligence","Escuela Primaria de Jóvenes"],
  ["Biointelligence","Biointelligence","TropiBot","Universidad Nacional"],
  ["TropiBot","Biointelligence","Biointelligence","Veteranos"],
  ["TropiBot","Biointelligence","Biointelligence","Veteranos"],
  ["Biointelligence","TropiBot","Biointelligence","Veteranos"]
];

const modoDemo = !CONFIG.urlParticipacion;
const $ = (id) => document.getElementById(id);
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function normalizar(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function parseCSV(texto) {
  const filas = []; let fila = []; let campo = ""; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}
async function descargarCSV(url) {
  const sep = url.includes("?") ? "&" : "?";
  const resp = await fetch(url + sep + "t=" + Date.now(), { cache: "no-store" });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const texto = await resp.text();
  // Si el enlace no es CSV, Google devuelve una página HTML
  if (/^\s*<(!doctype|html)/i.test(texto)) throw new Error("formato");
  return parseCSV(texto).slice(1); // sin encabezado
}
function marcarEstado(tipo, texto) {
  const e = $("estado");
  e.className = "estado" + (tipo ? " " + tipo : "");
  $("estadoTexto").textContent = texto;
}
function mensajeDeError(e) {
  if (e && e.message === "formato") return "El enlace no es un CSV. Publicá la hoja en formato CSV (el enlace termina en output=csv).";
  if (e && e.message === "hoja") return "La hoja publicada tiene más de una columna. En urlParticipacion va el enlace de la hoja Participacion, que solo tiene la columna Institución.";
  return "No se pudo actualizar. Reintentando…";
}
function horaActual() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}