const express = require('express');
const {getUsers, createUser} = require("../controllers/userControllers")
const router = express.Router();

router.get("/", getUsers);

router.post("/", createUser);

module.exports = router;