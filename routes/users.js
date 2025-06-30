const express = require('express');
const userControllers = require("../controllers/userControllers")
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get("/", userControllers.getUsers);
router.post("/", userControllers.createUser);
router.get('/specialists', authMiddleware, userControllers.getSpecialists);
router.get('/clients', authMiddleware, userControllers.getClients);
router.put('/needed-specialists', authMiddleware, userControllers.updateNeededSpecialists);
router.put('/availability', authMiddleware, userControllers.updateAvailability);

module.exports = router;

