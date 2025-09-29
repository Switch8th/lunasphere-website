// server/middleware/lunasphere-api.js
const setApiHeaders = (req, res, next) => {
    res.setHeader('Content-Security-Policy', "connect-src 'self' http://localhost:3000;");
    next();
};

module.exports = setApiHeaders;