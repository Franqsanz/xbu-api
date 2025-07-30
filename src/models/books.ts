import pkg from 'mongoose';
const { Schema, model } = pkg;

import { IBook } from '../types/types';

const booksSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: {
      type: [String],
      required: true,
      trim: true,
      default: [],
    },
    synopsis: {
      type: String,
      required: true,
    },
    category: {
      type: [String],
      required: true,
      default: [],
    },
    sourceLink: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1800,
      max: 2050,
    },
    numberPages: {
      type: Number,
      required: true,
      min: 49,
    },
    format: {
      type: String,
      require: true,
    },
    pathUrl: {
      type: String,
      require: true,
      trim: true,
    },
    image: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
      },
    },
    userId: {
      type: String,
    },
    views: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

booksSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model<IBook>('books', booksSchema);
