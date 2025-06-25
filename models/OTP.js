const db = require('../config/database');

class OTP {
    // Generate OTP 6 digit
    static generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Membuat OTP baru
    static async create(userId, purpose, expiresInMinutes = 5) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        
        const [result] = await db.execute(
            'INSERT INTO otp_codes (user_id, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [userId, code, purpose, expiresAt]
        );
        
        return {
            id: result.insertId,
            code,
            purpose,
            expires_at: expiresAt
        };
    }

    // Mencari OTP yang valid
    static async findValid(userId, code, purpose) {
        const [otpData] = await db.execute(
            'SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND purpose = ? AND expires_at > NOW() AND is_used = FALSE',
            [userId, code, purpose]
        );
        
        return otpData.length > 0 ? otpData[0] : null;
    }

    // Mencari OTP berdasarkan ID
    static async findById(otpId) {
        const [otpData] = await db.execute(
            'SELECT * FROM otp_codes WHERE id = ?',
            [otpId]
        );
        
        return otpData.length > 0 ? otpData[0] : null;
    }

    // Menandai OTP sebagai sudah digunakan
    static async markAsUsed(otpId) {
        const [result] = await db.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE id = ?',
            [otpId]
        );
        
        return result.affectedRows > 0;
    }

    // Menandai semua OTP lama sebagai sudah digunakan (untuk resend)
    static async markOldAsUsed(userId, purpose) {
        const [result] = await db.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE user_id = ? AND purpose = ? AND is_used = FALSE',
            [userId, purpose]
        );
        
        return result.affectedRows;
    }

    // Verifikasi dan gunakan OTP
    static async verifyAndUse(userId, code, purpose) {
        const otp = await this.findValid(userId, code, purpose);
        
        if (!otp) {
            return { 
                success: false, 
                message: 'Kode OTP tidak valid atau sudah kedaluwarsa' 
            };
        }

        // Tandai sebagai sudah digunakan
        await this.markAsUsed(otp.id);
        
        return { 
            success: true, 
            message: 'OTP berhasil diverifikasi',
            otp: otp
        };
    }

    // Hapus OTP yang sudah kedaluwarsa (cleanup)
    static async cleanExpired() {
        const [result] = await db.execute(
            'DELETE FROM otp_codes WHERE expires_at < NOW()'
        );
        
        return result.affectedRows;
    }

    // Hapus semua OTP user
    static async deleteByUserId(userId) {
        const [result] = await db.execute(
            'DELETE FROM otp_codes WHERE user_id = ?',
            [userId]
        );
        
        return result.affectedRows;
    }

    // Cek apakah user sudah punya OTP aktif untuk purpose tertentu
    static async hasActivOTP(userId, purpose) {
        const [otpData] = await db.execute(
            'SELECT id FROM otp_codes WHERE user_id = ? AND purpose = ? AND expires_at > NOW() AND is_used = FALSE',
            [userId, purpose]
        );
        
        return otpData.length > 0;
    }

    // Get OTP statistics untuk monitoring
    static async getStats() {
        const [stats] = await db.execute(`
            SELECT 
                purpose,
                COUNT(*) as total,
                SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as used,
                SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired,
                SUM(CASE WHEN expires_at > NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as active
            FROM otp_codes 
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY purpose
        `);
        
        return stats;
    }
}

module.exports = OTP;