import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from '@superfaceai/passport-twitter-oauth2';

const CLIENT_URL = process.env.BASE_URL_CLIENT || '';

// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_APP_ID || '',
//   clientSecret: process.env.GOOGLE_APP_SECRET || '',
//   callbackURL: `${CLIENT_URL}/auth/google/callback`,
// },
//   function (accessToken, refreshToken, profile, cb) {
//     const { _json } = profile;
//     console.log(_json);
//     return cb(null, profile);
//   }
// ));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID || '',
  clientSecret: process.env.FACEBOOK_APP_SECRET || '',
  callbackURL: `${CLIENT_URL}/auth/facebook/callback`,
  profileFields: ['id', 'displayName', 'photos']
},
  function (accessToken, refreshToken, profile, cb) {
    const { _json } = profile;
    console.log(_json);
    return cb(null, profile);
  }
));

passport.use(new TwitterStrategy({
  clientID: process.env.TWITTER_CONSUMER_KEY || '',
  clientSecret: process.env.TWITTER_CONSUMER_SECRET || '',
  clientType: 'confidential',
  callbackURL: `${CLIENT_URL}/auth/twitter/callback`
},
  function (accessToken, refreshToken, profile, cb) {
    // const { _json } = profile;
    console.log(profile);
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
