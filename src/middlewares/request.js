const startRequest = async (req = request, res = response, next) => {
  try {
    const getPool = req.app.get('getPool');
    const pool = await getPool();
    const con = await pool.getConnection();
    req.con = con;
    req.routedOk = false;
    next();
  } catch (err) {
    console.log(err);
    console.log('Se intento conectar un usuario pero db no anda');
    res.sendStatus(500);
  }
};

const endRequest = async (req, res, next) => {
  const { con, routedOk } = req;
  try {
    con.release();
  } catch (err) {
    console.log('Error al liberar la conexión');
    console.log(err);
  }
  if (!routedOk) next();
}

module.exports = {
  startRequest,
  endRequest
};