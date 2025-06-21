const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');

// Progress routes
router.get('/books-with-progress', progressController.getBooksWithProgress);
router.get('/stats', progressController.getReadingStats);
router.get('/book/:bookId', progressController.getProgressByBook);
router.put('/book/:bookId', progressController.updateProgress);

module.exports = router;