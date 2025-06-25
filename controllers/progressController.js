const Book = require('../models/Book');
const ReadingProgress = require('../models/ReadingProgress');

const progressController = {
  // Get all books with their reading progress
  async getBooksWithProgress(req, res) {
    try {
      const books = await ReadingProgress.getBooksWithProgress();
      res.json({
        success: true,
        data: books
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching books with progress',
        error: error.message
      });
    }
  },

  // Get reading progress for specific book
  async getProgressByBook(req, res) {
    try {
      const { bookId } = req.params;
      const progress = await ReadingProgress.getByBookId(bookId);
      
      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Reading progress not found for this book'
        });
      }

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching reading progress',
        error: error.message
      });
    }
  },

  // Update reading progress (hanya status)
  async updateProgress(req, res) {
    try {
      const { bookId } = req.params;
      const { status } = req.body;

      // Check if book exists
      const book = await Book.getById(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      // Validate status
      const validStatuses = ['not_started', 'reading', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: not_started, reading, or completed'
        });
      }

      const affectedRows = await ReadingProgress.update(bookId, { status });

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Reading progress not found'
        });
      }

      res.json({
        success: true,
        message: 'Reading progress updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating reading progress',
        error: error.message
      });
    }
  },

  // Get reading statistics
  async getReadingStats(req, res) {
    try {
      const stats = await ReadingProgress.getReadingStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching reading statistics',
        error: error.message
      });
    }
  }
};

module.exports = progressController;