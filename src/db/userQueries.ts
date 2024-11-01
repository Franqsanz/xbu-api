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
        localField: 'collections.books._id',
        foreignField: '_id',
        as: 'bookDetails',
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
      $group: {
        _id: '$collections._id',
        collectionName: { $first: '$collections.name' },
        createdAt: { $first: '$collections.createdAt' },
        missingBooks: { $first: '$missingBooks' },
        books: {
          $push: {
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
              },
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
          $reduce: {
            input: '$books',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this'] },
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
