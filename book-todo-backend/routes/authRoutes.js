const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

// Rute untuk registrasi
router.post('/register', authController.register);

// Rute untuk verifikasi registrasi
router.post('/verify-registration', authController.verifyRegistration);

// Rute untuk login
router.post('/login', authController.login);

// Rute untuk verifikasi login (OTP)
router.post('/verify-login', authController.verifyLogin);

// Rute untuk mengirim ulang OTP
router.post('/resend-otp', authController.resendOTP);

// Rute untuk refresh token
router.post('/refresh-token', authMiddleware.refreshToken);

// Rute untuk logout
router.post('/logout', authMiddleware.logout);

// Rute untuk mendapatkan profil user (protected)
router.get('/profile', authMiddleware.authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Profil berhasil diambil',
        data: req.user
    });
});

// Rute untuk update profil user (protected)
router.put('/profile', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const { full_name, username } = req.body;
        const userId = req.user.id;

        // Update profil user menggunakan model
        const updated = await User.updateProfile(userId, { full_name, username });

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'Gagal mengupdate profil'
            });
        }

        // Ambil data user yang sudah diupdate
        const user = await User.findById(userId);

        res.json({
            success: true,
            message: 'Profil berhasil diupdate',
            data: user
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

module.exports = router;