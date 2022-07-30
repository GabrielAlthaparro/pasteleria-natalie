const validTipo = async (tipo, { req }) => {
  const { con } = req;
  const query = 'SELECT * FROM `tipos` WHERE id=?';
  const params = [tipo];
  try {
    const [results, fields] = await con.execute(query, params);
    if (results.length === 0) {
      throw `El tipo ${tipo} no está registrado`;
    }
  } catch (err) {
    console.log(err);
    throw new Error();
  }
};

module.exports = {
  validTipo
}