const { request, response } = require('express');
const { indexArrayToObjectWhitArray, indexArrayToObject } = require('../helpers/indexArray');

const getMessages = async (req = request, res = response, next) => {
  const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';

  const { con } = req;

  try {

    const queryGetMessages = 'SELECT id, email, nombre, aclaraciones, fecha, visto FROM mensajes m';
    const [messagesRows] = await con.query(queryGetMessages);
    if (messagesRows.length === 0) { res.json([]); next(); return }

    const queryGetMessagesProducts = 'SELECT id_mensaje AS idMensaje, id_producto AS idProducto, cantidad FROM mensajes_productos';
    const [messagesProductsRows] = await con.query(queryGetMessagesProducts);
    if (messagesProductsRows.length === 0) throw 'Existen mensajes, pero no hay registros en tabla mensajes_productos';
    const indexedMessagesProducts = indexArrayToObjectWhitArray(messagesProductsRows, 'idMensaje');

    let queryGetProducts = '';
    queryGetProducts += 'SELECT p.id AS id, nombre, tipo AS idTipo, path ';
    queryGetProducts += 'FROM productos p INNER JOIN imagenes m ON (p.id = m.id_producto AND m.principal = 1) '
    queryGetProducts += 'WHERE p.id IN (';
    const paramsGetProducts = [];
    for (const messageProduct of messagesProductsRows) {
      queryGetProducts += ' ?,'
      paramsGetProducts.push(messageProduct.idProducto);
    }
    queryGetProducts = queryGetProducts.substring(0, queryGetProducts.length - 1) + ')';
    const [productsRows] = await con.execute(queryGetProducts, paramsGetProducts);
    if (productsRows.length === 0) throw 'No existen los productos referenciados por los mensajes';

    const messages = messagesRows.map((message => {
      const filteredProductsByMessage = productsRows.filter(product => indexedMessagesProducts[message.id].find(messageProduct => messageProduct.idProducto === product.id));

      const productosConsultados = filteredProductsByMessage.map(product => {
        const { nombre, idTipo, path } = product;
        const cantidad = indexedMessagesProducts[message.id].find(messageProduct => messageProduct.idProducto === product.id).cantidad;
        return { nombre, idTipo, path: urlClodinaryImgs + path, cantidad };
      })

      const { id, email, nombre, aclaraciones, fecha, visto } = message;
      return {
        id,
        email,
        nombre,
        aclaraciones,
        fecha,
        visto: visto[0],
        productosConsultados
      };
    }));

    res.json(messages);
  } catch (err) {
    console.log(err);
    const msg = {
      text: 'Error al obtener los mensajes',
      type: 'red'
    }
    res.status(500).json({ msg });
  }
}

const createMessage = async (req = request, res = response, next) => {
  const { con } = req;
  const { email, nombre, productos, aclaraciones = null } = req.body;

  try {
    const date = new Date();
    const fecha = date.toLocaleDateString('es-AR');

    // let day = date.getDate();
    // let month = date.getMonth() + 1;
    // let year = date.getFullYear();
    // let currentDate = `${day}/${month}/${year}`;
    // console.log(currentDate);
    // console.log(fecha);

    const paramsInsertMessage = [email, nombre, fecha];
    let queryInsertMessage = '';
    queryInsertMessage += 'INSERT INTO mensajes (email, nombre, fecha'
    if (aclaraciones !== null) {
      queryInsertMessage += ', aclaraciones'
      paramsInsertMessage.push(aclaraciones);
    }
    queryInsertMessage += ') VALUES (?, ?, ?' + (aclaraciones !== null ? ', ?' : '') + ')';

    const [insertMessageResult] = await con.execute(queryInsertMessage, paramsInsertMessage);
    const { insertId: idMensaje } = insertMessageResult;
    if (insertMessageResult.affectedRows === 0) throw 'Error al registar el mensaje en DB';

    let queryGetProducts = 'SELECT id FROM productos WHERE id IN ('; // para validar que los IDs de productos existen

    let queryInsertIntoMensajesProductos = 'INSERT INTO mensajes_productos (id_mensaje, id_producto, cantidad) VALUES';

    for (let i = 0; i < productos.length; i++) {
      queryGetProducts += ' ?,';

      queryInsertIntoMensajesProductos += ' (?, ?, ?),';
    }

    queryGetProducts = queryGetProducts.substring(0, queryGetProducts.length - 1) + ')'; // borrar coma del final y cerrar parentesis
    const paramsGetProducts = productos.map(product => product.id);
    const [productsRows] = await con.execute(queryGetProducts, paramsGetProducts);
    if (productsRows.length !== productos.length) throw 'Productos no se encuentran en BD';


    queryInsertIntoMensajesProductos = queryInsertIntoMensajesProductos.substring(0, queryInsertIntoMensajesProductos.length - 1);
    const paramsInsertIntoMensajesProductos = productos.reduce((acc, product) => {
      acc.push(idMensaje, product.id, product.cantidad);
      return acc;
    }, []);
    const [insertMensajesProductosResult] = await con.execute(queryInsertIntoMensajesProductos, paramsInsertIntoMensajesProductos);
    if (insertMensajesProductosResult.affectedRows === 0) throw 'Error al registrar en la tabla de mensajes_productos';

    // si no hubo ningun error
    await con.commit();

    const msg = { text: 'Solicitud de presupuesto enviada correctamente. A la brevedad recibirá un email.', type: 'green' };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    await con.rollback();
    const msg = { text: 'Error al realizar la consulta, intente nuevamente', type: 'red' };
    res.status(500).json({ msg });
  }
}

module.exports = {
  getMessages,
  createMessage
};