import pkg from 'mongoose';
const { Schema, model } = pkg;

const followsSchema = new Schema(
  {
    follower: {
      type: String,
      required: true,
    },
    following: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

followsSchema.index({ follower: 1, following: 1 }, { unique: true });
followsSchema.index({ follower: 1 });
followsSchema.index({ following: 1 });

followsSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model('follows', followsSchema);
