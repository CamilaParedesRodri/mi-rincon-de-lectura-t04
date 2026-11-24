import { camposPorTipo, estados } from './tipos-obra.js?v=fanfic';

const formulario = document.querySelector('#obra');
const tituloFormulario = document.querySelector('#form-titulo');
const cancelar = document.querySelector('#cancelar');
const mensaje = document.querySelector('#mensaje');
const coleccion = document.querySelector('#coleccion');
const ficha = document.querySelector('#ficha');
const dialogoEliminar = document.querySelector('#confirmar-eliminacion');
const nombreObraEliminar = document.querySelector('#obra-a-eliminar');
const filtros = [...document.querySelectorAll('.filtros button')];
const obrasVisibles = document.querySelector('#obras-visibles');
const opcionesGeneros = document.querySelector('#opciones-generos');
const cantidadGeneros = document.querySelector('#cantidad-generos');
const tipos = Object.keys(camposPorTipo);
const selectorTipo = crearSelector('tipo', 'Tipo', tipos, tipos[0], { obligatorio: true });
const selectorEstado = crearSelector('estado', 'Estado', estados, estados[0], { obligatorio: true });
document.querySelector('#selector-tipo').replaceWith(selectorTipo);
document.querySelector('#selector-estado').replaceWith(selectorEstado);
const camposTipo = document.querySelector('#campos-tipo');
const campoCantidad = document.querySelector('#cantidad-obra');
const cantidadObra = campoCantidad.querySelector('input');
const cantidadPorTipo = { Manga: 'tomosTotales', Manhwa: 'temporada', Novela: 'volumenesTotales' };
const enlaceYNotas = document.querySelector('#enlace-y-notas');
const errorCapitulos = document.querySelector('#error-capitulos');
const catalogoGeneros = [
  'Acción', 'Aventura', 'Boys Love', 'Chick lit', 'Ciencia ficción', 'Clásicos',
  'Comedia', 'Slice of Life', 'Crimen', 'Cuento', 'Deportes',
  'Distopía', 'Drama', 'Espiritual', 'Experimental', 'Fantasía', 'Ficción general',
  'Gastronomía', 'Girls Love', 'Histórica', 'Hombres lobo', 'Juvenil', 'Misterio',
  'No ficción', 'Paranormal', 'Poesía', 'Psicológico', 'Romance', 'Sobrenatural',
  'Suspenso', 'Terror', 'Vampiros',
].sort((a, b) => a.localeCompare(b, 'es'));
let obraEnEdicion = null;
let guardando = false;
let obras = [];
let estadoSeleccionado = '';

async function solicitar(ruta = '', opciones) {
  const respuesta = await fetch('/api/obras' + ruta, opciones);
  if (respuesta.status === 204) return;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error);
  return datos;
}

function reiniciarFormulario() {
  formulario.reset();
  selectorTipo.open = false;
  selectorEstado.open = false;
  actualizarResumenSelector(selectorTipo);
  actualizarResumenSelector(selectorEstado);
  enlaceYNotas.open = false;
  mostrarCamposTipo();
  validarProgreso();
  mostrarOpcionesGeneros();
  obraEnEdicion = null;
  tituloFormulario.textContent = 'Agregar obra';
  cancelar.hidden = true;
}

function editar(obra) {
  for (const campo of formulario.elements) {
    if (campo.name === 'generos') continue;
    if (campo.type === 'radio') {
      campo.checked = campo.value === String(obra[campo.name] ?? '');
    } else if (campo.name) {
      campo.value = obra[campo.name] ?? '';
    }
  }
  mostrarOpcionesGeneros(generosDe(obra));
  actualizarResumenSelector(selectorTipo);
  actualizarResumenSelector(selectorEstado);
  mostrarCamposTipo(obra.detalles);
  enlaceYNotas.open = Boolean(obra.enlace || obra.notas);
  validarProgreso();
  obraEnEdicion = obra.id;
  tituloFormulario.textContent = 'Editar obra';
  cancelar.hidden = false;
  formulario.elements.titulo.focus();
}

function actualizarResumenSelector(selector) {
  selector.querySelector('.valor-selector').textContent = selector.querySelector('input:checked')?.value ?? '';
}

function crearSelector(nombre, etiqueta, opciones, valor, { etiquetaVacia = 'Sin especificar', obligatorio = false } = {}) {
  const selector = document.createElement('details');
  selector.className = 'selector-generos ancho';
  const resumen = document.createElement('summary');
  const seleccion = document.createElement('span');
  seleccion.className = 'valor-selector';
  resumen.append(etiqueta);
  if (obligatorio) {
    const marca = document.createElement('span');
    marca.className = 'marca-obligatorio';
    marca.setAttribute('aria-hidden', 'true');
    marca.textContent = ' *';
    resumen.append(marca);
  }
  resumen.append(seleccion);
  const lista = document.createElement('div');
  lista.className = 'opciones-selector';
  lista.setAttribute('role', 'radiogroup');
  lista.setAttribute('aria-label', etiqueta);
  for (const opcion of opciones) {
    const fila = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = nombre;
    radio.required = obligatorio;
    radio.value = opcion;
    radio.defaultChecked = opcion === valor;
    fila.append(radio, opcion || etiquetaVacia);
    lista.append(fila);
  }
  selector.append(resumen, lista);
  selector.addEventListener('change', () => actualizarResumenSelector(selector));
  actualizarResumenSelector(selector);
  return selector;
}

