import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from 'passport-twitter';

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID || '',
  clientSecret: process.env.FACEBOOK_APP_SECRET || '',
  callbackURL: '/auth/facebook/callback'
},
  function (accessToken, refreshToken, profile, cb) {
    // Aquí puedes guardar el usuario en la base de datos
    return cb(null, profile);
  }
));

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
  callbackURL: '/auth/twitter/callback'
},
  function (accessToken, refreshToken, profile, cb) {
    // Aquí puedes guardar el usuario en la base de datos
    return cb(null, profile);
  }
));

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  cb(null, user as null);
});

export default passport;
