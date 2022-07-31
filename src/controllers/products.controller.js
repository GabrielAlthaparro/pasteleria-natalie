const path = require('path');
const fs = require('fs');

const { request, response } = require('express');

const { executeAsyncFunction } = require('../helpers/promises');
const { getUuidFileName } = require('../helpers/files');
const { indexArrayToObjectWhitArray } = require('../helpers/indexArray');

const pathToSaveFiles = path.join(__dirname, '../assets/img/');

const getProducts = async (req = request, res = response, next) => {
  const {
    tipo = null,
    offset = null,
    limite = null
  } = req.body;
  const { con } = req;

  const paramsGetProductos = [];
  let queryGetProductos = '';
  queryGetProductos += 'SELECT p.id AS id, nombre, p.descripcion AS descripcion, p.tipo AS idTipo, t.descripcion AS tipo, cantidad_consultas AS cantidadConsultas, imagen';
  queryGetProductos += ' FROM productos AS p INNER JOIN tipos AS t ON p.tipo = t.id';
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
    // const queryGetImagenes = 'SELECT * FROM `imagenes`';
    // const [imagesResults, productsResults] = await Promise.all([
    //   con.execute(queryGetImagenes),
    //   con.execute(queryGetProductos, paramsGetProductos)
    // ]);
    const [productsRows] = await con.execute(queryGetProductos, paramsGetProductos);
    if (productsRows.length === 0) { res.json(productsRows); next(); return; } // no hay productos

    const queryGetImagenes = 'SELECT * FROM `imagenes`';
    const [imagesRows] = await con.execute(queryGetImagenes);

    const indexedImages = indexArrayToObjectWhitArray(imagesRows, 'id_producto');

    const productos = productsRows.map(producto => {
      const imagenes = [];
      if (indexedImages[producto.id] !== undefined) {
        for (const imagen of indexedImages[producto.id]) {
          const { id, path } = imagen;
          imagenes.push({ id, path })
        }
      }
      return {
        ...producto,
        imagenes
      };
    });

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
  let pathToProductImages = null;

  try {
    await con.beginTransaction();

    // TABLA PRODUCTOS
    let queryProducto = '';
    queryProducto += 'INSERT INTO `productos` ';
    queryProducto += '(`nombre`, `tipo`, `descripcion`, `imagen`) ';
    queryProducto += 'VALUES (?, ?, ?, ?)';
    const paramsProducto = [nombre, tipo, descripcion, '']; // la url de la imagen no la tengo todavia

    const [productResults] = await con.execute(queryProducto, paramsProducto);
    const { insertId: idProducto, affectedRows: productAffectedRows } = productResults;
    if (productAffectedRows === 0) throw 'Error al crear registro en la tabla de productos';

    // CREAR DIRECTORIO DE LAS IMAGENES DEL PRODUCTO
    pathToProductImages = path.join(pathToSaveFiles, idProducto.toString());
    await executeAsyncFunction(fs.mkdir
      , 'Fallo al crear el directorio para guardar las fotos del producto'
      , pathToProductImages, { recursive: true });

    const imgPrincipal = files.shift();
    const { buffer, originalname } = imgPrincipal;
    const imgName = getUuidFileName(originalname); // '5a94e5b8-7a19-434b-bd16-c456062e0c90.jpg'
    const pathImgPrincipal = path.join(pathToProductImages, imgName);

    await executeAsyncFunction(fs.writeFile
      , 'Fallo al guardar el archivo de la foto principal'
      , pathImgPrincipal, buffer);

    // GUARDAR LA RUTA DE LA IMAGEN PRINCIPAL EN LA TABLA PRODUCTOS
    let queryImgProducto = '';
    queryImgProducto += 'UPDATE `productos` ';
    queryImgProducto += 'SET `imagen`= ? ';
    queryImgProducto += 'WHERE `id`= ?';
    const paramsImgProducto = [pathImgPrincipal, idProducto];

    const [updateResults] = await con.execute(queryImgProducto, paramsImgProducto);
    const { affectedRows } = updateResults;
    if (affectedRows === 0) throw 'Error al agregar el nombre de la foto a la db';

    const imagenesProducto = [];
    // TABLA IMAGENES
    const queryImages = 'INSERT INTO `imagenes` (id_producto, path) VALUES (?, ?)';
    for (const secondaryImg of files) {
      const { buffer, originalname } = secondaryImg;
      const imgName = getUuidFileName(originalname);
      const pathImgSecondary = path.join(pathToProductImages, imgName);

      await executeAsyncFunction(fs.writeFile
        , `Fallo al guardar el archivo de la foto secundaria ${originalname}`
        , pathImgSecondary, buffer);

      const paramsImages = [idProducto, pathImgSecondary];
      const [results] = await con.execute(queryImages, paramsImages);
      const { insertId: id, affectedRows } = results;
      if (affectedRows === 0) throw `Error al guardar path de img secundaria ${originalname} en db`;

      imagenesProducto.push({ id, path: pathImgSecondary })
    }

    // SI SE EJECUTO TODO SIN DISPARAR ERRORES
    await con.commit();

    res.json({
      msg: {
        text: 'Producto registrado correctamente',
        type: 'green'
      },
      producto: {
        id: idProducto,
        nombre,
        descripcion,
        idTipo: tipo,
        tipo: (await con.execute(`SELECT descripcion FROM tipos WHERE id = ?`, [tipo]))[0][0].descripcion,
        cantidadConsultas: 0,
        imagen: pathImgPrincipal,
        imagenes: imagenesProducto
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: 'Error al crear el producto, intente nuevamente',
      type: 'red'
    })
    try {
      await con.rollback();
    } catch (err) {
      console.log(err);
      console.log('Fallo rollback');
    }
    try {
      if (fs.existsSync(pathToProductImages)) {
        await executeAsyncFunction(fs.rm
          , 'Error al borrar el directorio de las fotos del producto'
          , pathToProductImages, { recursive: true });
      }
    } catch (err) {
      console.log(err);
      console.log('fallo borrar el directorio recien creado');
    }
  }
  next();
};

const updateProduct = (req = request, res = response, next) => {
  const { id } = req.params;
  const { nombre, tipo, descripcion } = req.body;
  const { files } = req;
  const { con } = req;

  console.log('update');
  res.json({ msg: 'update' });
  next();
};

const deleteProduct = (req = request, res = response, next) => {
  console.log('delete');
  res.json({ msg: 'delete' })
  next();
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
}