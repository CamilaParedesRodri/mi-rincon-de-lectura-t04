import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { campoAnterior, camposPorTipo, estados } from './public/tipos-obra.js';

function validarDetalles(tipo, entrada) {
  if (entrada === undefined) return null;
  if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
    throw new Error('Los detalles del tipo deben enviarse como un objeto.');
  }
  const campos = camposPorTipo[tipo];
  const detalles = Object.fromEntries(Object.keys(campos).map((nombre) => [nombre, null]));
  for (const [nombre, dato] of Object.entries(entrada)) {
    if (!Object.hasOwn(campos, nombre)) throw new Error('Hay un detalle que no corresponde al tipo de obra.');
    const valor = nombre === 'tipoNovela' && dato === 'Novela tradicional' ? 'Novela' : dato;
    if (valor === '' || valor === null) continue;
    const { etiqueta, minimo, opciones } = campos[nombre];
    if (minimo !== undefined) {
      if (!Number.isSafeInteger(valor) || valor < minimo) throw new Error(etiqueta + ' debe ser un entero desde ' + minimo + '.');
      detalles[nombre] = valor;
    } else {
      if (typeof valor !== 'string' || valor.trim().length > 120 || (opciones && !opciones.includes(valor))) {
        throw new Error('Revisa el valor de «' + etiqueta + '».');
      }
      if (valor.trim()) detalles[nombre] = valor.trim();
    }
  }
  return JSON.stringify(detalles);
}

function textoOpcional(valor, etiqueta, limite) {
  if (valor == null) return null;
  if (typeof valor !== 'string' || valor.trim().length > limite) {
    throw new Error(etiqueta + ' admite hasta ' + limite + ' caracteres.');
  }
  return valor.trim();
}

export function validarObra(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('Envía los datos de una obra.');
  }
  const { tipo, estado, capitulosLeidos, totalCapitulos = null, puntuacion = null } = datos;
  const titulo = typeof datos.titulo === 'string' ? datos.titulo.trim() : '';
  const autor = textoOpcional(datos.autor, 'Autor', 120);
  const notas = textoOpcional(datos.notas, 'Notas', 500);
  let enlace = textoOpcional(datos.enlace, 'Enlace', 2048);
  if (enlace) {
    const url = URL.parse(enlace);
    if (!url || !['http:', 'https:'].includes(url.protocol)) throw new Error('Ingresa un enlace válido que comience con http:// o https://.');
    enlace = url.href;
  }
  const genero = datos.generos ?? datos.genero ?? '';
  const detalleTipo = datos.detalleTipo ?? null;
  if (detalleTipo !== null && (typeof detalleTipo !== 'string' || detalleTipo.trim().length > 120)) {
    throw new Error('El detalle del tipo admite hasta 120 caracteres.');
  }
  if (!titulo || titulo.length > 150) throw new Error('El título debe tener entre 1 y 150 caracteres.');
  const generos = Array.isArray(genero) ? genero : [genero];
  if (generos.length > 60 || generos.some((nombre) => typeof nombre !== 'string' || nombre.trim().length > 80)) {
    throw new Error('Selecciona hasta 60 géneros de máximo 80 caracteres cada uno.');
  }
  if (typeof tipo !== 'string' || !Object.hasOwn(camposPorTipo, tipo) || !estados.includes(estado)) throw new Error('Selecciona un tipo y un estado válidos.');
  if (!Number.isSafeInteger(capitulosLeidos) || capitulosLeidos < 0) {
    throw new Error('Los capítulos leídos deben ser un número entero mayor o igual a cero.');
  }
  if (totalCapitulos !== null && (!Number.isSafeInteger(totalCapitulos) || totalCapitulos < 1 || totalCapitulos < capitulosLeidos)) {
    throw new Error('El total debe ser un entero positivo y cubrir los capítulos leídos.');
  }
  if (puntuacion !== null && (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5)) {
    throw new Error('La puntuación debe estar entre 1 y 5.');
  }
  const seleccion = [...new Set(generos.map((nombre) => nombre.trim()).filter(Boolean))];
  return { titulo, autor, enlace, notas, genero: Array.isArray(genero) ? JSON.stringify(seleccion) : seleccion.join(''), tipo, estado, capitulosLeidos, totalCapitulos, puntuacion, detalleTipo: detalleTipo?.trim() ?? null, detalles: validarDetalles(tipo, datos.detalles) };
}

