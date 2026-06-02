import pkg from 'mongoose';
const { Schema, model } = pkg;

import { IUser } from '../types/types';

const usersSchema = new Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    picture: {
      type: String,
    },
    pictureId: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    createdAt: {
      type: Date,
      required: true,
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
