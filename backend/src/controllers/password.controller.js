const { load, save } = require("../lib/db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Configure email service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate reset token
function generateResetToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = load();
    const user = (db.users || []).find(u => u.email === email.trim().toLowerCase());
    
    if (!user) {
      return res.json({ ok: true, message: "If email exists, reset link will be sent" });
    }

    // Generate reset token and expiry
    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    user.passwordReset = {
      token: resetToken,
      expiresAt: resetExpiry
    };

    save(db);

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Instructions - Food Reservation System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${user.name || "User"},</p>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>

          <p style="color: #666;">Or copy this link: <a href="${resetLink}">${resetLink}</a></p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour.<br>
            If you didn't request this, ignore this email and your password will remain unchanged.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[PASSWORD] Reset email sent to ${email}`);
    return res.json({ ok: true, message: "Reset instructions sent to email" });

  } catch (err) {
    console.error("[PASSWORD] Forgot password failed:", err);
    return res.status(500).json({ error: "Failed to send reset email: " + err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body || {};

    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = load();
    const user = (db.users || []).find(u => u.email === email.trim().toLowerCase());

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!user.passwordReset || user.passwordReset.token !== token) {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    if (new Date() > new Date(user.passwordReset.expiresAt)) {
      user.passwordReset = null;
      save(db);
      return res.status(400).json({ error: "Reset token expired. Please request a new one." });
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.passwordReset = null;

    save(db);

    console.log(`[PASSWORD] Password reset for user ${user.id}`);
    return res.json({ ok: true, message: "Password reset successful" });

  } catch (err) {
    console.error("[PASSWORD] Reset password failed:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const uid = req.user?.id;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const db = load();
    const user = (db.users || []).find(u => u.id === uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    save(db);

    console.log(`[PASSWORD] Password changed for user ${user.id}`);
    return res.json({ ok: true, message: "Password changed successfully" });

  } catch (err) {
    console.error("[PASSWORD] Change password failed:", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
};