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

// GET PathUrlBooksFavorite
function qyPathUrlBooksFavorite(pathUrl: string, userId: string | undefined): PipelineStage[] {
  return [
    {
      $match: { pathUrl: pathUrl },
    },
    {
      $lookup: {
        from: 'favorites',
        localField: '_id', // ID del libro
        foreignField: 'favoriteBooks', // Campo en favoritos que contiene los IDs de los libros
        as: 'favoriteInfo',
        pipeline: [
          {
            $match: {
              userId: userId, // Coincide solo con los favoritos del usuario actual
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isFavorite: {
          $cond: {
            if: { $gt: [{ $size: '$favoriteInfo' }, 0] },
            then: true,
            else: false,
          },
        },
        id: '$_id',
      },
    },
    {
      $project: {
        favoriteInfo: 0,
        _id: 0,
      },
    },
  ];
}

// GET qyFindAllBookFavorite
function qyFindAllBookFavorite(userId: string, limit: number, offset: number): PipelineStage[] {
  return [
    {
      $match: { userId: userId },
    },
    {
      $lookup: {
        from: 'books',
        localField: 'favoriteBooks', // Campo que contiene los IDs de los libros en la colección `favorites`
        foreignField: '_id', // Campo que contiene los IDs en la colección `books`
        as: 'bookDetails', // Nombre del campo que contendrá los detalles del libro
      },
    },
    {
      // $addFields + $map: Recorre favoriteBooks y para cada libro favorito,
      // filtra 'bookDetails' para encontrar la coincidencia exacta por '_id', manteniendo el orden original.
      $addFields: {
        bookDetails: {
          $map: {
            input: '$favoriteBooks',
            as: 'favoriteBookId',
            in: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$bookDetails',
                    as: 'bookDetail',
                    cond: { $eq: ['$$bookDetail._id', '$$favoriteBookId'] },
                  },
                },
                0,
              ],
            },
          },
        },
      },
    },
    { $unwind: '$bookDetails' }, // Desempaqueta el array `bookDetails`
    { $replaceRoot: { newRoot: '$bookDetails' } }, // Reemplaza la raíz con los detalles del libro
    {
      $facet: {
        totalBooks: [{ $count: 'count' }],
        results: [
          { $skip: offset },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: '$_id',
              title: 1,
              authors: 1,
              category: 1,
              pathUrl: 1,
              image: 1,
              language: 1,
              views: 1,
            },
          },
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

// PATCH AddFavorite
function qyAddFavorite(userId: string, id: string) {
  return [
    { userId: userId },
    {
      $push: {
        favoriteBooks: {
          $each: [id], // Permite especificar un array de elementos a agregar.
          $position: 0, // Inserta al principio del array.
        },
      },
    },
    { upsert: true, new: true },
  ];
}

// PATCH RemoveFavorite
function qyRemoveFavorite(userId: string, id: string) {
  return [{ userId: userId }, { $pull: { favoriteBooks: id } }, { new: true }];
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
  qyPathUrlBooksFavorite,
  qyFindAllBookFavorite,
  qyAddFavorite,
  qyRemoveFavorite,
  qyPutBook,
};
