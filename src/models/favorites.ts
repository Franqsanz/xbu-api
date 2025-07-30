import pkg from 'mongoose';
const { Schema, model } = pkg;

import { IFavorite } from '../types/types';

const favoriteSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    favoriteBooks: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

favoriteSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model<IFavorite>('favorites', favoriteSchema);
