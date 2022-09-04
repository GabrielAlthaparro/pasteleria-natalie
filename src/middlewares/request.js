'use strict';

const startRequest = async (req, res, next) => {
  try {
    const pool = req.app.get('pool');
    const con = await pool.getConnection();
    req.con = con;
    const customErrorsHandler = () => {
      let _specialError = null;
      const _badRequestsErrors = [];
      return {
        addBadRequestError: text => {
          const msg = { text, type: 'red' };
          _badRequestsErrors.push({ msg });
        },
        addSpecialError: ({ status, text, ...others }) => {
          if (_specialError !== null) return; // si ya hay un error especial, no hago nada
          const msg = { text, type: 'red' };
          _specialError = { status, msg, ...others };
        },
        getSpecialError: () => _specialError,
        getBadRequestErrors: () => _badRequestsErrors,
        isEmpty: () => _badRequestsErrors.length === 0 && _specialError === null ? true : false
      }
    }
    req.customErrors = customErrorsHandler(); // clausura
    next();
  } catch (err) {
    console.log(err);
    console.log('Se intento conectar un usuario pero db no anda');
    res.sendStatus(503);
  }
};

const endRequest = async (req) => {
  const { con, files } = req;
  try {
    con.release();
  } catch (err) {
    console.log(err);
    console.log('Error al liberar la conexión');
  }
  if (files !== undefined) {
    const { deleteTmpFilesBuffers } = require("../helpers");
    deleteTmpFilesBuffers(files);
  }
}

module.exports = {
  startRequest,
  endRequest
};