import pkg from 'mongoose';
const { Schema, model } = pkg;

import { IUser } from '../types/types';

const usersSchema = new Schema(
  {
    uid: {
      type: String,
    },
    name: {
      type: String,
    },
    username: {
      type: String,
    },
    picture: {
      type: String,
    },
    email: {
      type: String,
    },
    createdAt: {
      type: Date,
    },
  },
  {
    versionKey: false,
  }
);

usersSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, __v, ...rest } = returnedObject;
    return {
      id: _id,
      ...rest,
    };
  },
});

export default model<IUser>('users', usersSchema);
