const express = require('express');
const router = express.Router();

const exampleController = require('../controllers/exampleController');

router.get('/ping', exampleController.ping);

module.exports = router;
