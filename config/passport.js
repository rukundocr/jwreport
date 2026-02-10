const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
    // LocalStrategy configuration
    passport.use(new LocalStrategy(
        async (username, password, done) => {
            try {
                // Find user by username
                const user = await User.findOne({ username: username });
                
                if (!user) {
                    return done(null, false, { message: 'Invalid username or password' });
                }

                // Compare password
                const isMatch = await bcrypt.compare(password, user.password);
                
                if (!isMatch) {
                    return done(null, false, { message: 'Invalid username or password' });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};
