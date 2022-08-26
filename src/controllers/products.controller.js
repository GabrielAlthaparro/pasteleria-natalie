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
  const {
    tipo = null,
    offset = null,
    limite = null
  } = req.body;

  const { con } = req;

  let queryGetProductos = '';
  queryGetProductos += 'SELECT p.id AS id, nombre,p.descripcion AS descripcion, ';
  queryGetProductos += 'p.tipo AS idTipo, t.descripcion AS tipo, p.cantidad_consultas AS cantidadConsultas ';
  queryGetProductos += 'FROM (productos p join tipos t on p.tipo = t.id)';

  const paramsGetProductos = [];

  if (tipo !== null) {
    queryGetProductos += ' WHERE p.tipo = ?';
    paramsGetProductos.push(tipo);
  }
  if (limite !== null) {
    queryGetProductos += ' LIMIT ?';
    paramsGetProductos.push(limite);
    if (offset !== null) {
      queryGetProductos += ' OFFSET ?';
      paramsGetProductos.push(offset);
    }
  }

  try {
    let productos = [];

    const [productsRows] = await con.execute(queryGetProductos, paramsGetProductos);
    if (productsRows.length !== 0) { // si hay productos

      const queryGetImagenes = 'SELECT * FROM imagenes ORDER BY principal DESC';
      const [imagesRows] = await con.execute(queryGetImagenes);
      const indexedImages = indexArrayToObjectWhitArray(imagesRows, 'id_producto');

      productos = productsRows.map(producto => {
        const imagenes = [];
        if (indexedImages[producto.id] !== undefined) {
          for (const imagen of indexedImages[producto.id]) {
            const { id, path, principal } = imagen;
            imagenes.push({ id, path: urlClodinaryImgs + path, principal: principal === 1 ? true : false })
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
    const queryProducto = 'INSERT INTO `productos` (`nombre`, `tipo`, `descripcion`) VALUES (?, ?, ?)';
    const paramsProducto = [nombre, tipo, descripcion];

    const [productResults] = await con.execute(queryProducto, paramsProducto);
    const { insertId: idProducto, affectedRows: productAffectedRows } = productResults;
    if (productAffectedRows === 0) throw 'Error al crear registro en la tabla de productos';

    // TABLA IMAGENES
    const imgPrincipal = receivedImages.shift(); // saco del array la primera posicion, donde esta la img principal
    const { path: imgPath } = imgPrincipal;
    const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
    uploadedImagesCloudinary.push(public_id);

    let queryImages = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES (?, ?, ?),';
    const paramsImages = [idProducto, getImgUrlDB(urlImgPrincipal), 1];

    if (receivedImages.length !== 0) {
      for (const secondaryImg of receivedImages) {
        const { path: imgPath } = secondaryImg;
        const { public_id, secure_url: urlSecondaryImg } = await saveImgCloudinary(imgPath);
        uploadedImagesCloudinary.push(public_id);

        queryImages += ' (?, ?, ?),';
        paramsImages.push(idProducto, getImgUrlDB(urlSecondaryImg), 0);
      }
    }
    queryImages = queryImages.substring(0, queryImages.length - 1); // borrar la coma al final de la query

    // guardar imagenes
    const [results] = await con.execute(queryImages, paramsImages);
    const { affectedRows } = results;
    if (affectedRows === 0) throw `Error al guardar imagenes en db`;

    // select para obtener los ids de las imagenes en BD
    const [imagesRows] = await con.execute(`SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal DESC`, [idProducto]);
    if (imagesRows.length === 0) throw 'Se recibieron las imagenes pero ocurrio un error al guardarlas para leerlas de la db';

    // construir la esctructura del objeto imagenesProducto
    const imagenesProducto = imagesRows.map(image => {
      return {
        id: image.id,
        path: urlClodinaryImgs + image.path,
        principal: image.principal === 1 ? true : false
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

  let queryGetProduct = '';
  queryGetProduct += 'SELECT p.id AS id, nombre,p.descripcion AS descripcion, ';
  queryGetProduct += 'p.tipo AS idTipo, t.descripcion AS tipo, p.cantidad_consultas AS cantidadConsultas ';
  queryGetProduct += 'FROM (productos p join tipos t on p.tipo = t.id) WHERE p.id = ?';
  const paramsGetProducto = [idProducto];

  try {
    await con.beginTransaction();
    const [productsRows] = await con.execute(queryGetProduct, paramsGetProducto);
    if (productsRows.length === 0) throw 'No se encuentra el producto en la DB';
    const [productDB] = productsRows;

    let queryUpdateProduct = 'UPDATE productos SET';
    const paramsUpdateProduct = [];

    if (productDB.nombre !== nombre) {
      queryUpdateProduct += ' nombre = ?,';
      paramsUpdateProduct.push(nombre);
    }
    if (productDB.idTipo !== idTipo) {
      queryUpdateProduct += ' tipo = ?,';
      paramsUpdateProduct.push(idTipo);
    }
    if (productDB.descripcion !== descripcion) {
      queryUpdateProduct += ' descripcion = ?,';
      paramsUpdateProduct.push(descripcion);
    }

    if (paramsUpdateProduct.length !== 0) { // si hay que editar algun dato del producto en tabla productos
      queryUpdateProduct = queryUpdateProduct.substring(0, queryUpdateProduct.length - 1); // borrar la coma del final de la query
      queryUpdateProduct += ' WHERE id = ?';
      paramsUpdateProduct.push(idProducto);
      const [results] = await con.execute(queryUpdateProduct, paramsUpdateProduct);
      const { affectedRows } = results;
      if (affectedRows === 0) throw `Error al editar los datos del producto`;
    }

    let [imagesDB] = await con.execute('SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal DESC', [idProducto]);
    imagesDB = imagesDB.map(imageDB => { // cambio valores numericos de principal por valores booleanos
      const { id, path, principal } = imageDB;
      return { id, path, principal: principal === 1 ? true : false };
    })
    const indexedImagesDB = indexArrayToObject(imagesDB, 'id');

    // verificar que los ids enviados existen en DB
    imagenes.forEach(imagen => {
      if (indexedImagesDB[imagen.id] === undefined) throw 'ID recibido no existe en la db';
    });

    const indexedReceivedImages = indexArrayToObject(imagenes, 'id');
    const oldImgPrincipal = imagesDB[0];
    if (indexedReceivedImages[oldImgPrincipal.id] !== undefined) { // si existe la img principal en el array imagenes
      if (indexedReceivedImages[oldImgPrincipal.id].principal === false) { // si vieja img principal ahora tinene que ser secundaria

        // vieja imágen principal pasa a ser secundaria
        const queryUpdateImgPrincipalToSecondary = 'UPDATE imagenes SET principal = 0 WHERE id = ?';
        const paramsUpdateImgPrincipalToSecondary = [oldImgPrincipal.id] // img principal pasa a ser secundaria
        const [updateImgPrincipalToSecondaryResult] = await con.execute(queryUpdateImgPrincipalToSecondary, paramsUpdateImgPrincipalToSecondary);
        const { affectedRows: affectedRowsUpdateOldPrincipalImage } = updateImgPrincipalToSecondaryResult;
        if (affectedRowsUpdateOldPrincipalImage === 0) throw 'Error al editar imágen principal para ser secundaria';

        if (imagenes[0].principal) { // si la nueva imagen principal esta en el array imagenes

          // imágen secundaria pasa a ser principal
          const queryUpdateImgSecondaryToPrincipal = 'UPDATE imagenes SET principal = 1 WHERE id = ?';
          const paramsUpdateImgSecondaryToPrincipal = [imagenes[0].id]; // img secundaria pasa a ser principal
          const [updateImgSecondaryToPrincipalResult] = await con.execute(queryUpdateImgSecondaryToPrincipal, paramsUpdateImgSecondaryToPrincipal);
          const { affectedRows: affectedRowsUpdateOldSecondaryImage } = updateImgSecondaryToPrincipalResult;
          if (affectedRowsUpdateOldSecondaryImage === 0) throw 'Error al editar imágen secundaria para ser principal';

        } else { // sino, la nueva imagen principal está en el array de nuevas imagenes

          // guardar en Cloudinary
          const imgPrincipal = receivedImages.shift(); // saco del array la primera posicion, donde esta la img principal
          const { path: imgPath } = imgPrincipal;
          const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
          uploadedImagesCloudinary.push(public_id);

          // guardar en DB
          const queryImages = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES (?, ?, ?)';
          const paramsImages = [idProducto, getImgUrlDB(urlImgPrincipal), 1];
          const [insertImgPrincipalResult] = await con.execute(queryImages, paramsImages);
          const { affectedRows } = insertImgPrincipalResult;
          if (affectedRows === 0) throw `Error al crear la nueva imágen en la DB`;
        }
      } // sino, la imágen principal no cambio, y no tengo que hacer nada

    } else { // sino, se borro la imagen principal, ahora necesito buscar en que array esta la nueva imágen principal

      if (imagenes.length !== 0 && imagenes[0].principal) { // la nueva img principal es una foto existente, en el array de imagenes
        const queryUpdateImgSecondaryToPrincipal = 'UPDATE imagenes SET principal = 1 WHERE id = ?';
        const paramsUpdateImgSecondaryToPrincipal = [imagenes[0].id]; // img secundaria pasa a ser principal
        const [updateImgSecondaryToPrincipalResult] = await con.execute(queryUpdateImgSecondaryToPrincipal, paramsUpdateImgSecondaryToPrincipal);
        const { affectedRows: affectedRowsUpdateOldSecondaryImage } = updateImgSecondaryToPrincipalResult;
        if (affectedRowsUpdateOldSecondaryImage === 0) throw 'Error al editar imágen secundaria para ser principal';

      } else { // la nueva principal esta en el array de nuevas fotos

        // guardar en Cloudinary
        const imgPrincipal = receivedImages.shift(); // saco del array la primera posicion, donde esta la img principal
        const { path: imgPath } = imgPrincipal; // por si me viene un path erroneó, lo saco yo de la db
        const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
        uploadedImagesCloudinary.push(public_id);

        // guardar en DB
        const queryImages = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES (?, ?, ?)';
        const paramsImages = [idProducto, getImgUrlDB(urlImgPrincipal), 1];
        const [insertImgPrincipalResult] = await con.execute(queryImages, paramsImages);
        const { affectedRows } = insertImgPrincipalResult;
        if (affectedRows === 0) throw `Error al crear la nueva imágen en la DB`;
      }
    }

    // borrar imagenes que no esten en el array imagenes
    let queryDeleteImages = 'DELETE FROM imagenes WHERE id IN (';
    const paramsDeleteImages = [];
    for (const imageDB of imagesDB) {
      if (indexedReceivedImages[imageDB.id] === undefined) { // no existe la imagen de la DB en el array de imagenes
        await deleteImgCloudinary(getPublicIdFromCloudinaryImageUrl(urlClodinaryImgs + imageDB.path));
        queryDeleteImages += ' ?,';
        paramsDeleteImages.push(imageDB.id);
      }
    }
    if (paramsDeleteImages.length !== 0) { // si hay que borrar alguna imagen
      queryDeleteImages = queryDeleteImages.substring(0, queryDeleteImages.length - 1) + ')'; // borrar coma, y agregar parentesis final
      const [deleteResult] = await con.execute(queryDeleteImages, paramsDeleteImages);
      const { affectedRows: deleteAffectedRows } = deleteResult;
      if (deleteAffectedRows === 0) throw 'No se borraron las imágenes de la db';
    }

    // agregar las nuevas imágenes secundarias a la tabla imágenes, si hay
    if (receivedImages.length !== 0) {
      let queryInsertImages = 'INSERT INTO `imagenes` (id_producto, path, principal) VALUES';
      const paramsInsertImages = [];
      for (const secondaryImg of receivedImages) {
        const { path: imgPath } = secondaryImg;
        const { public_id, secure_url: urlSecondaryImg } = await saveImgCloudinary(imgPath);
        uploadedImagesCloudinary.push(public_id);

        queryInsertImages += ' (?, ?, ?),';
        paramsInsertImages.push(idProducto, getImgUrlDB(urlSecondaryImg), 0);
      }
      queryInsertImages = queryInsertImages.substring(0, queryInsertImages.length - 1); // borrar la coma al final de la query
      // guardar imagenes
      const [results] = await con.execute(queryInsertImages, paramsInsertImages);
      const { affectedRows } = results;
      if (affectedRows === 0) throw `Error al guardar imagenes en db`;
    }

    // si no hubo ningun error
    await con.commit();

    // select para obtener los ids de las imagenes en BD
    const [imagesRows] = await con.execute(`SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal DESC`, [idProducto]);

    // construir la esctructura del objeto imagenesProducto
    const imagenesProducto = imagesRows.map(image => {
      return {
        id: image.id,
        path: urlClodinaryImgs + image.path,
        principal: image.principal === 1 ? true : false
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
    await con.rollback();
    if (uploadedImagesCloudinary.length !== 0) {
      for (const public_id of uploadedImagesCloudinary) {
        await deleteImgCloudinary(public_id);
      }
    }
    const msg = { text: 'Error al editar producto, intente nuevamente', type: 'red' };
    res.status(500).json({ msg })
  }

  deleteTmpFilesBuffers(files);
  next();
};

const deleteProduct = async (req = request, res = response, next) => {
  const { id: idProducto } = req.params;
  const { con } = req;

  try {
    // borrar imágenes de cloudinary
    const queryGetProductImages = 'SELECT path FROM imagenes WHERE id_producto = ?';
    const paramsGetProductImages = [idProducto];
    const [productImages] = await con.execute(queryGetProductImages, paramsGetProductImages);
    for (const image of productImages) {
      const completeUrlImg = urlClodinaryImgs + image.path;
      const public_id_img = getPublicIdFromCloudinaryImageUrl(completeUrlImg);
      await deleteImgCloudinary(public_id_img);
    }

    // borrar producto e imagenes de DB
    const queryDeleteProduct = 'DELETE FROM productos where id = ?'; // por clave foránea se borran las imgs de la tabla imagenes
    const paramsDeleteProduct = [idProducto];

    const [resultDeleteProduct] = await con.execute(queryDeleteProduct, paramsDeleteProduct);
    const { affectedRows } = resultDeleteProduct;
    if (affectedRows === 0) throw 'Error al borrar producto de la base de datos, las imágenes en la nube si se borraron';

    // si no ocurrio ningún error
    const msg = {
      text: 'Producto borrado correctamente',
      type: 'green'
    };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    const msg = {
      text: 'Error al borrar el producto, intente nuevamente',
      type: 'red'
    };
    res.status(500).json({ msg })
  }
  next();
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
}