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
    returnedObject.id = returnedObject._id;
    delete returnedObject._v;
    delete returnedObject._id;
  },
});

export default model<IFavorite>('favorites', favoriteSchema);
