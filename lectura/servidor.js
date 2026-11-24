import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abrirObras, validarObra } from './obras.js';

const rutaDb = process.env.LECTURA_DB ?? fileURLToPath(new URL('./datos/lectura.sqlite', import.meta.url));
const obras = abrirObras(rutaDb);
const archivos = new Map([
  ['/', ['index.html', 'text/html']],
  ['/estilos.css', ['estilos.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/tipos-obra.js', ['tipos-obra.js', 'text/javascript']],
  ['/rincon-lectura.png', ['rincon-lectura.png', 'image/png']],
]);

function json(res, estado, datos) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos));
}

async function leerObra(req) {
  const fragmentos = [];
  let bytes = 0;
  for await (const fragmento of req) {
    bytes += fragmento.length;
    if (bytes <= 8192) fragmentos.push(fragmento);
  }
  if (bytes > 8192) throw new Error('La solicitud supera los 8 KB.');
  let datos;
  try {
    datos = JSON.parse(Buffer.concat(fragmentos).toString('utf8'));
  } catch {
    throw new Error('El cuerpo de la solicitud debe ser JSON válido.');
  }
  return validarObra(datos);
}

const servidor = createServer(async (req, res) => {
  try {
    const ruta = new URL(req.url, 'http://localhost').pathname;
    const archivo = archivos.get(ruta);
    if (req.method === 'GET' && archivo) {
      const [nombre, tipo] = archivo;
      const contenido = readFileSync(new URL('./public/' + nombre, import.meta.url));
      res.writeHead(200, { 'Content-Type': tipo.startsWith('text/') ? tipo + '; charset=utf-8' : tipo });
      return res.end(contenido);
    }
    if (ruta === '/api/obras' && req.method === 'GET') return json(res, 200, obras.listar());
    const coincidencia = /^\/api\/obras\/([1-9]\d*)$/.exec(ruta);
    const id = coincidencia ? Number(coincidencia[1]) : null;
    const idValido = Number.isSafeInteger(id);
    if ((ruta === '/api/obras' && req.method === 'POST') || (idValido && req.method === 'PUT')) {
      let datos;
      try {
        datos = await leerObra(req);
      } catch (error) {
        return json(res, 400, { error: error.message });
      }
      if (req.method === 'POST') return json(res, 201, obras.crear(datos));
      const actualizada = obras.actualizar(id, datos);
      if (actualizada) return json(res, 200, actualizada);
    }
    if (idValido && req.method === 'GET') {
      const obra = obras.consultar(id);
      if (obra) return json(res, 200, obra);
    }
    if (idValido && req.method === 'DELETE' && obras.eliminar(id)) {
      res.writeHead(204);
      return res.end();
    }
    return json(res, 404, { error: 'Recurso no encontrado.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'No se pudo completar la operación.' });
  }
});

servidor.listen(Number(process.env.LECTURA_PUERTO ?? 3001), '127.0.0.1', () => {
  console.log('Mi rincón de lectura: http://127.0.0.1:' + servidor.address().port);
});
