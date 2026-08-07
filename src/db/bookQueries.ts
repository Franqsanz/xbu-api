import { FilterQuery, PipelineStage, Types } from 'mongoose';

// GET Search
function qySearch(q: object | string | undefined) {
  const query = {
    $or: [
      {
        title: {
          $regex: q,
          $options: 'i',
        },
      },
      {
        authors: {
          $regex: q,
          $options: 'i',
        },
      },
    ],
  };

  const projection = 'title authors pathUrl';

  return {
    query,
    projection,
  };
}

// GET Options
function qyGroupOptions(): PipelineStage[] {
  return [
    {
      $facet: {
        byCategory: [
          { $unwind: '$category' },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, category: '$_id', count: 1 } }, // Renombrar "_id" a "category".
        ],
        byLanguage: [
          { $group: { _id: '$language', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, language: '$_id', count: 1 } }, // Renombrar "_id" a "language".
        ],
        byYear: [
          { $group: { _id: '$year', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, year: '$_id', count: 1 } }, // Renombrar "_id" a "year".
        ],
      },
    },
    {
      $group: {
        _id: null,
        categories: {
          $push: '$byCategory',
        },
        languages: {
          $push: '$byLanguage',
        },
        years: {
          $push: '$byYear',
        },
      },
    },
    {
      $project: { _id: 0 },
    },
  ];
}

// GET Filters
export type FilterDimension = 'language' | 'year' | 'authors' | 'pages';

export interface FacetFilters {
  category?: string;
  // Filtro principal `authors` (single, regex parcial) que viene del path.
  authors?: string;
  // Multi-select del sidebar
  languages?: string[];
  years?: string[];
  minPages?: number;
  maxPages?: number;
}

/**
 * Arma el `$match` base agregando cada filtro activo. Si `exclude` está seteado
 * omite ese filtro — usado para computar los counts dinámicos del sidebar:
 * cada dimensión debe verse a sí misma sin colapsar (el count de "Español"
 * siempre existe aunque el user marque "Español"), pero sí aplicar los filtros
 * de las otras dimensiones.
 */
function buildFilterMatch(filters: FacetFilters, exclude?: FilterDimension): FilterQuery<any> {
  const q: FilterQuery<any> = {};

  if (filters.category) q.category = filters.category;
  if (filters.authors) {
    q.authors = { $regex: filters.authors, $options: 'i' };
  }
  if (exclude !== 'language' && filters.languages && filters.languages.length > 0) {
    q.language = { $in: filters.languages.map((l) => new RegExp(`^${l}$`, 'i')) };
  }
  if (exclude !== 'year' && filters.years && filters.years.length > 0) {
    q.year = { $in: filters.years.map((y) => parseInt(y)) };
  }
  if (exclude !== 'pages') {
    if (filters.minPages !== undefined && filters.maxPages !== undefined) {
      q.numberPages = { $gte: filters.minPages, $lte: filters.maxPages };
    } else if (filters.minPages !== undefined) {
      q.numberPages = { $gte: filters.minPages };
    } else if (filters.maxPages !== undefined) {
      q.numberPages = { $lte: filters.maxPages };
    }
  }

  return q;
}

/**
 * Cursor pagination + facet counts dinámicos.
 *
 * El sub-pipeline `results` aplica TODOS los filtros + cursor.
 * Cada `*Counts` aplica todos los filtros EXCEPTO el de su propia dimensión
 * (patrón Amazon/MercadoLibre: al marcar "Español", los años/autores/páginas
 * se recalculan sobre libros en Español, pero la lista de idiomas mantiene
 * sus counts para poder cambiar de selección sin quedarte sin opciones).
 *
 * `includeCounts=false` en páginas siguientes ahorra las agregaciones — los
 * counts solo viajan en la 1ra página y el cliente los mantiene.
 */
function qyBooksFilteringByCursor(
  filters: FacetFilters,
  cursorId: string | null,
  limit: number,
  includeCounts: boolean
): PipelineStage[] {
  const cursorMatch = cursorId ? [{ $match: { _id: { $lt: new Types.ObjectId(cursorId) } } }] : [];

  const fullMatch = buildFilterMatch(filters);
  const matchExceptLanguage = buildFilterMatch(filters, 'language');
  const matchExceptYear = buildFilterMatch(filters, 'year');
  const matchExceptAuthors = buildFilterMatch(filters, 'authors');
  const matchExceptPages = buildFilterMatch(filters, 'pages');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facet: Record<string, any> = {
    results: [
      { $match: fullMatch },
      ...cursorMatch,
      { $sort: { _id: -1 } },
      { $limit: limit },
      {
        $project: {
          image: 1,
          title: 1,
          authors: {
            $cond: {
              if: { $isArray: '$authors' },
              then: '$authors',
              else: ['$authors'],
            },
          },
          category: {
            $cond: {
              if: { $isArray: '$category' },
              then: '$category',
              else: ['$category'],
            },
          },
          language: 1,
          year: 1,
          pathUrl: 1,
          numberPages: 1,
        },
      },
    ],
  };

  if (includeCounts) {
    facet.totalBooks = [{ $match: fullMatch }, { $count: 'count' }];
    facet.authorsCounts = [
      { $match: matchExceptAuthors },
      { $unwind: '$authors' },
      { $project: { authors: { $toLower: '$authors' } } },
      { $group: { _id: '$authors', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, authors: '$_id', count: 1 } },
    ];
    facet.languageCounts = [
      { $match: matchExceptLanguage },
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, language: '$_id', count: 1 } },
    ];
    facet.yearCounts = [
      { $match: matchExceptYear },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, year: '$_id', count: 1 } },
    ];
    facet.pagesCounts = [
      { $match: matchExceptPages },
      { $group: { _id: '$numberPages', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, numberPages: '$_id', count: 1 } },
    ];
  }

  const pipeline: PipelineStage[] = [{ $facet: facet }];

  if (includeCounts) {
    pipeline.push({
      $addFields: { totalBooks: { $arrayElemAt: ['$totalBooks.count', 0] } },
    });
  }

  return pipeline;
}

