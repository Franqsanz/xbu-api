import express from "express";
import cors from 'cors';
import compression from 'compression';
import { config } from 'dotenv';
// import cookieSession from "cookie-session";
// import passport from "passport";

import db from "./db";
import books from './routes/books'

const app = express();

config();
db();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(cors());

const PORT = process.env.PORT || 9090;

app.get('/', (req, res) => {
  res.send(`
    <section>
      <h1>Bienvenido a la API REST de XBooks</h1>
      <h2>
        Todos los Libros: 
        <a href="http://localhost:9090/api">
          http://localhost:9090/api
        </a> 
      </h2>
    </section>
  `);
});
app.use('/api', books);

// app.use(cookieSession({
//   name: 'session',
//   keys: [/* secret keys */],

//   // Cookie Options
//   maxAge: 24 * 60 * 60 * 1000 // 24 hours
// }))
// app.use(passport.initialize());

app.listen(PORT, () => console.log('Server Ready'));