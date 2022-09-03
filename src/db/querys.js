const pool = require('./pool');

const getTotalProducts = async () => {
  const [[productsCount]] = await pool.query('SELECT COUNT(*) AS cantidadTotalProductos FROM productos');
  const { cantidadTotalProductos } = productsCount;
  return cantidadTotalProductos;
}
module.exports = { getTotalProducts };