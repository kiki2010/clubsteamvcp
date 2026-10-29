/* Página de votación: contador de votantes y top 3 de instituciones. Requiere comun.js */

let totalMostrado = 0;
let animacionTotal = null;

async function obtenerInstituciones() {
  if (modoDemo) return DEMO_INSTITUCIONES.slice();
  const filas = await descargarCSV(CONFIG.urlParticipacion);
  // La hoja de participación debe tener SOLO la columna Institución
  if (filas.some(f => f.filter(c => c.trim() !== "").length > 1)) throw new Error("hoja");
  return filas.map(f => (f[0] || "").trim()).filter(Boolean);
}
function contarPorInstitucion(lista) {
  const mapa = new Map();
  for (const nombre of lista) {
    const clave = normalizar(nombre);
    if (!mapa.has(clave)) mapa.set(clave, { nombre, n: 0 });
    mapa.get(clave).n++;
  }
  return [...mapa.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"));
}
function animarTotal(destino) {
  if (animacionTotal) cancelAnimationFrame(animacionTotal);
  const inicio = totalMostrado, t0 = performance.now(), dur = reducirMovimiento ? 0 : 700;
  function paso(ahora) {
    const p = dur === 0 ? 1 : Math.min((ahora - t0) / dur, 1);
    totalMostrado = Math.round(inicio + (destino - inicio) * p);
    $("total").textContent = totalMostrado.toLocaleString("es-AR");
    if (p < 1) animacionTotal = requestAnimationFrame(paso);
  }
  animacionTotal = requestAnimationFrame(paso);
}
function dibujarParticipacion(lista) {
  animarTotal(lista.length);
  $("totalEtiqueta").textContent = lista.length === 1 ? "persona ya votó" : "personas ya votaron";
  const top = contarPorInstitucion(lista).slice(0, 3);
  const ol = $("topInstituciones");
  if (!top.length) {
    ol.innerHTML = '<li class="vacio">Todavía no hay votos. Cuando llegue el primero, aparece acá.</li>';
    return;
  }
  const maximo = top[0].n;
  ol.innerHTML = "";
  top.forEach((inst, i) => {
    const li = document.createElement("li");
    li.className = "inst-fila";
    li.innerHTML =
      '<span class="inst-pos"></span><span class="inst-nombre"></span><span class="inst-cantidad"></span>' +
      '<div class="barra"><span></span></div>';
    li.querySelector(".inst-pos").textContent = i + 1;
    li.querySelector(".inst-nombre").textContent = inst.nombre;
    li.querySelector(".inst-cantidad").textContent = inst.n.toLocaleString("es-AR") + (inst.n === 1 ? " voto" : " votos");
    li.querySelector(".barra > span").style.width = (inst.n / maximo * 100) + "%";
    ol.appendChild(li);
  });
}
async function actualizar() {
  try {
    const lista = await obtenerInstituciones();
    dibujarParticipacion(lista);
    if (modoDemo) marcarEstado("demo", "Datos de ejemplo");
    else marcarEstado("", "En vivo · actualizado " + horaActual());
  } catch (e) {
    marcarEstado("error", mensajeDeError(e));
  }
}

document.title = CONFIG.nombreEvento + " - Club STEAM VCP";
$("titulo").textContent = CONFIG.nombreEvento;
if (modoDemo) $("avisoDemo").hidden = false;
actualizar();
setInterval(actualizar, CONFIG.segundosEntreActualizaciones * 1000);