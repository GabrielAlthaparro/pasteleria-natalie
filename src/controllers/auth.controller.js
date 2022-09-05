'use strict';
const bcrypt = require('bcryptjs');

const { generateJWT, getPayload, verifyAndGetPayload } = require('../helpers');

const login = async (req, res, next) => {
  const { password: receivedPassword } = req.body;
  const { con } = req;

  let userDB;
  let passwordOk = false;
  try {
    const [usersRows] = await con.query('SELECT id, email, nombre, apellido, password, token FROM user');
    userDB = usersRows[0]; // porque solo hay un usuario
    passwordOk = await bcrypt.compare(receivedPassword, userDB.password);
  } catch (err) {
    console.log(err);
    sendServerLoginError(res);
    return next();
  }
  if (!passwordOk) {
    const msg = { text: 'Contraseña incorrecta', type: 'red' };
    res.status(401).json({ msg });
    return next();
  }

  // usuario válidado
  let responseToken;
  if (userDB.token === null) { // si no tiene token en la DB
    try {
      responseToken = generateJWT(userDB.id);
      await con.execute('UPDATE user SET token = ? WHERE id = ?', [responseToken, userDB.id]);
    } catch (err) {
      console.log(err);
      sendServerLoginError(res);
      return next();
    }
  } else { // me fijo si su token todavia anda
    try {
      verifyAndGetPayload(userDB.token);
      // el token que tiene sigue funcionando supuestamente, se lo mando devuelta
      responseToken = userDB.token;
    } catch (err) { // su token ya expiro, le tengo que dar otro
      try {
        responseToken = generateJWT(userDB.id);
        await con.execute('UPDATE user SET token = ? WHERE id = ?', [responseToken, userDB.id]);
      } catch (err) {
        console.log(err);
        sendServerLoginError(res);
        return next();
      }
    }
  }
  // Si llegue hasta aca, esta todo correcto
  const msg = { text: 'Sesión iniciada correctamente', type: 'green' };
  const { id, email, password, token: tokenDB, ...userPublicData } = userDB;
  res.json({ msg, token: responseToken, user: userPublicData });
  next();
};
const sendServerLoginError = res => {
  const msg = { text: 'Error al iniciar sesión', type: 'red' };
  res.status(500).json({ msg });
}

const logout = async (req, res, next) => {
  const { con } = req;
  const { token } = req.headers;
  try {
    const payload = verifyAndGetPayload(token);
    const { id: idUser } = payload;
    try {
      await con.execute(`INSERT INTO tokens (token) VALUES (?)`, [token]);
      await deleteUserTokenAndSendLogoutOK(idUser, con, res);
    } catch (err) {
      console.log(err);
      if (err.errno === 1062) { // ya existe ese token en la tabla de tokens
        const msg = { text: 'Ya se cerro la sesión', type: 'red' };
        res.status(400).json({ msg });
      } else {
        const msg = { text: 'Error al cerrar sesión', type: 'red' };
        res.status(500).json({ msg });
      }
    }
  } catch (err) {
    console.log(err);
    // me fijo si el error es porque ya expiro la sesión
    if (err.name === 'TokenExpiredError') {
      try {
        const { id: idUser } = getPayload(token);
        const [deleteResult] = await con.execute('DELETE FROM tokens WHERE token = ?', [token]);
        if (deleteResult.affectedRows !== 0) { // si se borro el token de la tabla de tokens expirados
          await deleteUserTokenAndSendLogoutOK(idUser, con, res);
        } else { // sino, ya no existía ese token en la tabla
          const msg = { text: 'Ya se cerro la sesión', type: 'red' };
          res.status(400).json({ msg });
        }
      } catch (err) { // token erroneo
        console.log(err);
        sendInvalidToken(res);
      }
    } else { // token erroneo
      console.log(err);
      sendInvalidToken(res);
    }
  }
  next();
}
const deleteUserTokenAndSendLogoutOK = async (idUser, con, res) => {
  try {
    await con.execute('UPDATE user SET token = NULL WHERE id = ?', [idUser]);
    const msg = { text: 'Session cerrada correctamente', type: 'green' };
    res.json({ msg });
  } catch (err) {
    console.log(err);
    const msg = { text: 'Error al cerrar sesión', type: 'red' };
    res.status(500).json({ msg });
  }
}
const sendInvalidToken = res => {
  const msg = { text: 'Token inválido', type: 'red' };
  res.status(401).json({ msg });
}

module.exports = {
  login,
  logout
};
