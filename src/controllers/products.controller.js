const { request, response } = require('express');

const { indexArrayToObjectWhitArray, indexArrayToObject } = require('../helpers/indexArray');
const {
  saveImgCloudinary,
  deleteTmpFilesBuffers,
  deleteImgCloudinary,
  getPublicIdFromCloudinaryImageUrl,
  getImgUrlDB } = require('../helpers/files');

const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';
// https://res.cloudinary.com/digitalsystemda/image/upload/v1659329811/pasteleria-natalie/dev/dea9ozxkd4kcfpjbjmer.jpg

const getProducts = async (req = request, res = response, next) => {
  const { con } = req;
  const {
    tipo = null,
    nombre = null,
    page = 1,
  } = req.query;

  const CANTIDAD_POR_PAGINA = 15;

  let qGetProductos = '';
  qGetProductos += 'SELECT p.id AS id, nombre,p.descripcion AS descripcion, ';
  qGetProductos += 'p.id_tipo AS idTipo, t.descripcion AS tipo, p.cantidad_consultas AS cantidadConsultas ';
  qGetProductos += 'FROM (productos p INNER JOIN tipos t on p.id_tipo = t.id)';
  const pGetProductos = [];

  if (tipo !== null || nombre !== null) {
    qGetProductos += ' WHERE';
    if (tipo !== null) {
      qGetProductos += ' p.id_tipo = ?';
      pGetProductos.push(tipo);
      if (nombre !== null) {
        qGetProductos += ' AND nombre LIKE ?';
        pGetProductos.push(`%${nombre}%`);
      }
    } else {
      if (nombre !== null) {
        qGetProductos += ` nombre LIKE ?`;
        pGetProductos.push(`%${nombre}%`);
      }
    }
  }

  qGetProductos += ` LIMIT ${CANTIDAD_POR_PAGINA} OFFSET ?`;
  const offset = (page - 1) * CANTIDAD_POR_PAGINA;
  pGetProductos.push(offset);

  try {
    let productos = [];
    const [productsRows] = await con.execute(qGetProductos, pGetProductos);
    if (productsRows.length !== 0) { // si hay productos

      let qGetImagenes = 'SELECT * FROM imagenes WHERE id_producto IN (';
      const pGetImagenes = [];
      for (const product of productsRows) {
        qGetImagenes += ' ?,'
        pGetImagenes.push(product.id);
      }
      qGetImagenes = qGetImagenes.substring(0, qGetImagenes.length - 1) + ') ORDER BY principal DESC';
      const [imagesRows] = await con.execute(qGetImagenes, pGetImagenes);

      const indexedImages = indexArrayToObjectWhitArray(imagesRows, 'id_producto');
      productos = productsRows.map(producto => {
        const imagenes = [];
        if (indexedImages[producto.id] !== undefined) {
          for (const imagen of indexedImages[producto.id]) {
            const { id, path, principal } = imagen; // principal es un buffer que tiene el dato en la primer posición
            imagenes.push({ id, path: urlClodinaryImgs + path, principal: principal[0] === 1 ? true : false })
          }
        }
        return {
          ...producto,
          imagenes
        };
      });
    }

    res.json(productos);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: 'Error al obtener los productos',
    })
  }
  next();
};

