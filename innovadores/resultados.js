/* Página de resultados: top 3 de proyectos por categoría. Requiere comun.js */

const CATEGORIAS = [
  { id: "divertido", titulo: "🎉 Proyecto más divertido", columna: 0, color: "#fbbf24" },
  { id: "creativo", titulo: "💡 Más creativo y original", columna: 1, color: "#f59e0b" },
  { id: "innovacion", titulo: "🤖 Más sorprendente por su funcionamiento", columna: 2, color: "#b45309" }
];
const COLUMNA_INSTITUCION_RESULTADOS = 3;

const hayResultados = modoDemo || !!CONFIG.urlResultados;
const abiertas = new Set();     // categorías con resultados visibles
const yaAnimadas = new Set();   // categorías cuyo "suspenso" ya se mostró

function formatoPorcentaje(x) {
  return (x * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%";
}
async function obtenerResultados() {
  if (modoDemo) return DEMO_RESULTADOS.slice();
  return await descargarCSV(CONFIG.urlResultados);
}
function calcularCategoria(filas, columna) {
  const instituciones = new Map();
  const nombresProyecto = new Map();
  for (const f of filas) {
    const proyecto = (f[columna] || "").trim();
    const institucion = normalizar(f[COLUMNA_INSTITUCION_RESULTADOS]);
    if (!proyecto || !institucion) continue;
    const clave = normalizar(proyecto);
    if (!nombresProyecto.has(clave)) nombresProyecto.set(clave, proyecto);
    if (!instituciones.has(institucion)) instituciones.set(institucion, { total: 0, por: new Map() });
    const reg = instituciones.get(institucion);
    reg.total++;
    reg.por.set(clave, (reg.por.get(clave) || 0) + 1);
  }
  const resultado = [];
  for (const [clave, nombre] of nombresProyecto) {
    let suma = 0, votos = 0;
    for (const reg of instituciones.values()) {
      const n = reg.por.get(clave) || 0;
      suma += n / reg.total;
      votos += n;
    }
    resultado.push({ nombre, puntaje: Math.round(suma / instituciones.size * 1e6) / 1e6, votos });
  }
  resultado.sort((a, b) => b.puntaje - a.puntaje || b.votos - a.votos || a.nombre.localeCompare(b.nombre, "es"));
  let pos = 0;
  resultado.forEach((r, i) => {
    pos = (i > 0 && r.puntaje === resultado[i - 1].puntaje) ? pos : i + 1;
    r.pos = pos;
  });
  const podio = resultado.filter(r => r.pos <= 3);
  podio.forEach(r => { r.empate = podio.filter(o => o.pos === r.pos).length > 1; });
  return podio;
}
function dibujarPodio(cat, podio, animar) {
  const lista = document.querySelector('[data-podio="' + cat.id + '"]');
  lista.innerHTML = "";
  if (!podio.length) {
    lista.innerHTML = '<li class="visible"><span></span><span class="mensaje">Todavía no hay votos en esta categoría.</span></li>';
    return;
  }
  podio.forEach((r, i) => {
    const li = document.createElement("li");
    if (r.pos === 1) li.className = "primero";
    li.innerHTML = '<span class="pos"></span><span class="nombre"></span><span class="puntos"></span><span class="detalle"></span>';
    li.querySelector(".pos").textContent = r.pos;
    li.querySelector(".nombre").textContent = r.nombre;
    li.querySelector(".puntos").textContent = formatoPorcentaje(r.puntaje);
    const detalle = li.querySelector(".detalle");
    detalle.textContent = r.votos.toLocaleString("es-AR") + (r.votos === 1 ? " voto en total" : " votos en total");
    if (r.empate) {
      const e = document.createElement("span");
      e.className = "empate"; e.textContent = " · Empate";
      detalle.appendChild(e);
    }
    lista.appendChild(li);
    if (!animar || reducirMovimiento) { li.classList.add("visible"); }
    else {
      // suspenso: aparece primero el último puesto y el 1.º queda para el final
      const demora = (podio.length - 1 - i) * 800 + 100;
      setTimeout(() => li.classList.add("visible"), demora);
    }
  });
}
async function mostrarCategoria(cat) {
  const boton = document.querySelector('[data-boton="' + cat.id + '"]');
  const lista = document.querySelector('[data-podio="' + cat.id + '"]');
  boton.disabled = true;
  boton.textContent = "Cargando…";
  try {
    const filas = await obtenerResultados();
    abiertas.add(cat.id);
    const animar = !yaAnimadas.has(cat.id);
    yaAnimadas.add(cat.id);
    dibujarPodio(cat, calcularCategoria(filas, cat.columna), animar);
    boton.textContent = "Ocultar resultados";
    boton.setAttribute("aria-pressed", "true");
    if (!modoDemo) marcarEstado("", "Resultados actualizados " + horaActual());
  } catch (e) {
    lista.innerHTML = '<li class="visible"><span></span><span class="mensaje">No se pudieron cargar los resultados. Probá de nuevo en unos segundos.</span></li>';
    boton.textContent = "Mostrar top 3";
    marcarEstado("error", mensajeDeError(e));
  }
  boton.disabled = false;
}
function ocultarCategoria(cat) {
  abiertas.delete(cat.id);
  yaAnimadas.delete(cat.id);
  document.querySelector('[data-podio="' + cat.id + '"]').innerHTML = "";
  const boton = document.querySelector('[data-boton="' + cat.id + '"]');
  boton.textContent = "Mostrar top 3";
  boton.setAttribute("aria-pressed", "false");
}
function armarCategorias() {
  const contenedor = $("categorias");
  CATEGORIAS.forEach(cat => {
    const art = document.createElement("article");
    art.className = "event-card categoria";
    art.style.setProperty("--color", cat.color);
    art.innerHTML = '<h3></h3><button type="button" class="pin" aria-pressed="false"></button><ol class="podio"></ol>';
    art.querySelector("h3").textContent = cat.titulo;
    const boton = art.querySelector("button");
    boton.dataset.boton = cat.id;
    art.querySelector(".podio").dataset.podio = cat.id;
    if (!hayResultados) {
      boton.textContent = "Disponible al cerrar la votación";
      boton.disabled = true;
    } else {
      boton.textContent = "Mostrar top 3";
      boton.addEventListener("click", () => abiertas.has(cat.id) ? ocultarCategoria(cat) : mostrarCategoria(cat));
    }
    contenedor.appendChild(art);
  });
  if (!hayResultados) $("textoResultados").textContent = "Los resultados se muestran cuando termina la votación.";
}
// Si hay categorías abiertas, se recalculan sin repetir la animación
async function refrescarAbiertas() {
  if (!abiertas.size || modoDemo) return;
  try {
    const filas = await obtenerResultados();
    CATEGORIAS.filter(c => abiertas.has(c.id)).forEach(c => dibujarPodio(c, calcularCategoria(filas, c.columna), false));
    marcarEstado("", "Resultados actualizados " + horaActual());
  } catch (e) {
    marcarEstado("error", mensajeDeError(e));
  }
}

document.title = "Resultados - " + CONFIG.nombreEvento + " - Club STEAM VCP";
if (modoDemo) {
  $("avisoDemo").hidden = false;
  marcarEstado("demo", "Datos de ejemplo");
} else if (!hayResultados) {
  marcarEstado("", "Esperando el cierre de la votación");
} else {
  marcarEstado("", "Listo para mostrar los resultados");
}
armarCategorias();
setInterval(refrescarAbiertas, CONFIG.segundosEntreActualizaciones * 1000);