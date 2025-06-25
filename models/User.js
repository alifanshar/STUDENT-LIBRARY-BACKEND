const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Membuat user baru
    static async create(userData) {
        const { email, username, password, full_name } = userData;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const [result] = await db.execute(
            'INSERT INTO users (email, username, password, full_name) VALUES (?, ?, ?, ?)',
            [email, username, hashedPassword, full_name]
        );
        
        return result.insertId;
    }

    // Mencari user berdasarkan email
    static async findByEmail(email) {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        return users.length > 0 ? users[0] : null;
    }

    // Mencari user berdasarkan ID
    static async findById(id) {
        const [users] = await db.execute(
            'SELECT id, email, username, full_name, is_verified, created_at FROM users WHERE id = ?',
            [id]
        );
        
        return users.length > 0 ? users[0] : null;
    }

    // Mencari user berdasarkan username
    static async findByUsername(username) {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        return users.length > 0 ? users[0] : null;
    }

    // Cek apakah email atau username sudah ada
    static async checkExisting(email, username) {
        const [users] = await db.execute(
            'SELECT id, email, username FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        return users.length > 0 ? users[0] : null;
    }

    // Update status verifikasi user
    static async updateVerificationStatus(userId, isVerified = true) {
        const [result] = await db.execute(
            'UPDATE users SET is_verified = ? WHERE id = ?',
            [isVerified, userId]
        );
        
        return result.affectedRows > 0;
    }

    // Update profil user
    static async updateProfile(userId, profileData) {
        const { full_name, username } = profileData;
        
        const [result] = await db.execute(
            'UPDATE users SET full_name = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [full_name, username, userId]
        );
        
        return result.affectedRows > 0;
    }

    // Verifikasi password
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Update password
    static async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        const [result] = await db.execute(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId]
        );
        
        return result.affectedRows > 0;
    }

    // Hapus user (soft delete bisa ditambahkan jika diperlukan)
    static async delete(userId) {
        const [result] = await db.execute(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );
        
        return result.affectedRows > 0;
    }

    // Get user statistics
    static async getUserStats(userId) {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(b.id) as total_books,
                SUM(CASE WHEN b.status = 'read' THEN 1 ELSE 0 END) as books_read,
                SUM(CASE WHEN b.status = 'reading' THEN 1 ELSE 0 END) as books_reading,
                SUM(CASE WHEN b.status = 'unread' THEN 1 ELSE 0 END) as books_unread
            FROM users u 
            LEFT JOIN books b ON u.id = b.user_id 
            WHERE u.id = ?
        `, [userId]);
        
        return stats[0];
    }
}

module.exports = User;