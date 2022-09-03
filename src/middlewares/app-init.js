const { getTotalProducts } = require('../db/querys');
const pool = require('../db/pool');

const appInit = async app => {
  app.set('port', process.env.PORT || 3000);
  app.set('pool', pool);
  app.set('cantidadTotalProductos', await getTotalProducts());
};

module.exports = appInit;