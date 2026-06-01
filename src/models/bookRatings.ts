import pkg from 'mongoose';
const { Schema, model } = pkg;

const bookRatingSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    bookId: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

bookRatingSchema.index({ userId: 1, bookId: 1 }, { unique: true });
bookRatingSchema.index({ bookId: 1 });

bookRatingSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model('bookRatings', bookRatingSchema);
