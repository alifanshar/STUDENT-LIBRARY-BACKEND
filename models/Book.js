const db = require('../config/database');

class Book {
  static async getAll() {
    const [rows] = await db.execute('SELECT * FROM books ORDER BY created_at DESC');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.execute('SELECT * FROM books WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(bookData) {
    const { title, author, cover_image } = bookData;
    const [result] = await db.execute(
      'INSERT INTO books (title, author, cover_image) VALUES (?, ?, ?)',
      [title, author, cover_image]
    );
    return result.insertId;
  }

  static async update(id, bookData) {
    const { title, author, cover_image } = bookData;
    const [result] = await db.execute(
      'UPDATE books SET title = ?, author = ?, cover_image = ? WHERE id = ?',
      [title, author, cover_image, id]
    );
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM books WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Book;