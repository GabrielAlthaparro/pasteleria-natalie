const { request, response } = require('express');
const { indexArrayToObjectWhitArray } = require('../helpers/indexArray');

const getMessages = async (req = request, res = response, next) => {
  const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';

  const { con } = req;

  try {

    const qGetMessages = 'SELECT id, email, nombre, aclaraciones, fecha, visto FROM mensajes m';
    const [messagesRows] = await con.query(qGetMessages);
    if (messagesRows.length === 0) { res.json([]); next(); return }

    const qGetMessagesProducts = 'SELECT id_mensaje AS idMensaje, id_producto AS idProducto, cantidad FROM mensajes_productos';
    const [messagesProductsRows] = await con.query(qGetMessagesProducts);
    if (messagesProductsRows.length === 0) throw 'Existen mensajes, pero no hay registros en tabla mensajes_productos';
    const indexedMessagesProducts = indexArrayToObjectWhitArray(messagesProductsRows, 'idMensaje');

    let qGetProducts = '';
    qGetProducts += 'SELECT p.id AS id, nombre, tipo AS idTipo, path ';
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
      const filteredProductsByMessage = productsRows.filter(product => indexedMessagesProducts[message.id].find(messageProduct => messageProduct.idProducto === product.id));

      const productosConsultados = filteredProductsByMessage.map(product => {
        const { nombre, idTipo, path } = product;
        const cantidad = indexedMessagesProducts[message.id].find(messageProduct => messageProduct.idProducto === product.id).cantidad;
        return { nombre, idTipo, cantidad, path: urlClodinaryImgs + path };
      })

      let { visto, aclaraciones, ...messageData } = message;
      if (aclaraciones === null) aclaraciones = '';
      return {
        ...messageData,
        aclaraciones,
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
  next();
}

const createMessage = async (req = request, res = response, next) => {
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
    qInsertMessage += 'INSERT INTO mensajes (email, nombre, fecha'
    if (aclaraciones !== null) {
      qInsertMessage += ', aclaraciones'
      pInsertMessage.push(aclaraciones);
    }
    qInsertMessage += ') VALUES (?, ?, ?' + (aclaraciones !== null ? ', ?' : '') + ')';

    const [insertMessageResult] = await con.execute(qInsertMessage, pInsertMessage);
    const { insertId: idMensaje } = insertMessageResult;
    if (insertMessageResult.affectedRows === 0) throw 'Error al registar el mensaje en DB';

    let qInsertIntoMensajesProductos = 'INSERT INTO mensajes_productos (id_mensaje, id_producto, cantidad) VALUES';
    for (let i = 0; i < productos.length; i++) {
      qInsertIntoMensajesProductos += ' (?, ?, ?),';
    }

    qInsertIntoMensajesProductos = qInsertIntoMensajesProductos.substring(0, qInsertIntoMensajesProductos.length - 1);
    const pInsertIntoMensajesProductos = productos.reduce((acc, product) => {
      acc.push(idMensaje, product.id, product.cantidad);
      return acc;
    }, []);
    const [insertMensajesProductosResult] = await con.execute(qInsertIntoMensajesProductos, pInsertIntoMensajesProductos);
    if (insertMensajesProductosResult.affectedRows === 0) throw 'Error al registrar en la tabla de mensajes_productos';

    // si no hubo ningun error
    await con.commit();

    const msg = { text: 'Solicitud de presupuesto enviada correctamente. A la brevedad recibirá un email', type: 'green' };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    await con.rollback();
    const msg = { text: 'Error al realizar la consulta, intente nuevamente', type: 'red' };
    res.status(500).json({ msg });
  }
  next();
}

const updateMessage = async (req = request, res = response, next) => {
  const { con } = req;
  const { id: idMensaje } = req.params;
  try {
    const qUpdateMessage = 'UPDATE mensajes SET visto = 1 WHERE id = ?'
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

const deleteMessage = async (req = request, res = response, next) => {
  const { con } = req;
  const { id: idMensaje } = req.params;
  try {
    const qDeleteMessage = 'DELETE FROM mensajes WHERE id = ?'
    const pDeleteMessage = [idMensaje];
    const [deleteMessageResult] = await con.execute(qDeleteMessage, pDeleteMessage);
    if (deleteMessageResult.affectedRows === 0) throw 'Error al borrar el mensaje en BD';

    const msg = { text: 'Mensaje borrado correctamente', type: 'red' };
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
  createMessage,
  updateMessage,
  deleteMessage
};