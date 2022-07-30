const bcrypt = require('bcryptjs');

const generateJWT = require('../helpers/generate-jwt');

const signIn = async (req, res, next) => {
  const { password: receivedPassword } = req.body;
  const { con } = req;
  try {
    const query = 'SELECT mail, nombre, apellido, password FROM user';
    const [results] = await con.execute(query);
    const [user] = results; // porque solo hay un usuario

    const passwordOk = await bcrypt.compare(receivedPassword, user.password);
    if (passwordOk) {
      const msg = {
        text: 'Inicio correcto',
        type: 'green'
      };

      const { mail, nombre, apellido } = user;
      const userPublicData = { mail, nombre, apellido };

      const token = await generateJWT(mail);
      res.json({
        msg,
        user: userPublicData,
        token,
      });
    } else {
      res.status(401).json({
        msg: {
          text: 'Contraseña incorrecta',
          type: 'red'
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: {
        text: 'Error al iniciar sesión',
        type: 'red'
      }
    })
  }
  next();
};

module.exports = {
  signIn
};