function mostrarCamposTipo(valores = {}) {
  camposTipo.replaceChildren();
  const tipo = formulario.elements.tipo.value;
  const nombreCantidad = cantidadPorTipo[tipo];
  campoCantidad.hidden = !nombreCantidad;
  cantidadObra.disabled = campoCantidad.hidden;
  cantidadObra.dataset.detalle = nombreCantidad ?? '';
  cantidadObra.value = valores[nombreCantidad] ?? '';
  campoCantidad.querySelector('span').textContent = camposPorTipo[tipo][nombreCantidad]?.etiqueta ?? '';
  for (const [nombre, { etiqueta, opciones, sugerencias, minimo, ejemplo, etiquetaVacia }] of Object.entries(camposPorTipo[tipo])) {
    if (nombre === nombreCantidad) continue;
    if (opciones || sugerencias) {
      const valor = valores[nombre] ?? '';
      const alternativas = [...new Set(['', ...(opciones ?? sugerencias), valor])];
      const selector = crearSelector('seleccion-' + nombre, etiqueta, alternativas, valor, { etiquetaVacia });
      selector.dataset.seleccionDetalle = nombre;
      camposTipo.append(selector);
      continue;
    }
    const grupo = document.createElement('label');
    const campo = document.createElement('input');
    campo.dataset.detalle = nombre;
    if (minimo !== undefined) {
      campo.type = 'number';
      campo.min = minimo;
      campo.max = Number.MAX_SAFE_INTEGER;
    } else {
      campo.maxLength = 120;
      campo.placeholder = ejemplo ?? '';
    }
    campo.value = valores[nombre] ?? '';
    grupo.append(etiqueta, campo);
    if (nombre === 'formato') grupo.className = 'ancho';
    camposTipo.append(grupo);
  }
}

function validarAvance(leidos, total, aviso, texto) {
  const excedido = total.value !== '' && leidos.valueAsNumber > total.valueAsNumber;
  const error = excedido ? texto : '';
  leidos.setCustomValidity(error);
  leidos.setAttribute('aria-invalid', String(excedido));
  if (aviso.textContent !== error) aviso.textContent = error;
  aviso.hidden = !excedido;
}

function validarProgreso() {
  validarAvance(formulario.elements.capitulosLeidos, formulario.elements.totalCapitulos, errorCapitulos,
    'Los capítulos leídos no pueden superar el total.');
}

function generosDe(obra) {
  const generos = obra.generos ?? (obra.genero ? [obra.genero] : []);
  return [...new Set(generos.map((genero) => genero === 'Costumbrismo (Slice of Life)' ? 'Slice of Life' : genero))];
}

function actualizarCantidadGeneros() {
  const cantidad = opcionesGeneros.querySelectorAll('input:checked').length;
  cantidadGeneros.textContent = cantidad === 0 ? '' : String(cantidad);
}

function mostrarOpcionesGeneros(seleccion = []) {
  opcionesGeneros.replaceChildren();
  for (const nombre of new Set([...catalogoGeneros, ...seleccion])) {
    const etiqueta = document.createElement('label');
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.name = 'generos';
    casilla.value = nombre;
    casilla.checked = seleccion.includes(nombre);
    etiqueta.append(casilla, nombre);
    opcionesGeneros.append(etiqueta);
  }
  actualizarCantidadGeneros();
}

async function cargarColeccion() {
  obras = await solicitar();
  mostrarColeccion();
}

