import pkg from 'mongoose';
const { Schema, model } = pkg;

import { ICollections } from '../types/types';

const collectionsSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    collections: [
      {
        name: {
          type: String,
          required: true,
          maxlength: 25,
        },
        books: [
          {
            _id: false,
            bookId: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            checked: {
              type: Boolean,
              default: false,
            },
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    versionKey: false,
  }
);

collectionsSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, collections, ...rest } = returnedObject;

    return {
      id: _id,
      ...rest,
      // Transformación de las colecciones
      collections: collections
        ? collections.map((collection: any) => {
            const { _id: collectionId, name, books, createdAt } = collection;
            return {
              id: collectionId,
              name,
              books: books.map((book: any) => ({
                bookId: book.bookId,
                checked: book.checked,
              })),
              createdAt,
            };
          })
        : undefined,
    };
  },
});

export default model<ICollections>('collections', collectionsSchema);
