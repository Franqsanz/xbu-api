import pkg from 'mongoose';
const { Schema, model } = pkg;

import { BooksDocument } from '../types';

const booksSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true
  },
  synopsis: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true
  },
  sourceLink: {
    type: String,
  },
  language: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  numberPages: {
    type: Number,
    required: true
  },
  format: {
    type: String,
    require: true
  },
  image: {
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
    }
  },
}, { versionKey: false });

booksSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id;
    delete returnedObject._v;
    delete returnedObject._id;
  }
});

export default model<BooksDocument>("books", booksSchema);
