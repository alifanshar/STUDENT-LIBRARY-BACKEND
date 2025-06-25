const Book = require('../models/Book');
const ReadingProgress = require('../models/ReadingProgress');

const bookController = {
  // Get all books
  async getAllBooks(req, res) {
    try {
      const books = await Book.getAll();
      res.json({
        success: true,
        data: books
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching books',
        error: error.message
      });
    }
  },

  // Get book by ID
  async getBookById(req, res) {
    try {
      const { id } = req.params;
      const book = await Book.getById(id);
      
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      res.json({
        success: true,
        data: book
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching book',
        error: error.message
      });
    }
  },

  // Create new book
  async createBook(req, res) {
    try {
      const { title, author, cover_image } = req.body;
      
      // Validation
      if (!title || !author) {
        return res.status(400).json({
          success: false,
          message: 'Title and author are required'
        });
      }

      const bookId = await Book.create({
        title,
        author,
        cover_image
      });

      // Create initial reading progress
      await ReadingProgress.create({
        book_id: bookId,
        status: 'not_started'
      });

      res.status(201).json({
        success: true,
        message: 'Book created successfully',
        data: { id: bookId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating book',
        error: error.message
      });
    }
  },

  // Update book
  async updateBook(req, res) {
    try {
      const { id } = req.params;
      const { title, author, cover_image } = req.body;

      const affectedRows = await Book.update(id, {
        title,
        author,
        cover_image
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      res.json({
        success: true,
        message: 'Book updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating book',
        error: error.message
      });
    }
  },

  // Delete book
  async deleteBook(req, res) {
    try {
      const { id } = req.params;
      const affectedRows = await Book.delete(id);

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      res.json({
        success: true,
        message: 'Book deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting book',
        error: error.message
      });
    }
  }
};

module.exports = bookController;