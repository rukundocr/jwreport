const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Show login page
// @route   GET /login
exports.getLogin = (req, res) => {
    res.render('login', {
        layout: false,
        messages: req.flash('error')
    });
};

// @desc    Authenticate user
// @route   POST /login
exports.postLogin = passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
});

// @desc    Show signup page
// @route   GET /signup
exports.getSignup = (req, res) => {
    res.render('signup', {
        layout: false,
        messages: req.flash('error')
    });
};

// @desc    Register new user
// @route   POST /signup
exports.postSignup = async (req, res) => {
    const { username, password, role } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            req.flash('error', 'Username already exists');
            return res.redirect('/signup');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({
            username,
            password: hashedPassword,
            role: role || 'staff'
        });

        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.flash('error', 'An error occurred during registration');
        res.redirect('/signup');
    }
};

// @desc    Logout user
// @route   GET /logout
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/login');
    });
};
