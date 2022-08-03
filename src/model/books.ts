import pkg from 'mongoose';
const { Schema, model } = pkg;


export interface BooksDocument extends pkg.Document {
  title: string;
  description: string;
  author: string;
  category: string;
  publicationDate: string;
  numberPages: string;
}

const booksSchema = new Schema({
  title: {
    type: String,
    // required: true,
  },
  description: {
    type: String,
    // required: true,
  },
  author: {
    type: String,
    // required: true
  },
  category: {
    type: String,
  },
  publicationDate: {
    type: String,
  },
  numberPages: {
    type: Number,
  }
  // imgUrl: {
  //   type: Buffer,
  // },
}, { versionKey: false });

booksSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._v
    delete returnedObject._id
  }
});

export default model<BooksDocument>("books", booksSchema);