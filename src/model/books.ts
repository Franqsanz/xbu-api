import pkg from 'mongoose';
const { Schema, model } = pkg;

import { BooksDocument } from '../types';

const booksSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  synopsis: {
    type: String,
    required: true,
  },
  category: {
    type: [String],
    required: true,
    default: []
  },
  sourceLink: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    required: true,
    trim: true,
  },
  year: {
    type: Number,
    required: true,
    trim: true,
  },
  numberPages: {
    type: Number,
    required: true,
    trim: true,
  },
  format: {
    type: String,
    require: true
  },
  pathUrl: {
    type: String,
    require: true,
    trim: true,
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

export default model<BooksDocument>('books', booksSchema);
