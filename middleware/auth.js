// Middleware to ensure user is authenticated
exports.ensureAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// Middleware to ensure user is admin
exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    
    if (req.isAuthenticated()) {
        // User is authenticated but not admin
        return res.status(403).send('Access denied. Admin privileges required.');
    }
    
    // User is not authenticated
    res.redirect('/login');
};
