const { deleteTmpFilesBuffers } = require("../helpers/files");

const startRequest = async (req = request, res = response, next) => {
  try {
    const getPool = req.app.get('getPool');
    const pool = await getPool();
    const con = await pool.getConnection();
    req.con = con;
    req.routedOk = false;
    req.customError = null;
    next();
  } catch (err) {
    console.log(err);
    console.log('Se intento conectar un usuario pero db no anda');
    res.sendStatus(503);
  }
};

const endRequest = async (req, res, next) => {
  const { con, routedOk, files } = req;
  try {
    con.release();
  } catch (err) {
    console.log(err);
    console.log('Error al liberar la conexión');
  }
  if (files !== undefined) deleteTmpFilesBuffers(files);

  if (!routedOk) next();
}

module.exports = {
  startRequest,
  endRequest
};