// Shared Gmail SMTP transporter (server-side only).
// Credentials come from EMAIL_USER / EMAIL_PASS env vars — never hardcode them.
import nodemailer from 'nodemailer'

export const EMAIL_USER = process.env.EMAIL_USER

export const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
  : null

export const mailFrom = (label = 'PawVerse') => `"${label}" <${process.env.EMAIL_USER}>`

// Returns true on success. Never throws — callers decide whether a failure matters.
export async function sendMail({ to, subject, text, html, from }) {
  if (!transporter) {
    console.error('Email not sent: EMAIL_USER / EMAIL_PASS are not configured')
    return false
  }
  try {
    await transporter.sendMail({ from: from || mailFrom(), to, subject, text, html })
    return true
  } catch (e) {
    console.error('Email failed:', e.message)
    return false
  }
}
