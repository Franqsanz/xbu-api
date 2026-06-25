import pkg from 'mongoose';
const { Schema, model } = pkg;

const bookProgressSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    bookId: {
      type: String,
      required: true,
    },
    // PDF: número de página. EPUB: CFI string que devuelve epub.js.
    position: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'epub'],
      required: true,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

bookProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });

bookProgressSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model('bookProgress', bookProgressSchema);