function conGeneros(obra) {
  if (!obra) return obra;
  const texto = obra.genero;
  let generos = texto ? [texto] : [];
  if (texto.startsWith('[')) {
    try {
      const lista = JSON.parse(texto);
      if (Array.isArray(lista) && lista.every((nombre) => typeof nombre === 'string')) generos = lista;
    } catch {
      // Las obras anteriores pueden tener un género escrito como texto libre.
    }
  }
  const nombreAnterior = campoAnterior[obra.tipo];
  const detalles = obra.detalles === null
    ? (nombreAnterior && obra.detalleTipo ? { [nombreAnterior]: obra.detalleTipo } : {})
    : JSON.parse(obra.detalles);
  if (detalles.tipoNovela === 'Novela tradicional') detalles.tipoNovela = 'Novela';
  if (detalles.clasificacion === 'General') detalles.clasificacion = 'Público general';
  if (detalles.clasificacion === 'Teen') detalles.clasificacion = 'Público adolescente y adulto';
  return { ...obra, genero: generos.join(', '), generos, detalles };
}

export function abrirObras(ruta) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec(`
    CREATE TABLE IF NOT EXISTS obras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      genero TEXT NOT NULL,
      tipo TEXT NOT NULL,
      estado TEXT NOT NULL,
      capitulosLeidos INTEGER NOT NULL CHECK (capitulosLeidos >= 0),
      totalCapitulos INTEGER CHECK (totalCapitulos >= 1 AND totalCapitulos >= capitulosLeidos),
      puntuacion INTEGER CHECK (puntuacion BETWEEN 1 AND 5),
      detalleTipo TEXT NOT NULL DEFAULT '',
      detalles TEXT,
      autor TEXT NOT NULL DEFAULT '',
      enlace TEXT NOT NULL DEFAULT '',
      notas TEXT NOT NULL DEFAULT ''
    ) STRICT
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    const columnas = db.prepare('PRAGMA table_info(obras)').all();
    if (!columnas.some(({ name }) => name === 'detalleTipo')) {
      db.exec("ALTER TABLE obras ADD COLUMN detalleTipo TEXT NOT NULL DEFAULT ''");
    }
    if (!columnas.some(({ name }) => name === 'detalles')) {
      db.exec('ALTER TABLE obras ADD COLUMN detalles TEXT');
    }
    for (const campo of ['autor', 'enlace', 'notas']) {
      if (!columnas.some(({ name }) => name === campo)) {
        db.exec("ALTER TABLE obras ADD COLUMN " + campo + " TEXT NOT NULL DEFAULT ''");
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  const listar = db.prepare('SELECT * FROM obras ORDER BY id DESC');
  const consultar = db.prepare('SELECT * FROM obras WHERE id = ?');
  const insertar = db.prepare(`
    INSERT INTO obras (titulo, genero, tipo, estado, capitulosLeidos, totalCapitulos, puntuacion, detalleTipo, detalles, autor, enlace, notas)
    VALUES ($titulo, $genero, $tipo, $estado, $capitulosLeidos, $totalCapitulos, $puntuacion, $detalleTipo,
      json_patch('{}', $detalles), coalesce($autor, ''), coalesce($enlace, ''), coalesce($notas, ''))
    RETURNING *
  `);
  const actualizar = db.prepare(`
    UPDATE obras SET titulo = $titulo, genero = $genero, tipo = $tipo, estado = $estado,
      capitulosLeidos = $capitulosLeidos, totalCapitulos = $totalCapitulos, puntuacion = $puntuacion,
      detalleTipo = CASE WHEN $detalleTipo IS NOT NULL THEN $detalleTipo WHEN tipo = $tipo THEN detalleTipo ELSE '' END,
      detalles = CASE
        WHEN $detalles IS NOT NULL THEN json_patch(CASE WHEN tipo = $tipo THEN coalesce(detalles, '{}') ELSE '{}' END, $detalles)
        WHEN tipo = $tipo THEN detalles ELSE NULL END,
      autor = coalesce($autor, autor), enlace = coalesce($enlace, enlace), notas = coalesce($notas, notas)
    WHERE id = $id RETURNING *
  `);
  const eliminar = db.prepare('DELETE FROM obras WHERE id = ?');
  return {
    listar: () => listar.all().map(conGeneros),
    consultar: (id) => conGeneros(consultar.get(id)),
    crear: (obra) => conGeneros(insertar.get({ autor: null, enlace: null, notas: null, ...obra, detalleTipo: obra.detalleTipo ?? '', detalles: obra.detalles ?? null })),
    actualizar: (id, obra) => conGeneros(actualizar.get({ autor: null, enlace: null, notas: null, ...obra, detalleTipo: obra.detalleTipo ?? null, detalles: obra.detalles ?? null, id })),
    eliminar: (id) => eliminar.run(id).changes > 0,
  };
}
