'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  secure: true,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  },
});

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   requireTLS: true,
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_PASSWORD,
//   }
// });

const sendBudget = async (req = request, res = response, next) => {
  const { con } = req;
  const { mensaje } = req.body;
  const { messageDB } = req;

  const mailOptions = {
    from: `Pasteleria Natalie<${process.env.GMAIL_USER}>`,
    to: messageDB.email,
    subject: 'Presupuesto de Pasteleria Natalie',
    text: mensaje
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (!info.response.includes('OK')) throw 'Error al mandar el email';

    const updateMessageResult = await con.execute('UPDATE mensajes SET estado = 2 WHERE id = ?', [messageDB.id]);
    if (updateMessageResult.affectedRows === 0) throw 'Error al marcar mensaje como enviado en DB';

    const msg = { text: 'Se envío el email con su presupuesto correctamente', type: 'green' };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    const msg = { text: 'Error al enviar el email', type: 'red' };
    res.status(500).json({ msg });
  }
  next();
}



module.exports = {
  sendBudget
};