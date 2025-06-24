const db = require('../config/database');

class ReadingProgress {
  static async getByBookId(bookId) {
    const [rows] = await db.execute(
      'SELECT * FROM reading_progress WHERE book_id = ?',
      [bookId]
    );
    return rows[0];
  }

  static async create(progressData) {
    const { book_id, status } = progressData;
    const [result] = await db.execute(
      'INSERT INTO reading_progress (book_id, status) VALUES (?, ?)',
      [book_id, status || 'not_started']
    );
    return result.insertId;
  }

  static async update(bookId, progressData) {
    const { status } = progressData;
    const [result] = await db.execute(
      'UPDATE reading_progress SET status = ? WHERE book_id = ?',
      [status, bookId]
    );
    return result.affectedRows;
  }

  static async getBooksWithProgress() {
    const [rows] = await db.execute(`
      SELECT 
        b.*,
        rp.status
      FROM books b
      LEFT JOIN reading_progress rp ON b.id = rp.book_id
      ORDER BY b.created_at DESC
    `);
    return rows;
  }

  static async getReadingStats() {
    const [rows] = await db.execute(`
      SELECT 
        COUNT(*) as total_books,
        SUM(CASE WHEN rp.status = 'completed' THEN 1 ELSE 0 END) as completed_books,
        SUM(CASE WHEN rp.status = 'reading' THEN 1 ELSE 0 END) as currently_reading,
        SUM(CASE WHEN rp.status = 'not_started' THEN 1 ELSE 0 END) as not_started
      FROM books b
      LEFT JOIN reading_progress rp ON b.id = rp.book_id
    `);
    return rows[0];
  }

  static async getRecentlyCompleted(limit = 5) {
    const [rows] = await db.query(`
      SELECT 
        b.title,
        b.author,
        b.cover_image
      FROM books b
      INNER JOIN reading_progress rp ON b.id = rp.book_id
      WHERE rp.status = 'completed'
      ORDER BY rp.updated_at DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  static async getCurrentlyReading() {
    const [rows] = await db.execute(`
      SELECT 
        b.*,
        rp.status
      FROM books b
      INNER JOIN reading_progress rp ON b.id = rp.book_id
      WHERE rp.status = 'reading'
      ORDER BY rp.updated_at ASC
    `);
    return rows;
  }
}

module.exports = ReadingProgress;