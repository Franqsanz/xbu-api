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
    returnedObject.id = returnedObject._id;
    delete returnedObject._v;
    delete returnedObject._id;

    // Transformación de las colecciones
    if (returnedObject.collections) {
      returnedObject.collections = returnedObject.collections.map((collection: any) => {
        // Cambiar el nombre del _id a id en cada colección
        return {
          id: collection._id,
          name: collection.name,
          books: collection.books.map((book: any) => ({
            bookId: book.bookId,
            checked: book.checked,
          })),
          createdAt: collection.createdAt,
        };
      });
    }
  },
});

export default model<ICollections>('collections', collectionsSchema);
