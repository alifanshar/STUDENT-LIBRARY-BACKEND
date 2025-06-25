const nodemailer = require('nodemailer');

// Konfigurasi transporter email
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', // Atau gunakan provider lain seperti 'outlook', 'yahoo'
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // Gunakan App Password untuk Gmail
        },
        // Untuk Gmail, pastikan "Less secure app access" diaktifkan
        // Atau lebih baik gunakan App Password
    });
};

// Fungsi untuk mengirim email OTP
const sendOTPEmail = async (email, otp, purpose, userName = '') => {
    const transporter = createTransporter();
    
    const purposeText = {
        'register': 'Verifikasi Registrasi',
        'login': 'Verifikasi Login',
        'reset_password': 'Reset Password'
    };

    const mailOptions = {
        from: {
            name: 'Book To-Do App',
            address: process.env.EMAIL_USER
        },
        to: email,
        subject: `${purposeText[purpose]} - Kode OTP`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                    <h1 style="color: #007bff; margin-bottom: 10px;">📚 Book To-Do</h1>
                    <h2 style="color: #333; margin-bottom: 20px;">Kode Verifikasi OTP</h2>
                    
                    ${userName ? `<p style="color: #666;">Halo ${userName},</p>` : ''}
                    
                    <p style="color: #666; margin-bottom: 20px;">
                        Gunakan kode berikut untuk ${purposeText[purpose].toLowerCase()} akun Anda:
                    </p>
                    
                    <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h1 style="margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    
                    <p style="color: #dc3545; font-weight: bold; margin-bottom: 10px;">
                        ⏰ Kode ini akan kedaluwarsa dalam 10 menit
                    </p>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                        Jika Anda tidak meminta kode ini, abaikan email ini.<br>
                        Jangan bagikan kode ini kepada siapa pun.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 10px; background-color: #e9ecef; border-radius: 5px;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        Email ini dikirim secara otomatis, mohon jangan membalas email ini.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Gagal mengirim email OTP');
    }
};

module.exports = {
    createTransporter,
    sendOTPEmail
};