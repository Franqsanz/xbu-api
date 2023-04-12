import express from 'express';
import passport from 'passport';

const router = express.Router();

// router.get('/logout', (req, res) => {
//   req.logout();
//   res.redirect('http://localhost:1010/');
// });

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: 'http://localhost:1010/',
    failureRedirect: '/register',
  })
);

router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: 'http://localhost:1010/',
    failureRedirect: '/register',
  })
);

export default router;
