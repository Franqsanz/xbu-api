import express from 'express';
import passport from 'passport';

const router = express.Router();

// router.get('/logout', (req, res) => {
//   req.logout();
//   res.redirect('http://localhost:1010/');
// });

const CLIENT_URL = 'http://localhost:1010/';

router.get('/facebook', passport.authenticate('facebook'));

router.get('/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: CLIENT_URL,
    failureRedirect: `${CLIENT_URL}register`,
  })
);

router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: 'http://localhost:1010/profile',
    failureRedirect: 'http://localhost:1010/register',
  })
);

export default router;
