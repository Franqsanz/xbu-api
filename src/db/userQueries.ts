import { PipelineStage, Types } from 'mongoose';

// GET CheckUser
function qyCheckUser(userId: string) {
  const query = {
    uid: userId,
  };

  const projection = 'uid name username picture createdAt';

  return {
    query,
    projection,
  };
}

// GET PathUrlBooksFavorite
function qyPathUrlBooksFavorite(pathUrl: string, userId: string | undefined): PipelineStage[] {
  return [
    { $match: { pathUrl: pathUrl } },
    {
      $lookup: {
        from: 'favorites',
        let: { bookId: '$_id' }, // Usar let para pasar el bookId
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $in: ['$$bookId', '$favoriteBooks'] }, { $eq: ['$userId', userId] }],
              },
            },
          },
        ],
        as: 'favoriteInfo',
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

function qyFindAllBookFavorite(userId: string, limit: number, offset: number): PipelineStage[] {
  return [
    { $match: { userId: userId } },
    {
      $lookup: {
        from: 'books',
        localField: 'favoriteBooks', // IDs de los libros en favoritos
        foreignField: '_id', // Campo que contiene los IDs en la colección `books`
        as: 'bookDetails', // Campo que contendrá los detalles del libro
      },
    },
    {
      // Añadimos temporalmente para inspeccionar los datos
      $addFields: {
        allFavoriteBookIds: '$favoriteBooks', // Para verificar IDs de favoritos
        allBookDetailIds: { $map: { input: '$bookDetails', as: 'book', in: '$$book._id' } }, // Para verificar IDs de libros
      },
    },
    {
      // Aquí se filtran los libros faltantes que no están en `bookDetails`
      $addFields: {
        missingBooks: {
          $filter: {
            input: '$favoriteBooks',
            as: 'favoriteBookId',
            cond: {
              $not: {
                $in: [
                  '$$favoriteBookId',
                  { $map: { input: '$bookDetails', as: 'book', in: '$$book._id' } },
                ],
              },
            },
          },
        },
      },
    },
    {
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
    { $unwind: '$bookDetails' },
    { $match: { bookDetails: { $ne: null } } }, // Asegurarse de que solo se devuelvan documentos con información de libro
    {
      $project: {
        _id: 0,
        id: '$bookDetails._id',
        title: '$bookDetails.title',
        authors: '$bookDetails.authors',
        category: '$bookDetails.category',
        pathUrl: '$bookDetails.pathUrl',
        image: '$bookDetails.image',
        language: '$bookDetails.language',
        views: '$bookDetails.views',
        missingBooks: 1, // Verificar si `missingBooks` tiene valores
      },
    },
    {
      $facet: {
        totalBooks: [{ $count: 'count' }],
        results: [{ $skip: offset }, { $limit: limit }, { $unset: 'missingBooks' }],
        missingBooks: [{ $project: { missingBooks: 1 } }],
      },
    },
    {
      $addFields: {
        totalBooks: { $arrayElemAt: ['$totalBooks.count', 0] },
        missingBooks: { $arrayElemAt: ['$missingBooks.missingBooks', 0] },
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

// GET BooksByCollection
function qyBooksByCollectionId(collectionId: string): PipelineStage[] {
  return [
    { $unwind: '$collections' },
    { $match: { 'collections._id': new Types.ObjectId(collectionId) } },
    {
      $lookup: {
        from: 'books',
        localField: 'collections.books.bookId',
        foreignField: '_id',
        as: 'bookDetails',
      },
    },
    {
      $addFields: {
        missingBooks: {
          $filter: {
            input: '$collections.books',
            as: 'book',
            cond: {
              $not: {
                $in: [
                  '$$book.bookId',
                  { $map: { input: '$bookDetails', as: 'book', in: '$$book._id' } },
                ],
              },
            },
          },
        },
        // Invertir el orden de los libros
        reversedBooks: { $reverseArray: '$collections.books' },
      },
    },
    {
      $addFields: {
        bookDetails: {
          $map: {
            input: '$reversedBooks',
            as: 'collectionBook',
            in: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$bookDetails',
                    as: 'bookDetail',
                    cond: { $eq: ['$$bookDetail._id', '$$collectionBook.bookId'] },
                  },
                },
                0,
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        userId: 1,
        name: '$collections.name',
        books: {
          $map: {
            input: '$bookDetails',
            as: 'book',
            in: {
              id: '$$book._id',
              title: '$$book.title',
              authors: '$$book.authors',
              category: '$$book.category',
              pathUrl: '$$book.pathUrl',
              image: '$$book.image',
              language: '$$book.language',
              views: '$$book.views',
              checked: {
                $let: {
                  vars: {
                    matchedBook: {
                      $first: {
                        $filter: {
                          input: '$collections.books',
                          as: 'collectionBook',
                          cond: { $eq: ['$$collectionBook.bookId', '$$book._id'] },
                        },
                      },
                    },
                  },
                  in: { $ifNull: ['$$matchedBook.checked', false] },
                },
              },
            },
          },
        },
        missingBooks: 1,
      },
    },
    {
      $facet: {
        results: [{ $unset: 'missingBooks' }],
        missingBooks: [{ $project: { missingBooks: 1 } }],
      },
    },
    {
      $addFields: {
        missingBooks: { $arrayElemAt: ['$missingBooks.missingBooks', 0] },
      },
    },
  ];
}

// PATCH AddBookToCollection
function qyAddBookToCollection(
  userId: string,
  collectionId: string[],
  bookId: string,
  checked: boolean = false
) {
  return [
    {
      userId: userId,
      'collections._id': {
        $in: collectionId.map((id) => new Types.ObjectId(id)),
      },
    },
    {
      $addToSet: {
        'collections.$[elem].books': {
          bookId: new Types.ObjectId(bookId),
          checked: checked,
        },
      },
    },
    {
      arrayFilters: [
        {
          'elem._id': {
            $in: collectionId.map((id) => new Types.ObjectId(id)),
          },
        },
      ],
      upsert: false,
      new: true,
    },
  ];
}

// PATCH RemoveBookFromCollection
function qyRemoveBookFromCollection(userId: string, collectionId: string[], bookId: string) {
  return [
    {
      userId: userId,
      'collections._id': {
        $in: collectionId.map((id) => new Types.ObjectId(id)),
      },
    },
    {
      $pull: {
        'collections.$[elem].books': {
          bookId: new Types.ObjectId(bookId),
        },
      },
    },
    {
      arrayFilters: [
        {
          'elem._id': {
            $in: collectionId.map((id) => new Types.ObjectId(id)),
          },
        },
      ],
      new: true,
    },
  ];
}

// PATCH UpdateNameCollection
function qyUpdateCollectionName(userId: string, collectionId: string, name: string) {
  return [
    { userId: userId, 'collections._id': new Types.ObjectId(collectionId) },
    { $set: { 'collections.$.name': name } },
    { new: true },
  ];
}

// GET CollectionsForUser
function qyGetCollectionsForUser(userId: string, bookId: string): PipelineStage[] {
  return [
    { $match: { userId: userId } },
    { $unwind: '$collections' },
    { $sort: { 'collections.createdAt': -1 } },
    {
      $project: {
        _id: 0,
        id: '$collections._id',
        name: '$collections.name',
        checked: bookId
          ? {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$collections.books',
                          as: 'book',
                          cond: { $eq: ['$$book.bookId', new Types.ObjectId(bookId)] },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: true,
                else: false,
              },
            }
          : false,
      },
    },
  ];
}

export {
  qyCheckUser,
  qyPathUrlBooksFavorite,
  qyFindAllBookFavorite,
  qyAddFavorite,
  qyRemoveFavorite,
  qyBooksByCollectionId,
  qyAddBookToCollection,
  qyRemoveBookFromCollection,
  qyUpdateCollectionName,
  qyGetCollectionsForUser,
};
