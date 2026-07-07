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
      name: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      avatar: {
        type: String,
      },
    },
    bookId: {
      type: String,
      required: true,
    },
    // Threading de un solo nivel: si `parentId` está seteado, el comentario
    // es una respuesta al comment original. Las respuestas de respuestas se
    // anclan al mismo padre — no formamos árboles de más de un nivel.
    parentId: {
      type: String,
      default: null,
      index: true,
    },
    // Cuando `parentId` está seteado y la respuesta es a otra respuesta del
    // mismo hilo, guardamos aquí el id del reply target para poder ordenar
    // el hilo por thread en la UI. Sigue siendo modelo de 1 nivel.
    replyToId: {
      type: String,
      default: null,
    },
    repliesCount: {
      type: Number,
      default: 0,
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

commentsSchema.index({ bookId: 1, parentId: 1, createdAt: -1 });
commentsSchema.index({ parentId: 1, createdAt: 1 });
commentsSchema.index({ 'author.userId': 1, createdAt: -1 });

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
