// File: src/pages/api/email.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { trigger, adminEmail, doctorEmail, clientEmail, appointmentDetails } = req.body;
  
  // Set up Nodemailer Transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ankur16satya@gmail.com', // ⚠️ REPLACE THIS
      pass: 'uvljcztortknbpwt'     // ⚠️ REPLACE THIS (Get this from Google Account -> Security -> 2-Step Verification -> App Passwords)
    }
  });

  try {
    if (trigger === 'NEW_BOOKING') {
      // 1. Email to Client
      await transporter.sendMail({
        from: '"Pawverse" <ankur16satya@gmail.com>', // ⚠️ Replace email here too
        to: clientEmail,
        subject: 'Appointment Requested 🐾',
        text: `We have received your appointment request with Dr. ${appointmentDetails.doctorName} for ${appointmentDetails.date} at ${appointmentDetails.time}.\nThe doctor will review and approve it shortly! We will notify you.`
      });
      // 2. Email to Doctor
      await transporter.sendMail({
        from: '"Pawverse Admin" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: doctorEmail,
        subject: 'New Appointment Request! 🩺',
        text: `You have a new booking request from ${appointmentDetails.clientName} for ${appointmentDetails.date} at ${appointmentDetails.time}.\nPlease log into your Pawverse Admin panel to Accept or Reject.`
      });
      // 3. Email to Admin
      await transporter.sendMail({
        from: '"Pawverse Alerts" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: adminEmail,
        subject: 'SYSTEM: New Booking Created',
        text: `A new booking was just created!\nDoctor: Dr. ${appointmentDetails.doctorName}\nClient: ${appointmentDetails.clientName}\nDate: ${appointmentDetails.date} at ${appointmentDetails.time}`
      });
    }

    else if (trigger === 'APPROVED') {
       // Send Payment link to client
       const paymentLink = `http://localhost:3000/pay/${appointmentDetails.appointmentId}`;
       await transporter.sendMail({
        from: '"Pawverse" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: clientEmail,
        subject: 'Appointment Approved! Action Required 💳',
        text: `Good news! Your appointment with Dr. ${appointmentDetails.doctorName} for ${appointmentDetails.date} has been APPROVED.\n\nPlease complete your consultation fee payment of ₹${appointmentDetails.fees} here:\n${paymentLink}`
      });
      await transporter.sendMail({
        from: '"Pawverse Alerts" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: adminEmail,
        subject: 'SYSTEM: Booking Approved',
        text: `Dr. ${appointmentDetails.doctorName} approved booking ${appointmentDetails.appointmentId}. Payment link was sent to client.`
      });
    }

    else if (trigger === 'REJECTED') {
       await transporter.sendMail({
        from: '"Pawverse" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: clientEmail,
        subject: 'Appointment Update 🐾',
        text: `We're sorry, but Dr. ${appointmentDetails.doctorName} is busy during your requested slot on ${appointmentDetails.date} at ${appointmentDetails.time}.\nPlease log back to Pawverse and select another date or time!`
      });
      await transporter.sendMail({
        from: '"Pawverse Alerts" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: adminEmail,
        subject: 'SYSTEM: Booking Rejected',
        text: `Dr. ${appointmentDetails.doctorName} rejected booking ${appointmentDetails.appointmentId} for client ${appointmentDetails.clientName}.`
      });
    }

    else if (trigger === 'PAYMENT_DONE') {
      await transporter.sendMail({
        from: '"Pawverse Alerts" <ankur16satya@gmail.com>', // ⚠️ Replace
        to: adminEmail,
        subject: '🚨 PAYMENT RECEIVED (Action Required)',
        text: `Client ${appointmentDetails.clientName} claims to have paid ₹${appointmentDetails.fees} for Booking ID: ${appointmentDetails.appointmentId}.\n\nUTR NUMBER PROVIDED: ${appointmentDetails.utr}\n\nPlease check your bank/UPI app to verify this immediately!`
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
}
