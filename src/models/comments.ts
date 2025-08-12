import pkg from 'mongoose';
const { Schema, model } = pkg;

import { IComment } from '../types/types';

const commentsSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      maxlength: 1500,
    },
    author: {
      userId: {
        type: String,
        ref: 'users',
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
    },
    bookId: {
      type: String,
      required: true,
    },
    reactions: [
      {
        userId: {
          type: String,
          ref: 'User',
        },
        type: {
          type: String,
          enum: ['like', 'dislike'],
        },
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    dislikesCount: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

commentsSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model<IComment>('comments', commentsSchema);
