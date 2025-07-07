const allowedOrigins = require('./allowedOrigins');

const corsOptions = {
  origin: (origin, callback) => {
    // During development, you might want to allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, {
        origin: true,
        credentials: true
      });
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, {
        origin: origin, // Set specific origin instead of true
        credentials: true
      });
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'X-XSRF-TOKEN',
    'XSRF-TOKEN' // Add both variants for compatibility
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  exposedHeaders: [
    'Authorization',
    'XSRF-TOKEN', // Expose CSRF token headers
    'Content-Disposition' // Useful for file downloads
  ],
  preflightContinue: false, // Disable preflight response caching
  maxAge: 86400 // Cache preflight requests for 1 day
};

module.exports = corsOptions;