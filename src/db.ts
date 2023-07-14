import mongoose from "mongoose";

export default function connect() {
  const uri = process.env.MONGODB_URI || '';
  const options = { autoIndex: true };

  mongoose.set("strictQuery", false);
  mongoose.connect(uri, options)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.log(err);
    });

  process.on('exit', error => {
    console.error(error);
    mongoose.disconnect();
  });
}
