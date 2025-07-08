import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/env';

export default async function connect() {
  const uri = MONGODB_URI || '';
  const options = {
    autoIndex: true,
  };

  mongoose.set('strictQuery', false);

  try {
    await mongoose.connect(uri, options);
    console.log('Connected to Data Base');
  } catch (error) {
    console.log('Error connecting to Data Base');
    throw error;
  }

  process.on('exit', () => {
    mongoose.disconnect();
  });
}
