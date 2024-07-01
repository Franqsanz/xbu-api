import express from 'express';

import { createUser } from '../controllers/auth/registerController';

const router = express.Router();

router.post('/register', createUser);

// router.post('/logout', (req, res, next) => {
//   req.logout(function (err) {
//     if (err) return next(err);

//     res.redirect(CLIENT_URL);
//   });
// });

export default router;
