import pkg from 'mongoose';
const { Schema, model } = pkg;

const activityLogSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['favorite', 'collection'],
      required: true,
    },
    bookId: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

activityLogSchema.index({ userId: 1, type: 1, bookId: 1 }, { unique: true });
activityLogSchema.index({ userId: 1, createdAt: -1 });

activityLogSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model('activityLog', activityLogSchema);
