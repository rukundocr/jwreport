const express = require('express');
const mongoose = require('mongoose');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const methodOverride = require('method-override');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
require('dotenv').config();
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Passport config
require('./config/passport')(passport);




const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // MUST BE TRUE

// 1. Database Connection (MongoDB Atlas)
// Note: kigali_gasogi is specified in the connection string via .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected to: kigali_gasogi Atlas Cluster'))
  .catch(err => console.error('Connection Error:', err));
// 2. Handlebars Setup
// We add custom helpers here later (e.g., for RWF currency or Date formatting)
app.engine('.hbs', engine({ 
    extname: '.hbs', 
    defaultLayout: 'main',
    helpers: {
        eq: (a, b) => a === b,
        subtract: function (a, b) {
            return parseInt(a) - parseInt(b);
        },
        or: (a, b) => a || b, // Add this line
        formatType: function(text) {
        return text ? text.replace(/_/g, ' ') : '';
    },
        eq: function (v1, v2) { return v1 === v2; }
        // Add helper functions here if needed
    }
}));
app.set('view engine', '.hbs');

// 3. Middleware
app.use(morgan('dev')); // Log requests to console
app.use(express.urlencoded({ extended: false })); // Parse form data
app.use(express.json()); // Parse JSON data
app.use(methodOverride('_method')); // Support for PUT/DELETE in forms

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages middleware
app.use(flash());

// Global variables for views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    // Debug: Log user info when available
    if (req.user) {
        console.log('User in session:', {
            username: req.user.username,
            role: req.user.role,
            id: req.user._id
        });
    }
    next();
});

// 4. Static Files
app.use(express.static(path.join(__dirname, 'public')));

// 5. Routes
app.use('/', require('./routes/auth')); // Auth routes
app.use('/members', require('./routes/memberRoutes'));
app.use('/reports', reportRoutes);
app.use("/view",reportRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/attendance', attendanceRoutes);

// Home redirect
app.get('/', (req, res) => res.redirect('/dashboard'));

const PORT = process.env.PORT ||4000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});