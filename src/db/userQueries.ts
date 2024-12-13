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
function qyGetCollectionsForUser(userId: string, bookId: string) {
  return [
    { $match: { userId: userId } },
    { $unwind: '$collections' },
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
  qyBooksByCollectionId,
  qyAddBookToCollection,
  qyRemoveBookFromCollection,
  qyUpdateCollectionName,
  qyGetCollectionsForUser,
};
