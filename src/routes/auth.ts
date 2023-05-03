import express from 'express';
import passport from 'passport';

const router = express.Router();

const CLIENT_URL = process.env.BASE_URL_CLIENT || 'http://localhost:1010';

router.get('/google', passport.authenticate('google', { scope: ['profile'] }));

router.get('/google/callback',
  passport.authenticate('google', {
    successRedirect: CLIENT_URL,
    failureRedirect: `${CLIENT_URL}/register`,
  })
);

router.get('/facebook', passport.authenticate('facebook'));

router.get('/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: CLIENT_URL,
    failureRedirect: `${CLIENT_URL}/register`,
  })
);

router.get('/twitter', passport.authenticate('twitter', { scope: ['tweet.read', 'users.read'] }));

router.get('/twitter/callback',
  passport.authenticate('twitter'), function (req, res) {
    // const userData = JSON.stringify(req.user, undefined, 2);
    res.redirect('/auth/login/check-user');
  }
);

router.get('/login/check-user', (req, res) => {
  if (req.user) {
    res.json({
      authenticated: true,
      message: 'User has successfully authenticated',
      user: req.user,
      // cookies: req.cookies
    });
  } else {
    res.json({ authenticated: false, message: 'Authentication error' });
  }
});

router.post('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);

    res.redirect(CLIENT_URL);
  });
});

export default router;