const createProduct = async (req = request, res = response, next) => {
  const { nombre, tipo, descripcion } = req.body;
  const { files } = req;
  const { con } = req;

  const receivedImages = [...files]; // hago una copia para no tocar el files, para poder borrar los buffers temporales después
  const uploadedImagesCloudinary = []; // por si ocurre algun error al crear producto, para borrar las imagenes que cree en cloudinary

  try {
    await con.beginTransaction();

    // TABLA PRODUCTOS
    const qInsertProduct = 'INSERT INTO `productos` (`nombre`, `id_tipo`, `descripcion`) VALUES (?, ?, ?)';
    const pInsertProduct = [nombre, tipo, descripcion];

    const [productResults] = await con.execute(qInsertProduct, pInsertProduct);
    const { insertId: idProducto, affectedRows: productAffectedRows } = productResults;
    if (productAffectedRows === 0) throw 'Error al crear registro en la tabla de productos';

    // TABLA IMAGENES
    const imgPrincipal = receivedImages.shift(); // saco del array la primera posicion, donde esta la img principal
    const { path: imgPath } = imgPrincipal;
    const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
    uploadedImagesCloudinary.push(public_id);

    let qInsertImages = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES (?, ?, ?),';
    const pInsertImages = [idProducto, getImgUrlDB(urlImgPrincipal), 1];

    if (receivedImages.length !== 0) {
      for (const secondaryImg of receivedImages) {
        const { path: imgPath } = secondaryImg;
        const { public_id, secure_url: urlSecondaryImg } = await saveImgCloudinary(imgPath);
        uploadedImagesCloudinary.push(public_id);

        qInsertImages += ' (?, ?, ?),';
        pInsertImages.push(idProducto, getImgUrlDB(urlSecondaryImg), 0);
      }
    }
    qInsertImages = qInsertImages.substring(0, qInsertImages.length - 1); // borrar la coma al final de la query

    // guardar imagenes
    const [insertImagesResults] = await con.execute(qInsertImages, pInsertImages);
    if (insertImagesResults.affectedRows === 0) throw `Error al guardar imagenes en BD`;

    // select para obtener los ids de las imagenes en BD
    const [imagesRows] = await con.execute(`SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal DESC`, [idProducto]);
    if (imagesRows.length === 0) throw 'Se recibieron las imágenes pero ocurrio un error al leerlas de la BD';

    // construir la esctructura del objeto imagenesProducto
    const imagenesProducto = imagesRows.map(image => {
      return {
        id: image.id,
        path: urlClodinaryImgs + image.path,
        principal: image.principal[0] === 1 ? true : false
      }
    });

    // SI SE EJECUTO TODO SIN DISPARAR ERRORES
    await con.commit();

    const msg = {
      text: 'Producto registrado correctamente',
      type: 'green'
    };
    const createdProduct = {
      id: idProducto,
      nombre,
      descripcion,
      idTipo: tipo,
      tipo: (await con.execute(`SELECT descripcion FROM tipos WHERE id = ?`, [tipo]))[0][0].descripcion,
      cantidadConsultas: 0,
      imagenes: imagenesProducto
    };

    res.json({
      msg,
      producto: createdProduct
    });

  } catch (err) {
    console.log(err);

    try {
      await con.rollback();
    } catch (err) {
      console.log(err);
      console.log('Fallo rollback');
    }

    if (uploadedImagesCloudinary.length !== 0) {
      for (const public_id of uploadedImagesCloudinary) {
        await deleteImgCloudinary(public_id);
      }
    }
    res.status(500).json({
      msg: 'Error al crear el producto, intente nuevamente',
      type: 'red'
    });
  }
  deleteTmpFilesBuffers(files);
  next();
};

