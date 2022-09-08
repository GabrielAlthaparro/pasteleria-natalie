const { verifyAndGetPayloadSync } = require('../helpers');
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
      const jwtVerication = verifyAndGetPayloadSync(tokenRow.token);
      if (jwtVerication.isValid) {
        // este token todavia puede ser usado para inicar sesión, no lo borro
        return false;
      } else {
        // el jwt ya expiro, asi que lo puedo borrar de DB
        console.log(jwtVerication.err);
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