const validTipo = async (tipo, { req }) => {
  const { con } = req;
  const query = 'SELECT * FROM `tipos` WHERE id = ?';
  const params = [tipo];
  try {
    const [results, fields] = await con.execute(query, params);
    if (results.length === 0) throw `Tipo inválido`;
  } catch (err) {
    console.log(err);
    throw err; // para el express validator
  }
};

module.exports = {
  validTipo
}