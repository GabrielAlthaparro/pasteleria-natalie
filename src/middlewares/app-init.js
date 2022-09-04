const { verifyAndGetPayload } = require('../helpers');
const { getTotalProducts, getLoggedOutTokens, deleteLoggedOutTokens } = require('../db/querys');
const pool = require('../db/pool');

const appInit = async app => {
  app.set('port', process.env.PORT || 3000);
  app.set('pool', pool);
  app.set('cantidadTotalProductos', getTotalProducts()); // se guarda una promesa con la peticion

  setInterval(async () => {
    let tokens = await getLoggedOutTokens();
    if (tokens === undefined) return; // ocurrio un error al traer los tokens

    tokens = tokens.filter(tokenRow => {
      try {
        verifyAndGetPayload(tokenRow.token);
        // si no tiro error, este token todavia puede ser usado para inicar sesión, no lo borro
        return false;
      } catch (err) {
        console.log(err.message);
        // el jwt ya expiro, no es más valido, asi que lo puedo borrar de DB
        return true;
      }
    });
    // tokens ahora tiene los tokens que ya expiraron
    if (tokens.length !== 0) { // si tengo que borrar algun token
      const deletedOk = await deleteLoggedOutTokens(tokens);
      if (!deletedOk) console.log('Ocurrio un error al borrar los viejos tokens');
    }
  }, 1000 * 60 * 60 * 24); // cada 24 horas
};

module.exports = appInit;