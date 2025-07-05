const express = require('express');
const userControllers = require("../controllers/userControllers");
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Remove the manual CORS headers - they're conflicting with the global CORS middleware
// Keep only the OPTIONS handler
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
router.put('/needed-specialists', authMiddleware, userControllers.updateNeededSpecialists);
router.put('/availability', authMiddleware, userControllers.updateAvailability);

module.exports = router;