const updateProduct = async (req = request, res = response, next) => {
  const { id: idProducto } = req.params;
  const { nombre, idTipo, descripcion, imagenes } = req.body;
  const { files } = req;
  const { con } = req;

  const receivedImages = [...files]; // hago una copia para no tocar el files, para poder borrar los buffers temporales después
  const uploadedImagesCloudinary = []; // por si ocurre algun error al crear producto, para borrar las imagenes que cree en cloudinary

  try {

    const productDB = req.productDB;

    let qUpdateProduct = 'UPDATE productos SET';
    const pUpdateProduct = [];

    if (productDB.nombre !== nombre) {
      qUpdateProduct += ' nombre = ?,';
      pUpdateProduct.push(nombre);
    }
    if (productDB.id_tipo !== idTipo) {
      qUpdateProduct += ' id_tipo = ?,';
      pUpdateProduct.push(idTipo);
    }
    if (productDB.descripcion !== descripcion) {
      qUpdateProduct += ' descripcion = ?,';
      pUpdateProduct.push(descripcion);
    }

    await con.beginTransaction();

    if (pUpdateProduct.length !== 0) { // si hay que editar algun dato del producto en tabla productos
      qUpdateProduct = qUpdateProduct.substring(0, qUpdateProduct.length - 1); // borrar la coma del final
      qUpdateProduct += ' WHERE id = ?';
      pUpdateProduct.push(idProducto);
      const [updateProductResults] = await con.execute(qUpdateProduct, pUpdateProduct);
      if (updateProductResults.affectedRows === 0) throw `Error al editar los datos del producto`;
    }

    const qGetImagenes = 'SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal DESC';
    const pGetImagenes = [idProducto];
    let [imagesDB] = await con.execute(qGetImagenes, pGetImagenes);
    imagesDB = imagesDB.map(imageDB => { // cambio valores numericos de principal por valores booleanos
      const { principal, ...imageData } = imageDB;
      return { ...imageData, principal: principal[0] === 1 ? true : false };
    });
    const indexedImagesDB = indexArrayToObject(imagesDB, 'id');

    // verificar que los ids enviados existen en DB
    for (const imagen of imagenes) {
      if (indexedImagesDB[imagen.id] === undefined) throw { status: 410, text: 'Las imágenes enviadas no se encuentran en BD' };
    }

    const indexedReceivedImages = indexArrayToObject(imagenes, 'id');
    const oldImgPrincipal = imagesDB[0];
    if (indexedReceivedImages[oldImgPrincipal.id] !== undefined) { // si existe la img principal en el array imagenes
      if (indexedReceivedImages[oldImgPrincipal.id].principal === false) { // si vieja img principal ahora tinene que ser secundaria

        // vieja imágen principal pasa a ser secundaria
        const qUpdateImgPrincipalToSecondary = 'UPDATE imagenes SET principal = 0 WHERE id = ?';
        const pUpdateImgPrincipalToSecondary = [oldImgPrincipal.id] // img principal pasa a ser secundaria
        const [updateImgPrincipalToSecondaryResult] = await con.execute(qUpdateImgPrincipalToSecondary, pUpdateImgPrincipalToSecondary);
        if (updateImgPrincipalToSecondaryResult.affectedRows === 0) throw 'Error al editar imágen principal para ser secundaria';

        if (imagenes[0].principal) { // si la nueva imagen principal esta en el array imagenes

          // imágen secundaria pasa a ser principal
          const qUpdateImgSecondaryToPrincipal = 'UPDATE imagenes SET principal = 1 WHERE id = ?';
          const pUpdateImgSecondaryToPrincipal = [imagenes[0].id]; // img secundaria pasa a ser principal
          const [updateImgSecondaryToPrincipalResult] = await con.execute(qUpdateImgSecondaryToPrincipal, pUpdateImgSecondaryToPrincipal);
          if (updateImgSecondaryToPrincipalResult.affectedRows === 0) throw 'Error al editar imágen secundaria para ser principal';

        } else { // sino, la nueva imagen principal está en el array de nuevas imagenes

          // guardar en Cloudinary
          const imgPrincipal = receivedImages.shift(); // saco del array la primera posicion, donde esta la img principal
          const { path: imgPath } = imgPrincipal;
          const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
          uploadedImagesCloudinary.push(public_id);

          // guardar en DB
          const qInsertImgPrincipal = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES (?, ?, ?)';
          const pInsertImgPrincipal = [idProducto, getImgUrlDB(urlImgPrincipal), 1];
          const [insertImgPrincipalResult] = await con.execute(qInsertImgPrincipal, pInsertImgPrincipal);
          if (insertImgPrincipalResult.affectedRows === 0) throw `Error al crear la nueva imágen en la DB`;
        }
      } // sino, la imágen principal no cambio, y no tengo que hacer nada

    } else { // sino, se borro la imagen principal, ahora necesito buscar en que array esta la nueva imágen principal

      if (imagenes.length !== 0 && imagenes[0].principal) { // la nueva img principal es una foto existente, en el array de imagenes
        const qUpdateImgSecondaryToPrincipal = 'UPDATE imagenes SET principal = 1 WHERE id = ?';
        const pUpdateImgSecondaryToPrincipal = [imagenes[0].id]; // img secundaria pasa a ser principal
        const [updateImgSecondaryToPrincipalResult] = await con.execute(qUpdateImgSecondaryToPrincipal, pUpdateImgSecondaryToPrincipal);
        if (updateImgSecondaryToPrincipalResult.affectedRows === 0) throw 'Error al editar imágen secundaria para ser principal';

      } else { // la nueva principal esta en el array de nuevas fotos

        // guardar en Cloudinary
        const imgPrincipal = receivedImages.shift(); // saco del array la primera posicion, donde esta la img principal
        const { path: imgPath } = imgPrincipal; // por si me viene un path erroneó, lo saco yo de la db
        const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
        uploadedImagesCloudinary.push(public_id);

        // guardar en DB
        const qInsertImgPrincipal = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES (?, ?, ?)';
        const pInsertImgPrincipal = [idProducto, getImgUrlDB(urlImgPrincipal), 1];
        const [insertImgPrincipalResult] = await con.execute(qInsertImgPrincipal, pInsertImgPrincipal);
        if (insertImgPrincipalResult.affectedRows === 0) throw `Error al crear la nueva imágen en la DB`;
      }
    }

    // borrar imagenes que no esten en el array imagenes
    let qDeleteImages = 'DELETE FROM imagenes WHERE id IN (';
    const pDeleteImages = [];
    for (const imageDB of imagesDB) {
      if (indexedReceivedImages[imageDB.id] === undefined) { // si no existe la imagen de la DB en el array de imagenes, la borro
        await deleteImgCloudinary(getPublicIdFromCloudinaryImageUrl(urlClodinaryImgs + imageDB.path));
        qDeleteImages += ' ?,';
        pDeleteImages.push(imageDB.id);
      }
    }
    if (pDeleteImages.length !== 0) { // si hay que borrar alguna imagen
      qDeleteImages = qDeleteImages.substring(0, qDeleteImages.length - 1) + ')'; // borrar coma, y agregar parentesis final
      const [deleteImagesResult] = await con.execute(qDeleteImages, pDeleteImages);
      if (deleteImagesResult.affectedRows === 0) throw 'No se borraron las imágenes de la db';
    }

    // agregar las nuevas imágenes secundarias a la tabla imágenes, si hay
    if (receivedImages.length !== 0) {
      let qInsertImages = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES';
      const pInsertImages = [];
      for (const secondaryImg of receivedImages) {
        const { path: imgPath } = secondaryImg;
        const { public_id, secure_url: urlSecondaryImg } = await saveImgCloudinary(imgPath);
        uploadedImagesCloudinary.push(public_id);

        qInsertImages += ' (?, ?, ?),';
        pInsertImages.push(idProducto, getImgUrlDB(urlSecondaryImg), 0);
      }
      qInsertImages = qInsertImages.substring(0, qInsertImages.length - 1); // borrar la coma al final de la query
      // guardar imagenes
      const [insertImagesResults] = await con.execute(qInsertImages, pInsertImages);
      if (insertImagesResults.affectedRows === 0) throw `Error al guardar imagenes en db`;
    }

    // si no hubo ningun error
    await con.commit();

    // select para obtener los ids de las imagenes en BD
    const [imagesRows] = await con.execute(`SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal DESC`, [idProducto]);

    // construir la esctructura del objeto imagenesProducto
    const imagenesProducto = imagesRows.map(imageDB => {
      return {
        id: imageDB.id,
        path: urlClodinaryImgs + imageDB.path,
        principal: imageDB.principal[0] === 1 ? true : false
      }
    });

    // SI SE EJECUTO TODO SIN DISPARAR ERRORES

    const updatedProduct = {
      id: idProducto,
      nombre,
      descripcion,
      idTipo,
      tipo: (await con.execute(`SELECT descripcion FROM tipos WHERE id = ?`, [idTipo]))[0][0].descripcion,
      cantidadConsultas: productDB.cantidadConsultas,
      imagenes: imagenesProducto
    };

    const msg = { text: 'Producto editado correctamente', type: 'green' };
    res.json({
      msg,
      producto: updatedProduct
    });

  } catch (err) {
    console.log(err);
    try {
      await con.rollback();
    } catch (err) {
      console.log(err);
      console.log('Fallo rollback');
    }
    if (uploadedImagesCloudinary.length !== 0) {
      for (const public_id of uploadedImagesCloudinary) {
        await deleteImgCloudinary(public_id);
      }
    }
    if (err.status !== undefined) { // Si el error es un error especial
      const msg = { text: err.text, type: 'red' };
      res.status(err.status).json({ msg });

    } else {
      const msg = { text: 'Error al editar producto, intente nuevamente', type: 'red' };
      res.status(500).json({ msg });
    }
  }

  deleteTmpFilesBuffers(files);
  next();
};

