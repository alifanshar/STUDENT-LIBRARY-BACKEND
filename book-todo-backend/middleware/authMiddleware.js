const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/database');

// Middleware untuk verifikasi JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token akses diperlukan'
            });
        }

        // Verifikasi token
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token tidak valid atau sudah kedaluwarsa'
                });
            }

            // Cek apakah user masih ada di database
            const user = await User.findById(decoded.user_id);

            if (!user) {
                return res.status(403).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }

            if (!user.is_verified) {
                return res.status(403).json({
                    success: false,
                    message: 'Akun belum terverifikasi'
                });
            }

            // Tambahkan data user ke request
            req.user = user;
            next();
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Middleware untuk refresh token
const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token diperlukan'
            });
        }

        // Cari refresh token di database
        const [sessions] = await db.execute(
            'SELECT * FROM user_sessions WHERE refresh_token = ? AND expires_at > NOW()',
            [refresh_token]
        );

        if (sessions.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Refresh token tidak valid atau sudah kedaluwarsa'
            });
        }

        const session = sessions[0];

        // Ambil data user
        const [users] = await db.execute(
            'SELECT id, email, username, full_name FROM users WHERE id = ?',
            [session.user_id]
        );

        if (users.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        const user = users[0];

        // Generate access token baru
        const newAccessToken = jwt.sign(
            { 
                user_id: user.id, 
                email: user.email,
                username: user.username 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Token berhasil diperbaharui',
            data: {
                access_token: newAccessToken,
                user: user
            }
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Middleware untuk logout
const logout = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (refresh_token) {
            // Hapus refresh token dari database
            await db.execute(
                'DELETE FROM user_sessions WHERE refresh_token = ?',
                [refresh_token]
            );
        }

        res.json({
            success: true,
            message: 'Logout berhasil'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    authenticateToken,
    refreshToken,
    logout
};