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
        localField: 'collections.books._id', // IDs de los libros en la colección
        foreignField: '_id', // Campo que contiene los IDs en la colección `books`
        as: 'bookDetails', // Campo que contendrá los detalles del libro
      },
    },
    {
      $addFields: {
        missingBooks: {
          $filter: {
            input: '$collections.books._id',
            as: 'bookId',
            cond: {
              $not: {
                $in: [
                  '$$bookId',
                  { $map: { input: '$bookDetails', as: 'book', in: '$$book._id' } },
                ],
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        bookDetails: {
          $map: {
            input: '$collections.books',
            as: 'bookId',
            in: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$bookDetails',
                    as: 'book',
                    cond: { $eq: ['$$book._id', '$$bookId._id'] },
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
      $group: {
        _id: '$collections._id',
        collectionName: { $first: '$collections.name' },
        createdAt: { $first: '$collections.createdAt' },
        missingBooks: { $first: '$missingBooks' },
        books: {
          $push: {
            $cond: {
              if: { $ne: [{ $size: '$bookDetails' }, 0] },
              then: {
                id: { $first: '$bookDetails._id' },
                title: { $first: '$bookDetails.title' },
                authors: { $first: '$bookDetails.authors' },
                category: { $first: '$bookDetails.category' },
                pathUrl: { $first: '$bookDetails.pathUrl' },
                image: { $first: '$bookDetails.image' },
                language: { $first: '$bookDetails.language' },
                views: { $first: '$bookDetails.views' },
              },
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: '$collectionName',
        createdAt: 1,
        missingBooks: 1,
        books: {
          $filter: {
            input: '$books',
            as: 'book',
            cond: { $ne: ['$$book', null] }, // Filtrar nulos
          },
        },
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

export { qyCheckUser, qyBooksByCollectionId };
