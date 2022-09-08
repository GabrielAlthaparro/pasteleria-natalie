'use strict';
const {
  indexArrayToObjectWhitArray,
  indexArrayToObject } = require('../helpers');

const getMessages = async (req, res, next) => {
  const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';
  const { con } = req;

  try {
    const qGetMessages = 'SELECT id, email, nombre, aclaraciones, fecha, estado FROM mensajes m';
    const [messagesRows] = await con.query(qGetMessages);
    if (messagesRows.length === 0) { res.json([]); next(); return }

    const qGetMessagesProducts = 'SELECT id_mensaje AS idMensaje, id_producto AS idProducto, cantidad FROM mensajes_productos';
    const [messagesProductsRows] = await con.query(qGetMessagesProducts);
    if (messagesProductsRows.length === 0) throw 'Existen mensajes, pero no hay registros en tabla mensajes_productos';
    const indexedMessagesProducts = indexArrayToObjectWhitArray(messagesProductsRows, 'idMensaje');

    let qGetProducts = '';
    qGetProducts += 'SELECT p.id AS id, nombre, id_tipo AS idTipo, path ';
    qGetProducts += 'FROM productos p INNER JOIN imagenes m ON (p.id = m.id_producto AND m.principal = 1) '
    qGetProducts += 'WHERE p.id IN (';
    const pGetProducts = [];
    for (const messageProduct of messagesProductsRows) {
      qGetProducts += ' ?,'
      pGetProducts.push(messageProduct.idProducto);
    }
    qGetProducts = qGetProducts.substring(0, qGetProducts.length - 1) + ')';
    const [productsRows] = await con.execute(qGetProducts, pGetProducts);
    if (productsRows.length === 0) throw 'No existen los productos referenciados por los mensajes';
    const messages = messagesRows.map((message => {
      const filteredProductsForMessage = productsRows.filter(product => {
        const productInMessage = indexedMessagesProducts[message.id].find(messageProduct => messageProduct.idProducto === product.id);
        return (productInMessage !== undefined) ? true : false;
      });

      const productosConsultados = filteredProductsForMessage.map(product => {
        const { nombre, idTipo, path } = product;
        const cantidad = indexedMessagesProducts[message.id].find(messageProduct => messageProduct.idProducto === product.id).cantidad;
        return { nombre, idTipo, cantidad, path: urlClodinaryImgs + path };
      })

      let { aclaraciones, ...messageData } = message;
      if (aclaraciones === null) aclaraciones = '';
      return {
        ...messageData,
        aclaraciones,
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
  next();
}


const getMessage = async (req, res, next) => {
  const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';
  const { con } = req;
  const { id: idMensaje } = req.params;

  try {
    const qGetMessage = 'SELECT id, email, nombre, aclaraciones, fecha, estado FROM mensajes m WHERE id = ?';
    const [messagesRows] = await con.execute(qGetMessage, [idMensaje]);
    if (messagesRows.length === 0) { res.json({}); next(); return }

    const qGetMessagesProducts = 'SELECT id_mensaje AS idMensaje, id_producto AS idProducto, cantidad FROM mensajes_productos WHERE id_mensaje = ?';
    const pGetMessagesProducts = [idMensaje];
    const [messagesProductsRows] = await con.execute(qGetMessagesProducts, pGetMessagesProducts);
    if (messagesProductsRows.length === 0) throw 'Existe el mensaje, pero no hay registros en tabla mensajes_productos';

    let qGetProducts = '';
    qGetProducts += 'SELECT p.id AS id, nombre, id_tipo AS idTipo, path ';
    qGetProducts += 'FROM productos p INNER JOIN imagenes m ON (p.id = m.id_producto AND m.principal = 1) ';
    qGetProducts += 'WHERE p.id IN (';
    const pGetProducts = [];
    for (const messageProduct of messagesProductsRows) {
      qGetProducts += ' ?,'
      pGetProducts.push(messageProduct.idProducto);
    }
    qGetProducts = qGetProducts.substring(0, qGetProducts.length - 1) + ')';
    const [productsRows] = await con.execute(qGetProducts, pGetProducts);
    if (productsRows.length === 0) throw 'No existen los productos referenciados por los mensajes';
    const message = messagesRows[0];
    const productosConsultados = productsRows.map(product => {
      const { nombre, idTipo, path } = product;
      const productFind = messagesProductsRows.find(messageProduct => messageProduct.idProducto === product.id);
      const cantidad = productFind.cantidad;
      return { nombre, idTipo, cantidad, path: urlClodinaryImgs + path };
    })

    let { aclaraciones, ...messageData } = message;
    if (aclaraciones === null) aclaraciones = '';
    res.json({
      ...messageData,
      aclaraciones,
      productosConsultados
    });
  } catch (err) {
    console.log(err);
    const msg = {
      text: 'Error al obtener los mensajes',
      type: 'red'
    }
    res.status(500).json({ msg });
  }
  next();
}

const createMessage = async (req, res, next) => {
  const { con } = req;
  const { email, nombre, productos, aclaraciones = null } = req.body;

  try {
    await con.beginTransaction();

    const date = new Date();
    const fecha = date.toLocaleDateString('es-AR');

    // let day = date.getDate();
    // let month = date.getMonth() + 1;
    // let year = date.getFullYear();
    // let currentDate = `${day}/${month}/${year}`;
    // console.log(currentDate);
    // console.log(fecha);

    const pInsertMessage = [email, nombre, fecha];
    let qInsertMessage = '';
    qInsertMessage += 'INSERT INTO mensajes (email, nombre, fecha';
    if (aclaraciones !== null) {
      qInsertMessage += ', aclaraciones';
      pInsertMessage.push(aclaraciones);
    }
    qInsertMessage += ') VALUES (?, ?, ?' + (aclaraciones !== null ? ', ?' : '') + ')';
    const [insertMessageResult] = await con.execute(qInsertMessage, pInsertMessage);
    const { insertId: idMensaje } = insertMessageResult;
    if (insertMessageResult.affectedRows === 0) throw 'Error al registar el mensaje en DB';

    let qInsertIntoMensajesProductos = 'INSERT INTO mensajes_productos (id_mensaje, id_producto, cantidad) VALUES';
    const pInsertIntoMensajesProductos = [];
    const { productsDB } = req; // Ya se habia hecho la consulta en las validaciones
    const indexedProductsDB = indexArrayToObject(productsDB, 'id');
    const qUpdateCantConsultasProduct = 'UPDATE productos SET cantidad_consultas = ? WHERE id = ?';
    for (const product of productos) {
      qInsertIntoMensajesProductos += ' (?, ?, ?),';
      pInsertIntoMensajesProductos.push(idMensaje, product.id, product.cantidad);

      // Actualizar cantidad de consultas del producto en tabla productos
      const oldCantidadConsultas = indexedProductsDB[product.id].cantidad_consultas;
      const pUpdateCantConsultasProduct = [oldCantidadConsultas + product.cantidad, product.id];
      const [insertMessageResult] = await con.execute(qUpdateCantConsultasProduct, pUpdateCantConsultasProduct);
      if (insertMessageResult.affectedRows === 0) throw 'Error al editar cantidad de consultas de producto ' + product.id;
    }

    qInsertIntoMensajesProductos = qInsertIntoMensajesProductos.substring(0, qInsertIntoMensajesProductos.length - 1);
    const [insertMensajesProductosResult] = await con.execute(qInsertIntoMensajesProductos, pInsertIntoMensajesProductos);
    if (insertMensajesProductosResult.affectedRows === 0) throw 'Error al registrar en la tabla de mensajes_productos';

    // si no hubo ningun error
    await con.commit();

    const msg = { text: 'Solicitud de presupuesto enviada correctamente. A la brevedad recibirá un email', type: 'green' };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    try {
      await con.rollback();
    } catch (err) {
      console.log(err);
      console.log('Fallo rollback');
    }
    const msg = { text: 'Error al realizar la consulta, intente nuevamente', type: 'red' };
    res.status(500).json({ msg });
  }
  next();
}

const updateMessage = async (req, res, next) => {
  const { con } = req;
  const { id: idMensaje } = req.params;
  try {
    const qUpdateMessage = 'UPDATE mensajes SET estado = 1 WHERE id = ?'
    const pUpdateMessage = [idMensaje];
    const [updateMessageResult] = await con.execute(qUpdateMessage, pUpdateMessage);
    if (updateMessageResult.affectedRows === 0) throw 'Error al editar el mensaje en BD';

    res.sendStatus(200);

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
  next();
}

const deleteMessage = async (req, res, next) => {
  const { con } = req;
  const { id: idMensaje } = req.params;
  try {
    const qDeleteMessage = 'DELETE FROM mensajes WHERE id = ?';
    const pDeleteMessage = [idMensaje];
    // por clave foranea se borran tambien los filas en mensajes_productos asociadas a ese mensaje
    const [deleteMessageResult] = await con.execute(qDeleteMessage, pDeleteMessage);
    if (deleteMessageResult.affectedRows === 0) throw 'Error al borrar el mensaje en BD';

    const msg = { text: 'Mensaje borrado correctamente', type: 'green' };
    res.json({ msg });

  } catch (err) {
    console.log(err);

    const msg = { text: 'Ocurrio un error al borrar el mensaje', type: 'red' };
    res.status(500).json({ msg });
  }
  next();
}

module.exports = {
  getMessages,
  // getMessage,
  createMessage,
  updateMessage,
  deleteMessage
};