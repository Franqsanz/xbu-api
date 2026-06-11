import pkg from 'mongoose';
const { Schema, model } = pkg;

const notificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['follow', 'comment', 'rating', 'reaction'],
      required: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    bookId: {
      type: String,
    },
    commentId: {
      type: String,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    reactionType: {
      type: String,
      enum: ['like', 'dislike'],
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

notificationSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model('notifications', notificationSchema);