const deleteProduct = async (req = request, res = response, next) => {
  const { id: idProducto } = req.params;
  const { con } = req;

  try {
    await con.beginTransaction();

    // obtengo las imagenes del producto
    const qGetImages = 'SELECT path FROM imagenes WHERE id_producto = ?';
    const pGetImages = [idProducto];
    const [imagesRows] = await con.execute(qGetImages, pGetImages);

    // borrar producto e imagenes de DB
    const qDeleteProduct = 'DELETE FROM productos where id = ?'; // por clave foránea se borran las imgs de la tabla imagenes
    const pDeleteProduct = [idProducto];

    // borro el producto
    try {
      const [resultDeleteProduct] = await con.execute(qDeleteProduct, pDeleteProduct);
      console.log(resultDeleteProduct);
      if (resultDeleteProduct.affectedRows === 0) throw 'Error al borrar producto de la base de datos';
    } catch (err) {
      if (err.errno === 1451) {
        throw { status: 409, text: 'No se puede borrar el producto porque hay mensajes que lo solicitan' };
      } else {
        throw err;
      }
    }

    // borrar imágenes de Cloudinary
    for (const image of imagesRows) {
      const completeUrlImg = urlClodinaryImgs + image.path;
      const public_id_img = getPublicIdFromCloudinaryImageUrl(completeUrlImg);
      await deleteImgCloudinary(public_id_img);
    }

    // si no ocurrio ningún error
    await con.commit();
    const msg = {
      text: 'Producto borrado correctamente',
      type: 'green'
    };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    try {
      await con.rollback();
    } catch (err) {
      console.log(err);
      console.log('Fallo rollback');
    }

    if (err.status !== undefined) { // Si el error es un error especial
      const msg = { text: err.text, type: 'red' };
      res.status(err.status).json({ msg });

    } else {
      const msg = { text: 'Error al borrar el producto, intente nuevamente', type: 'red' };
      res.status(500).json({ msg })
    }
  }
  next();
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
}