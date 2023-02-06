import mongoose from "mongoose";

export default function connect() {
  const uri = process.env.MONGODB_URI || '';
  const options = { autoIndex: true };

  mongoose.set("strictQuery", false);
  mongoose.connect(uri, options, (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Connected to MongoDB');
    }
  });

  process.on('exit', error => {
    console.error(error);
    mongoose.disconnect();
  });
}
