import mongoose from 'mongoose';

import { MONGODB_URI } from '../config/env';

export default function connect() {
  const uri = MONGODB_URI || '';
  const options = {
    autoIndex: true,
  };

  mongoose.set('strictQuery', false);
  mongoose
    .connect(uri, options)
    .then(() => {
      console.log('Connected to Data Base');
    })
    .catch(() => {
      console.log('Error connecting to Data Base');
    });

  process.on('exit', () => {
    mongoose.disconnect();
  });
}
