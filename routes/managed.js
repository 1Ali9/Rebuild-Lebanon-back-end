const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const managedController = require('../controllers/managedController');

router.post('/clients', authMiddleware, managedController.addClient);
router.delete('/clients/:clientId', authMiddleware, managedController.removeClient);
router.put('/clients/:clientId/status', authMiddleware, managedController.updateClientStatus);
router.get('/clients', authMiddleware, managedController.getManagedClients);
router.post('/specialists', authMiddleware, managedController.addSpecialist);
router.delete('/specialists/:specialistId', authMiddleware, managedController.removeSpecialist);
router.put('/specialists/:specialistId/status', authMiddleware, managedController.updateSpecialistStatus);
router.get('/specialists', authMiddleware, managedController.getManagedSpecialists);

module.exports = router;