function qyBooksFiltering(query: FilterQuery<any>, offset: number, limit: number): PipelineStage[] {
  return [
    { $match: query },
    {
      $facet: {
        results: [
          { $sort: { _id: -1 } },
          { $skip: offset },
          { $limit: limit },
          {
            $project: {
              image: 1,
              title: 1,
              authors: {
                $cond: {
                  if: { $isArray: '$authors' },
                  then: '$authors',
                  else: ['$authors'],
                },
              },
              category: {
                $cond: {
                  if: { $isArray: '$category' },
                  then: '$category',
                  else: ['$category'],
                },
              },
              language: 1,
              year: 1,
              pathUrl: 1,
              numberPages: 1,
            },
          },
        ],
        totalBooks: [{ $count: 'count' }],
        authorsCounts: [
          { $unwind: '$authors' },
          { $project: { authors: { $toLower: '$authors' } } }, // Convertir a minúsculas para normalizar.
          { $group: { _id: '$authors', count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $project: { _id: 0, authors: '$_id', count: 1 } }, // Renombrar "_id" a "authors".
        ],
        languageCounts: [
          { $group: { _id: '$language', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, language: '$_id', count: 1 } }, // Renombrar "_id" a "language".
        ],
        yearCounts: [
          { $group: { _id: '$year', count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $project: { _id: 0, year: '$_id', count: 1 } }, // Renombrar "_id" a "year".
        ],
        pagesCounts: [
          { $group: { _id: '$numberPages', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, numberPages: '$_id', count: 1 } }, // Renombrar "_id" a "numberPages".
        ],
      },
    },
    {
      $addFields: {
        totalBooks: { $arrayElemAt: ['$totalBooks.count', 0] },
      },
    },
  ];
}

// GET BooksRandom
function qyBooksRandom(id: string): PipelineStage[] {
  return [
    { $match: { _id: { $ne: new Types.ObjectId(id) } } },
    { $sample: { size: 3 } },
    {
      $project: {
        title: 1,
        pathUrl: 1,
        authors: {
          $cond: {
            if: { $isArray: '$authors' },
            then: '$authors',
            else: ['$authors'],
          },
        },
      },
    },
  ];
}

// GET RelatedBooks
function qyRelatedBooks(id: string, selectedCategory: string): PipelineStage[] {
  return [
    {
      $match: {
        _id: { $ne: new Types.ObjectId(id) },
        category: selectedCategory,
      },
    },
    { $sample: { size: 3 } },
    {
      $project: {
        title: 1,
        pathUrl: 1,
        authors: {
          $cond: {
            if: { $isArray: '$authors' },
            then: '$authors',
            else: ['$authors'],
          },
        },
      },
    },
  ];
}

// GET MoreBooksAuthors
function qyMoreBooksAuthors(id: string, selectedAuthors: string): PipelineStage[] {
  return [
    {
      $match: {
        _id: { $ne: new Types.ObjectId(id) },
        authors: {
          $regex: selectedAuthors,
          $options: 'i',
        },
      },
    },
    { $sample: { size: 3 } },
    {
      $project: {
        title: 1,
        pathUrl: 1,
        authors: {
          $cond: {
            if: { $isArray: '$authors' },
            then: '$authors',
            else: ['$authors'],
          },
        },
      },
    },
  ];
}

// GET OneBooks
function qyOneBooks(id: string) {
  return [
    { _id: new Types.ObjectId(id) },
    { $inc: { views: 1 } }, // Incrementa el contador de vistas en 1
    { new: true }, // Devuelve el documento actualizado
  ];
}

// GET PathUrlBooksUpdate
function qyPathUrlBooksUpdateView(pathUrl: string) {
  return [{ pathUrl: pathUrl }, { $inc: { views: 1 } }, { new: true }];
}

// GET PathUrlBooks
function qyPathUrlBooks(pathUrl: string) {
  return [{ pathUrl: pathUrl }];
}

// GET PutBook
function qyPutBook(id: string, body: any, image: object) {
  return [id, { ...body, image: image }, { new: true }];
}

export {
  qySearch,
  qyGroupOptions,
  qyBooksFiltering,
  qyBooksFilteringByCursor,
  qyBooksRandom,
  qyRelatedBooks,
  qyMoreBooksAuthors,
  qyOneBooks,
  qyPathUrlBooksUpdateView,
  qyPathUrlBooks,
  qyPutBook,
};
