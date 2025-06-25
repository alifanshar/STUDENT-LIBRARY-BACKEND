const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../config/email');
const db = require('../config/database');

// Register
const register = async (req, res) => {
    try {
        const { email, username, password, full_name } = req.body;

        // Validasi input
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, username, dan password wajib diisi'
            });
        }

        // Cek apakah user sudah ada
        const existingUser = await User.checkExisting(email, username);

        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'Username';
            return res.status(400).json({
                success: false,
                message: `${field} sudah terdaftar`
            });
        }

        // Buat user baru
        const userId = await User.create({ email, username, password, full_name });

        // Generate dan simpan OTP
        const otpData = await OTP.create(userId, 'register');

        // Kirim OTP ke email
        await sendOTPEmail(email, otpData.code, 'register', full_name);

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil! Kode OTP telah dikirim ke email Anda',
            data: {
                user_id: userId,
                email: email
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Verifikasi OTP untuk registrasi
const verifyRegistration = async (req, res) => {
    try {
        const { user_id, otp } = req.body;

        if (!user_id || !otp) {
            return res.status(400).json({
                success: false,
                message: 'User ID dan OTP wajib diisi'
            });
        }

        // Cari OTP yang valid
        const [otpData] = await db.execute(
            'SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND purpose = ? AND expires_at > NOW() AND is_used = FALSE',
            [user_id, otp, 'register']
        );

        if (otpData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kode OTP tidak valid atau sudah kedaluwarsa'
            });
        }

        // Tandai OTP sebagai sudah digunakan
        await db.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE id = ?',
            [otpData[0].id]
        );

        // Tandai user sebagai terverifikasi
        await db.execute(
            'UPDATE users SET is_verified = TRUE WHERE id = ?',
            [user_id]
        );

        res.json({
            success: true,
            message: 'Verifikasi berhasil! Akun Anda sudah aktif'
        });

    } catch (error) {
        console.error('Verify registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email dan password wajib diisi'
            });
        }
        
        // Cari user
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }
        
        const user = users[0];

        // Cek apakah user sudah terverifikasi
        if (!user.is_verified) {
            return res.status(401).json({
                success: false,
                message: 'Akun belum terverifikasi. Silakan cek email Anda'
            });
        }

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        // Generate dan simpan OTP untuk login
        const otp = OTP.generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

        await db.execute(
            'INSERT INTO otp_codes (user_id, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [user.id, otp, 'login', expiresAt]
        );

        // Kirim OTP ke email
        await sendOTPEmail(email, otp, 'login');

        res.json({
            success: true,
            message: 'Kode OTP telah dikirim ke email Anda',
            data: {
                user_id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Verifikasi OTP untuk login
const verifyLogin = async (req, res) => {
    try {
        const { user_id, otp } = req.body;

        if (!user_id || !otp) {
            return res.status(400).json({
                success: false,
                message: 'User ID dan OTP wajib diisi'
            });
        }

        // Cari OTP yang valid
        const [otpData] = await db.execute(
            'SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND purpose = ? AND expires_at > NOW() AND is_used = FALSE',
            [user_id, otp, 'login']
        );

        if (otpData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kode OTP tidak valid atau sudah kedaluwarsa'
            });
        }

        // Tandai OTP sebagai sudah digunakan
        await db.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE id = ?',
            [otpData[0].id]
        );

        // Ambil data user
        const [users] = await db.execute(
            'SELECT id, email, username, full_name FROM users WHERE id = ?',
            [user_id]
        );

        const user = users[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: user.id, 
                email: user.email,
                username: user.username 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

        // Simpan refresh token
        await db.execute(
            'INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, refreshExpiresAt]
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                user: user,
                access_token: token,
                refresh_token: refreshToken
            }
        });

    } catch (error) {
        console.error('Verify login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Kirim ulang OTP
const resendOTP = async (req, res) => {
    try {
        const { user_id, purpose } = req.body;

        if (!user_id || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'User ID dan purpose wajib diisi'
            });
        }

        // Ambil data user
        const [users] = await db.execute(
            'SELECT email FROM users WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Hapus OTP lama yang belum digunakan
        await db.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE user_id = ? AND purpose = ? AND is_used = FALSE',
            [user_id, purpose]
        );

        // Generate OTP baru
        const otp = OTP.generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

        await db.execute(
            'INSERT INTO otp_codes (user_id, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [user_id, otp, purpose, expiresAt]
        );

        // Kirim OTP ke email
        await sendOTPEmail(users[0].email, otp, purpose);

        res.json({
            success: true,
            message: 'Kode OTP baru telah dikirim ke email Anda'
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    register,
    verifyRegistration,
    login,
    verifyLogin,
    resendOTP
};