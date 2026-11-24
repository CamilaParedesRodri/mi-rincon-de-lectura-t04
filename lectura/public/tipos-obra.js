export const camposPorTipo = {
  Manga: {
    tomosTotales: { etiqueta: 'Tomos', minimo: 1 },
    demografia: { etiqueta: 'Demografía', sugerencias: ['Shōnen', 'Shōjo', 'Seinen', 'Josei', 'Kodomo'] },
    publicacion: { etiqueta: 'Estado de publicación', opciones: ['En publicación', 'Finalizada', 'Pausada', 'Cancelada'] },
  },
  Manhwa: {
    temporada: { etiqueta: 'Temporadas', minimo: 1 },
    publicacion: { etiqueta: 'Estado de publicación', opciones: ['En publicación', 'Hiatus de temporada', 'Finalizada'] },
  },
  Novela: {
    volumenesTotales: { etiqueta: 'Volúmenes', minimo: 1 },
    tipoNovela: { etiqueta: 'Tipo de novela', opciones: ['Web novel', 'Light novel', 'Novela'] },
    version: { etiqueta: 'Idioma de lectura', opciones: ['Idioma original', 'Traducción oficial', 'Traducción de fans'] },
  },
  Fanfic: {
    ship: { etiqueta: 'Ship', ejemplo: 'Ej. A / B' },
    fandom: { etiqueta: 'Fandom' },
    estadoHistoria: { etiqueta: 'Estado de la historia', opciones: ['En progreso', 'Completada', 'Abandonada', 'One-shot'] },
    clasificacion: { etiqueta: 'Clasificación', opciones: ['Público general', 'Público adolescente y adulto', 'Maduro', 'Explícito'], etiquetaVacia: 'Sin clasificación' },
  },
  Otro: {
    formato: { etiqueta: 'Formato o subtipo', ejemplo: 'Ej. Cómic, relato' },
  },
};

export const campoAnterior = { Manga: 'demografia', Manhwa: 'formato', Novela: 'editorial', Fanfic: 'fandom' };
export const estados = ['Pendiente', 'Leyendo', 'Completada', 'Abandonada'];
