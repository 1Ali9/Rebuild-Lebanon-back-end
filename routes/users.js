const express = require('express');
const userControllers = require("../controllers/userControllers");
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// OPTIONS handler
router.options('/availability', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});

// Regular routes
router.get("/", userControllers.getUsers);
router.post("/", userControllers.createUser);
router.get('/specialists', authMiddleware, userControllers.getSpecialists);
router.get('/clients', authMiddleware, userControllers.getClients);
router.patch('/needed-specialists', 
  authMiddleware,
  (req, res, next) => {
    // Clean the request body before it reaches the controller
    if (req.body.data?.isAvailable) delete req.body.data.isAvailable;
    if (req.body.isAvailable) delete req.body.isAvailable;
    next();
  },
  userControllers.updateNeededSpecialists
);
router.put('/availability', authMiddleware, userControllers.updateAvailability);

module.exports = router;