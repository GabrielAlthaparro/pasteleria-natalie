const { request, response } = require('express');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  },
  secure: true
});

const sendBudget = async (req = request, res = response, next) => {
  const { con } = req;
  const { mensaje } = req.body;
  const { messageDB } = req;

  const mailOptions = {
    from: `Pasteleria Natalie <${process.env.GMAIL_USER}>`,
    to: messageDB.email,
    subject: 'Respuesta de solicitud de presupuesto a Pasteleria Natalie',
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