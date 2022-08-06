const path = require('path');
const fs = require('fs');


const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';
// https://res.cloudinary.com/digitalsystemda/image/upload/v1659329811/pasteleria-natalie/dev/dea9ozxkd4kcfpjbjmer.jpg

const { request, response } = require('express');

const { indexArrayToObjectWhitArray } = require('../helpers/indexArray');
const { getImgUrlDB } = require('../helpers/products');
const { saveImgCloudinary, deleteTmpFilesBuffers, deleteImgCloudinary, getPublicIdFromCloudinaryImageUrl } = require('../helpers/files');

const getProducts = async (req = request, res = response, next) => {
  const {
    tipo = null,
    offset = null,
    limite = null
  } = req.body;
  const { con } = req;

  let queryGetProductos = '';
  queryGetProductos += 'SELECT p.id AS id, nombre,p.descripcion AS descripcion, imagen, ';
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

      const queryGetImagenes = 'SELECT * FROM imagenes';
      const [imagesRows] = await con.execute(queryGetImagenes);
      const indexedImages = indexArrayToObjectWhitArray(imagesRows, 'id_producto');

      productos = productsRows.map(producto => {
        producto.imagen = urlClodinaryImgs + producto.imagen; // reconstruir url de la imagen de cloudinary

        const imagenes = [];
        if (indexedImages[producto.id] !== undefined) {
          for (const imagen of indexedImages[producto.id]) {
            const { id, path } = imagen;
            imagenes.push({ id, path: urlClodinaryImgs + path })
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
    const imgPrincipal = receivedImages.shift();

    const { path: imgPath } = imgPrincipal;
    const { public_id, secure_url: urlImgPrincipal } = await saveImgCloudinary(imgPath);
    uploadedImagesCloudinary.push(public_id);

    const imgPrincipalUrlDB = getImgUrlDB(urlImgPrincipal);

    const queryProducto = 'INSERT INTO `productos` (`nombre`, `tipo`, `descripcion`, `imagen`) VALUES (?, ?, ?, ?)';
    const paramsProducto = [nombre, tipo, descripcion, imgPrincipalUrlDB];

    const [productResults] = await con.execute(queryProducto, paramsProducto);
    const { insertId: idProducto, affectedRows: productAffectedRows } = productResults;
    if (productAffectedRows === 0) throw 'Error al crear registro en la tabla de productos';

    // TABLA IMAGENES
    let imagenesProducto = [];
    if (receivedImages.length !== 0) { // si no se envio ninguna imagen más, ya termine todo, salto a mandar la respuesta

      let queryImages = 'INSERT INTO `imagenes` (id_producto, path) VALUES';
      const paramsImages = [];

      for (const secondaryImg of receivedImages) {
        const { path: imgPath } = secondaryImg;
        const { public_id, secure_url: urlSecondaryImg } = await saveImgCloudinary(imgPath);

        uploadedImagesCloudinary.push(public_id);

        const imgSecondaryUrlDB = getImgUrlDB(urlSecondaryImg);

        queryImages += ' (?, ?),';
        paramsImages.push(idProducto, imgSecondaryUrlDB);
      }

      queryImages = queryImages.substring(0, queryImages.length - 1); // borrar la coma al final de la query

      // guardar imagenes secundarias
      const [results] = await con.execute(queryImages, paramsImages);
      const { affectedRows } = results;
      if (affectedRows === 0) throw `Error al guardar imagenes secundarias en db`;

      // select para obtener su id en la BD
      const [imagesRows] = await con.execute(`SELECT id, path FROM imagenes WHERE id_producto = ?`, [idProducto]);
      if (imagesRows.length === 0) throw 'Se recibieron las imagenes pero ocurrio un error al guardarlas para leerlas de la db';

      // construir la esctructura para devolver en la response
      imagenesProducto = imagesRows.map(image => { return { id: image.id, path: urlClodinaryImgs + image.path } });
    }

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
      imagen: urlClodinaryImgs + imgPrincipalUrlDB,
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
  const { id } = req.params;
  const { nombre, tipo, descripcion } = req.body;
  const { files } = req;
  const { con } = req;

  res.json({ msg: 'update' });
  next();
};

const deleteProduct = async (req = request, res = response, next) => {
  const { id } = req.params;
  const { con } = req;

  try {
    // borrar imágen principal de cloudinary
    const queryGetProduct = 'SELECT imagen FROM productos WHERE id = ?';
    const paramsGetProduct = [id];

    const [productsRows] = await con.execute(queryGetProduct, paramsGetProduct);
    if (productsRows.length !== 1) throw 'El producto que se quiere eliminar no está en la base de datos';

    const [product] = productsRows;
    const completeUrlImg = urlClodinaryImgs + product.imagen;
    const public_id_img = getPublicIdFromCloudinaryImageUrl(completeUrlImg);
    await deleteImgCloudinary(public_id_img);

    // borrar imágenes secundarias de cloudinary, si existen
    const queryGetProductImages = 'SELECT path FROM imagenes WHERE id_producto = ?';
    const paramsGetProductImages = [id];

    const [productImages] = await con.execute(queryGetProductImages, paramsGetProductImages);
    if (productImages.length !== 0) {
      for (const secondaryImg of productImages) {
        const completeUrlImg = urlClodinaryImgs + secondaryImg.path;
        const public_id_img = getPublicIdFromCloudinaryImageUrl(completeUrlImg);
        await deleteImgCloudinary(public_id_img);
      }
    }

    // borrar producto e imagenes de DB
    const queryDeleteProduct = 'DELETE FROM productos where id = ?'; // por clave foránea se borran también las imagenes del producto en la tabla de imagenes
    const paramsDeleteProduct = [id];

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
    res.status(500).json({
      msg: 'Error al borrar el producto, intente nuevamente',
      type: 'red'
    })
  }
  next();
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
}