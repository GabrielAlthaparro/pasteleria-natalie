const path = require('path');
const fs = require('fs');

const cloudinary = require('cloudinary').v2;
cloudinary.config(process.env.CLOUDINARY_URL);

const { request, response } = require('express');

const { executeAsyncFunction } = require('../helpers/promises');
const { getUuidFileName } = require('../helpers/files');
const { indexArrayToObjectWhitArray } = require('../helpers/indexArray');

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


const uploadedImages = []; // por si ocurre un error al subir las imagenes, las borro de cloudinary
const createProduct = async (req = request, res = response, next) => {
  const { nombre, tipo, descripcion } = req.body;
  const { files } = req;
  const { con } = req;

  try {
    await con.beginTransaction();

    const folder = (process.env.NODE_ENV === 'production') ? 'pasteleria-natalie' : 'pasteleria-natalie/dev';

    // TABLA PRODUCTOS
    const imgPrincipal = files.shift();
    const { path: imgPath } = imgPrincipal;
    const absolutePathImg = path.join(__dirname, '../../', imgPath);
    const { public_id, secure_url: urlImgPrincipal } = await cloudinary.uploader.upload(absolutePathImg, { folder });
    uploadedImages.push(public_id);
    fs.unlinkSync(absolutePathImg);

    let queryProducto = '';
    queryProducto += 'INSERT INTO `productos` ';
    queryProducto += '(`nombre`, `tipo`, `descripcion`, `imagen`) ';
    queryProducto += 'VALUES (?, ?, ?, ?)';
    const paramsProducto = [nombre, tipo, descripcion, urlImgPrincipal];

    const [productResults] = await con.execute(queryProducto, paramsProducto);
    const { insertId: idProducto, affectedRows: productAffectedRows } = productResults;
    if (productAffectedRows === 0) throw 'Error al crear registro en la tabla de productos';

    // TABLA IMAGENES
    const imagenesProducto = [];
    const queryImages = 'INSERT INTO `imagenes` (id_producto, path) VALUES (?, ?)';

    for (const secondaryImg of files) {
      const { originalname, path: imgPath } = secondaryImg;
      const absolutePathImg = path.join(__dirname, '../../', imgPath);
      const { public_id, secure_url: urlSecondaryImg } = await cloudinary.uploader.upload(absolutePathImg, { folder });
      uploadedImages.push(public_id);
      fs.unlinkSync(absolutePathImg);

      const paramsImages = [idProducto, urlSecondaryImg];
      const [results] = await con.execute(queryImages, paramsImages);
      const { insertId: id, affectedRows } = results;
      if (affectedRows === 0) throw `Error al guardar path de img secundaria ${originalname} en db`;

      imagenesProducto.push({ id, path: urlSecondaryImg })
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
        imagen: urlImgPrincipal,
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
    if (uploadedImages.length !== 0) {
      for (const public_id of uploadedImages) {
        cloudinary.uploader.destroy(public_id)
          .catch(err => {
            console.log(err);
            console.log('Error al borrar una imagen de cloudinary');
          })
      }
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