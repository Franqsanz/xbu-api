import pkg from 'mongoose';
const { Schema, model } = pkg;

import { UsersDocument } from '../types';

const usersSchema = new Schema({
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
  }
}, { versionKey: false, });

usersSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id;
    delete returnedObject._v;
    delete returnedObject._id;
  }
});

export default model<UsersDocument>('users', usersSchema);
