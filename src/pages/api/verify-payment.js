import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ankur16satya@gmail.com',
    pass: process.env.EMAIL_PASS || 'uvljcztortknbpwt',
  }
})

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"PawVerse" <ankur16satya@gmail.com>',
      to, subject, html
    })
  } catch (e) {
    console.error('Email failed:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    appointmentData,
  } = req.body

  // ── Step 1: Verify payment signature ──
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed — invalid signature' })
  }

  // ── Step 2: Save confirmed appointment to Supabase ──
  try {
    const { data: appt, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        listing_id: appointmentData.listing_id,
        client_id: appointmentData.client_id,
        pet_id: appointmentData.pet_id,
        date: appointmentData.date,
        time_slot: appointmentData.time_slot,
        status: 'confirmed',
        payment_status: 'paid',
        razorpay_order_id,
        razorpay_payment_id,
        client_email: appointmentData.client_email,
        client_name: appointmentData.client_name,
        amount: appointmentData.amount,
      })
      .select()
      .single()

    if (error) throw error

    // ── Step 2.5: Notify both USER and DOCTOR via Social Notifications ──
    try {
      // Notify DOCTOR
      const { data: docListing } = await supabaseAdmin.from('listings').select('user_id, name').eq('id', appointmentData.listing_id).single()
      if (docListing) {
        await supabaseAdmin.from('notifications').insert({
          user_id: docListing.user_id,
          type: 'friend_accepted', // Using an existing icon type
          message: `🩺 New Appointment! ${appointmentData.client_name} booked ${appointmentData.petName} for ${new Date(appointmentData.date).toLocaleDateString()}.|/doctor/admin`
        })

        // ── SEND REAL BACKGROUND PUSH ──
        try {
          const fetch = require('node-fetch') // Next.js API route context
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/push`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: docListing.user_id,
              title: '🩺 New Appointment!',
              body: `${appointmentData.client_name} booked ${appointmentData.petName} for ${new Date(appointmentData.date).toLocaleDateString()}.`,
              url: '/doctor/admin'
            })
          })
        } catch (e) { console.error('Push Notif Failed:', e) }
      }
    } catch (e) { console.error('Social Notif Failed:', e) }

    // ── Step 3: Send 3 emails ──
    const { doctorName, doctorEmail, clientEmail, clientName, petName, date, timeSlot, amount } = appointmentData

    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    // 1. Email to USER
    await sendEmail(
      clientEmail,
      '🎉 Appointment Confirmed — PawVerse',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF6B35, #6C4BF6); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">🎉 Appointment Confirmed!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Your booking is confirmed on PawVerse</p>
        </div>
        <div style="background: #F9F5FF; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1E1347; margin: 0 0 16px;">Booking Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280;">👤 Patient</td><td style="font-weight: 700; color: #1E1347;">${petName} (Owner: ${clientName})</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">🩺 Doctor / Clinic</td><td style="font-weight: 700; color: #1E1347;">${doctorName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">📅 Date</td><td style="font-weight: 700; color: #6C4BF6;">${formattedDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">⏰ Time</td><td style="font-weight: 700; color: #6C4BF6;">${timeSlot}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">💳 Amount Paid</td><td style="font-weight: 700; color: #22C55E;">₹${amount} ✅</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">🔖 Payment ID</td><td style="font-weight: 700; color: #1E1347; font-size: 12px;">${razorpay_payment_id}</td></tr>
          </table>
        </div>
        <div style="background: #E8F8E8; border-radius: 12px; padding: 16px; border-left: 4px solid #22C55E;">
          <p style="margin: 0; color: #374151; font-size: 14px;">✅ Your payment has been verified automatically. Please arrive 10 minutes before your appointment. Carry this email as your booking reference.</p>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">PawVerse — The Social Universe for Your Fur Family 🐾</p>
      </div>
      `
    )

    // 2. Email to DOCTOR
    await sendEmail(
      doctorEmail,
      '🩺 New Appointment Booked — PawVerse',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6C4BF6, #FF6B35); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #fff; margin: 0; font-size: 26px;">🩺 New Appointment!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">A patient has booked and paid for an appointment</p>
        </div>
        <div style="background: #F9F5FF; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1E1347; margin: 0 0 16px;">Appointment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280;">👤 Patient Owner</td><td style="font-weight: 700; color: #1E1347;">${clientName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">🐾 Pet Name</td><td style="font-weight: 700; color: #1E1347;">${petName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">📧 Client Email</td><td style="font-weight: 700; color: #6C4BF6;">${clientEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">📅 Date</td><td style="font-weight: 700; color: #FF6B35;">${formattedDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">⏰ Time Slot</td><td style="font-weight: 700; color: #FF6B35;">${timeSlot}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">💳 Payment</td><td style="font-weight: 700; color: #22C55E;">₹${amount} — PAID ✅</td></tr>
          </table>
        </div>
        <div style="background: #FFFBE8; border-radius: 12px; padding: 16px; border-left: 4px solid #FF6B35;">
          <p style="margin: 0; color: #374151; font-size: 14px;">✅ Payment has been automatically verified. This appointment is confirmed. Please be available at the scheduled time.</p>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">PawVerse — The Social Universe for Your Fur Family 🐾</p>
      </div>
      `
    )

    // 3. Email to ADMIN
    await sendEmail(
      'ankur16satya@gmail.com',
      '🔔 New Booking — PawVerse Admin',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1E1347; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🔔 New Booking Alert</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">PawVerse Admin Notification</p>
        </div>
        <div style="background: #F9F5FF; border-radius: 12px; padding: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280;">👤 Client</td><td style="font-weight: 700;">${clientName} (${clientEmail})</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">🐾 Pet</td><td style="font-weight: 700;">${petName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">🩺 Doctor</td><td style="font-weight: 700;">${doctorName} (${doctorEmail})</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">📅 Date & Time</td><td style="font-weight: 700; color: #6C4BF6;">${formattedDate} at ${timeSlot}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">💳 Amount</td><td style="font-weight: 700; color: #22C55E;">₹${amount}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">🔖 Razorpay Order</td><td style="font-size: 12px;">${razorpay_order_id}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">💰 Payment ID</td><td style="font-size: 12px;">${razorpay_payment_id}</td></tr>
          </table>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">This is an automated notification from PawVerse.</p>
      </div>
      `
    )

    res.status(200).json({ success: true, appointmentId: appt.id })
  } catch (err) {
    console.error('Verify payment error:', err)
    res.status(500).json({ error: 'Payment verified but failed to save appointment' })
  }
}