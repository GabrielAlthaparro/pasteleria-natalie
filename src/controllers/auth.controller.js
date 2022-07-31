const bcrypt = require('bcryptjs');

const generateJWT = require('../helpers/generate-jwt');

const signIn = async (req, res, next) => {
  const { password: receivedPassword } = req.body;
  const { con } = req;
  try {
    const queryGetUser = 'SELECT mail, nombre, apellido, password FROM user';
    const [results] = await con.execute(queryGetUser);
    const [user] = results; // porque solo hay un usuario

    const passwordOk = await bcrypt.compare(receivedPassword, user.password);
    if (!passwordOk) {
      const msg = {
        text: 'Contraseña incorrecta',
        type: 'red'
      }
      res.status(401).json({ msg });
    } else {
      const msg = {
        text: 'Sesión iniciada correctamente',
        type: 'green'
      };
      const { mail, nombre, apellido } = user;
      const userPublicData = { mail, nombre, apellido };
      const token = await generateJWT(mail);
      res.json({ msg, user: userPublicData, token });
    }
  } catch (err) {

    console.log(err);
    const msg = {
      text: 'Error al iniciar sesión',
      type: 'red'
    }
    res.status(500).json({ msg })
  }
  next();
};

module.exports = {
  signIn
};
