'use strict';
const bcrypt = require('bcryptjs');

const { generateJWT } = require('../helpers');

const login = async (req, res, next) => {
  const { password: receivedPassword } = req.body;
  const { con } = req;
  try {
    const queryGetUser = 'SELECT email, nombre, apellido, password FROM user';
    const [usersRows] = await con.execute(queryGetUser);
    const [user] = usersRows; // porque solo hay un usuario
    const passwordOk = await bcrypt.compare(receivedPassword, user.password);
    if (!passwordOk) {
      const msg = { text: 'Contraseña incorrecta', type: 'red' };
      res.status(401).json({ msg });
    } else {
      const msg = { text: 'Sesión iniciada correctamente', type: 'green' };
      const token = await generateJWT(user.email);
      const { password, ...userPublicData } = user;
      res.json({ msg, token, user: userPublicData });
    }
  } catch (err) {
    console.log(err);
    const msg = { text: 'Error al iniciar sesión', type: 'red' };
    res.status(401).json({ msg });
  }
  next();
};

module.exports = {
  login
};
