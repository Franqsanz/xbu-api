import { FilterQuery, PipelineStage } from 'mongoose';

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
      $project: {
        _id: 0,
      },
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
          { $skip: offset },
          { $limit: limit },
          { $sort: { _id: -1 } },
          {
            $project: {
              image: 1,
              title: 1,
              authors: {
                $cond: {
                  if: {
                    $isArray: '$authors',
                  },
                  then: '$authors',
                  else: ['$authors'],
                },
              },
              category: {
                $cond: {
                  if: {
                    $isArray: '$category',
                  },
                  then: '$category',
                  else: ['$category'],
                },
              },
              language: 1,
              year: 1,
              pathUrl: 1,
            },
          },
        ],
        totalBooks: [{ $count: 'count' }],
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
function qyBooksRandom(): PipelineStage[] {
  return [
    {
      $sample: {
        size: 3,
      },
    },
    {
      $project: {
        title: 1,
        pathUrl: 1,
        authors: {
          $cond: {
            if: {
              $isArray: '$authors',
            },
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
        _id: {
          $ne: id,
        },
        category: selectedCategory,
      },
    },
    {
      $sample: {
        size: 3,
      },
    },
    {
      $project: {
        title: 1,
        pathUrl: 1,
        authors: {
          $cond: {
            if: {
              $isArray: '$authors',
            },
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
        _id: {
          $ne: id,
        },
        authors: {
          $regex: selectedAuthors,
          $options: 'i',
        },
      },
    },
    {
      $sample: {
        size: 3,
      },
    },
    {
      $project: {
        title: 1,
        pathUrl: 1,
        authors: {
          $cond: {
            if: {
              $isArray: '$authors',
            },
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
    {
      _id: id,
    },
    {
      $inc: {
        views: 1,
      },
    }, // Incrementa el contador de vistas en 1
    {
      new: true,
    }, // Devuelve el documento actualizado
  ];
}

// GET PathUrlBooks
function qyPathUrlBooks(pathUrl: string) {
  return [
    {
      pathUrl: pathUrl,
    },
    {
      $inc: {
        views: 1,
      },
    },
    {
      new: true,
    },
  ];
}

// GET PutBook
function qyPutBook(id: string, body: any, image: object) {
  return [
    id,
    {
      ...body,
      image: image,
    },
    {
      new: true,
    },
  ];
}

export {
  qySearch,
  qyGroupOptions,
  qyBooksFiltering,
  qyBooksRandom,
  qyRelatedBooks,
  qyMoreBooksAuthors,
  qyOneBooks,
  qyPathUrlBooks,
  qyPutBook,
};
