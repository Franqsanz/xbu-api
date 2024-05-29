import express from 'express';

import { postRegister } from '../controllers/auth/userAuth';

const router = express.Router();

router.post('/register', postRegister);

// router.post('/logout', (req, res, next) => {
//   req.logout(function (err) {
//     if (err) return next(err);

//     res.redirect(CLIENT_URL);
//   });
// });

export default router;
