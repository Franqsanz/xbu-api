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
  qyBooksRandom,
  qyRelatedBooks,
  qyMoreBooksAuthors,
  qyOneBooks,
  qyPathUrlBooksUpdateView,
  qyPathUrlBooks,
  qyPutBook,
};