function mostrarColeccion() {
  const visibles = estadoSeleccionado ? obras.filter((obra) => obra.estado === estadoSeleccionado) : obras;
  coleccion.replaceChildren();
  if (visibles.length === 0) {
    obrasVisibles.textContent = obras.length === 0 ? 'Tu colección está vacía.' : 'No tienes obras en este estado.';
    return;
  }
  obrasVisibles.textContent = visibles.length === 1 ? '1 obra' : visibles.length + ' obras';
  for (const obra of visibles) {
    const tarjeta = ficha.content.cloneNode(true);
    tarjeta.querySelector('.tipo').textContent = obra.tipo;
    const estado = tarjeta.querySelector('.estado-obra');
    estado.textContent = obra.estado;
    estado.dataset.estado = obra.estado;
    tarjeta.querySelector('h3').textContent = obra.titulo;
    const autor = tarjeta.querySelector('.autor-obra');
    autor.textContent = obra.autor;
    autor.hidden = !obra.autor;
    const notas = tarjeta.querySelector('.notas-obra');
    notas.textContent = obra.notas;
    notas.hidden = !obra.notas;
    const enlace = tarjeta.querySelector('.enlace-obra');
    if (obra.enlace) {
      enlace.href = obra.enlace;
      enlace.hidden = false;
    }
    const detalle = tarjeta.querySelector('.detalle-obra');
    for (const [nombre, { etiqueta }] of Object.entries(camposPorTipo[obra.tipo])) {
      const valor = obra.detalles?.[nombre];
      if (valor === undefined) continue;
      const termino = document.createElement('dt');
      const descripcion = document.createElement('dd');
      termino.textContent = etiqueta;
      descripcion.textContent = valor;
      detalle.append(termino, descripcion);
      detalle.hidden = false;
    }
    const listaGeneros = tarjeta.querySelector('.generos');
    const generos = generosDe(obra);
    listaGeneros.hidden = generos.length === 0;
    for (const nombre of generos) {
      const etiqueta = document.createElement('li');
      etiqueta.textContent = nombre;
      listaGeneros.append(etiqueta);
    }
    const capitulos = obra.totalCapitulos === null ? obra.capitulosLeidos : obra.capitulosLeidos + '/' + obra.totalCapitulos;
    tarjeta.querySelector('.progreso').textContent = 'Capítulos leídos: ' + capitulos;
    const valoracion = tarjeta.querySelector('.valoracion');
    if (obra.puntuacion === null) {
      valoracion.textContent = 'Sin puntuar';
    } else {
      const estrellas = document.createElement('span');
      estrellas.className = 'estrellas-lectura';
      estrellas.setAttribute('aria-hidden', 'true');
      estrellas.textContent = '★'.repeat(obra.puntuacion) + '☆'.repeat(5 - obra.puntuacion);
      valoracion.append(estrellas, obra.puntuacion + '/5');
    }
    tarjeta.querySelector('.editar').onclick = () => {
      if (!guardando) editar(obra);
    };
    tarjeta.querySelector('.eliminar').onclick = (evento) => {
      if (guardando) return;
      const boton = evento.currentTarget;
      nombreObraEliminar.textContent = '«' + obra.titulo + '»';
      dialogoEliminar.returnValue = '';
      dialogoEliminar.addEventListener('close', () => {
        if (dialogoEliminar.returnValue === 'eliminar') eliminarObra(obra.id, boton);
      }, { once: true });
      dialogoEliminar.showModal();
    };
    coleccion.append(tarjeta);
  }
}

for (const filtro of filtros) {
  filtro.onclick = () => {
    estadoSeleccionado = filtro.dataset.estado;
    for (const boton of filtros) boton.setAttribute('aria-pressed', boton === filtro);
    mostrarColeccion();
  };
}

async function eliminarObra(id, boton) {
  guardando = true;
  boton.disabled = true;
  try {
    await solicitar('/' + id, { method: 'DELETE' });
    if (obraEnEdicion === id) reiniciarFormulario();
    mensaje.textContent = 'Obra eliminada.';
    await cargarColeccion();
    document.querySelector('#coleccion-titulo').focus();
  } catch (error) {
    mensaje.textContent = error.message;
    boton.disabled = false;
    boton.focus();
  } finally {
    guardando = false;
  }
}

cancelar.onclick = reiniciarFormulario;
selectorTipo.addEventListener('change', () => {
  mostrarCamposTipo();
  validarProgreso();
});
formulario.addEventListener('input', validarProgreso);
mostrarCamposTipo();
opcionesGeneros.onchange = actualizarCantidadGeneros;
mostrarOpcionesGeneros();
formulario.onsubmit = async (evento) => {
  evento.preventDefault();
  if (guardando) return;
  validarProgreso();
  if (!formulario.reportValidity()) return;
  const campos = new FormData(formulario);
  const datos = { ...Object.fromEntries(campos), generos: campos.getAll('generos') };
  datos.detalles = {};
  for (const lista of camposTipo.querySelectorAll('[data-seleccion-detalle]')) {
    const opcion = lista.querySelector(':checked');
    delete datos[opcion.name];
    if (opcion.value) datos.detalles[lista.dataset.seleccionDetalle] = opcion.value;
  }
  for (const campo of formulario.querySelectorAll('[data-detalle]:enabled')) {
    if (campo.value !== '') {
      datos.detalles[campo.dataset.detalle] = campo.type === 'number' ? campo.valueAsNumber : campo.value;
    }
  }
  const id = obraEnEdicion;
  const boton = formulario.querySelector('button[type="submit"]');
  for (const campo of ['capitulosLeidos', 'totalCapitulos', 'puntuacion']) {
    datos[campo] = datos[campo] === '' ? null : Number(datos[campo]);
  }
  guardando = true;
  boton.disabled = true;
  cancelar.disabled = true;
  try {
    await solicitar(id === null ? '' : '/' + id, {
      method: id === null ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    reiniciarFormulario();
    mensaje.textContent = id === null ? 'Obra agregada.' : 'Obra actualizada.';
    await cargarColeccion();
  } catch (error) {
    mensaje.textContent = error.message;
  } finally {
    guardando = false;
    boton.disabled = false;
    cancelar.disabled = false;
  }
};

cargarColeccion().catch((error) => { mensaje.textContent = error.message; });
