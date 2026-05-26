import pkg from 'mongoose';
const { Schema, model } = pkg;

const bookStatusSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    bookId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['read', 'reading', 'want_to_read'],
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

bookStatusSchema.index({ userId: 1, bookId: 1 }, { unique: true });
bookStatusSchema.index({ userId: 1, status: 1 });

bookStatusSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model('bookStatuses', bookStatusSchema);
