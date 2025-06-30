const express = require('express');
const {getUsers, createUser} = require("../controllers/userControllers")
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get("/", getUsers);
router.post("/", createUser);
router.get('/specialists', authMiddleware, usersController.getSpecialists);
router.get('/clients', authMiddleware, usersController.getClients);
router.put('/needed-specialists', authMiddleware, usersController.updateNeededSpecialists);
router.put('/availability', authMiddleware, usersController.updateAvailability);

module.exports = router;

module.exports = router;