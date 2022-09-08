const pool = require('./pool');

const getTotalProducts = () => {
  return new Promise(resolve => {
    pool.query('SELECT COUNT(*) AS cantidadTotalProductos FROM productos')
      .then(([productsCountRows]) => {
        const { cantidadTotalProductos } = productsCountRows[0];
        resolve(cantidadTotalProductos);
      })
      .catch(err => {
        console.log(err);
        resolve(); // undefined
      });
  });
}

const getLoggedOutTokens = () => {
  return new Promise(resolve => {
    pool.query('SELECT * FROM tokens')
      .then(([tokensRows]) => {
        resolve(tokensRows);
      })
      .catch(err => {
        console.log(err);
        resolve(); // undefined
      });
  });
}

const deleteLoggedOutTokens = tokens => {
  return new Promise(resolve => {
    let qDeleteTokens = 'DELETE FROM invalid_tokens WHERE token IN (';
    const pDeleteTokens = [];
    for (const tokenRow of tokens) {
      qDeleteTokens += '?,';
      pDeleteTokens.push(tokenRow.token);
    }
    qDeleteTokens = qDeleteTokens.substring(0, qDeleteTokens.length - 1) + ')'; // borrar coma del final
    pool.execute(qDeleteTokens, pDeleteTokens)
      .then(([deleteResult]) => {
        return resolve(deleteResult.affectedRows === 0 ? false : true);
      })
      .catch(err => {
        console.log(err);
        resolve(false);
      });
  });
}

module.exports = { getTotalProducts, getLoggedOutTokens, deleteLoggedOutTokens };