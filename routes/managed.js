// managed.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const managedController = require('../controllers/managedController');

// In your managed.js router
router.use((req, res, next) => {
  console.log(`[ROUTE DEBUG] Incoming ${req.method} request to: ${req.originalUrl}`);
  next();
});

router.post('/clients', authMiddleware, managedController.addClient);
router.delete('/clients/:id', authMiddleware, managedController.removeClient);
router.patch(
  '/relationships/client/:relationshipId/status', 
  authMiddleware, 
  managedController.updateClientStatus
);
router.get('/clients', authMiddleware, managedController.getManagedClients);
router.post('/specialists', authMiddleware, managedController.addSpecialist);
router.delete('/specialists/:id', authMiddleware, managedController.removeSpecialist);
router.patch(
  '/relationships/specialist/:relationshipId/status', 
  authMiddleware, 
  managedController.updateSpecialistStatus
);
router.get('/specialists', authMiddleware, managedController.getManagedSpecialists);

module.exports = router;