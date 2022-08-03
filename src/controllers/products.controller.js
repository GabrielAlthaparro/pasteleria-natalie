const path = require('path');
const fs = require('fs');

const cloudinary = require('cloudinary').v2;
cloudinary.config(process.env.CLOUDINARY_URL);
const urlClodinaryImgs = 'https://res.cloudinary.com/digitalsystemda/image/upload';
// https://res.cloudinary.com/digitalsystemda/image/upload/v1659329811/pasteleria-natalie/dev/dea9ozxkd4kcfpjbjmer.jpg

const { request, response } = require('express');

const { indexArrayToObjectWhitArray } = require('../helpers/indexArray');
const { getImgUrlDB } = require('../helpers/products');

const getProducts = async (req = request, res = response, next) => {
  const {
    tipo = null,
    offset = null,
    limite = null
  } = req.body;
  const { con } = req;

  let queryGetProductos = 'SELECT * from get_all_products';
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
    // const getPool = req.app.get('getPool');
    // const pool = getPool();
    // const queryGetImagenes = 'SELECT * FROM `imagenes`';
    // const [[imagesRows], [productsRows]] = await Promise.all([
    //   pool.execute(queryGetImagenes),
    //   pool.execute(queryGetProductos, paramsGetProductos)
    // ]);

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
    const absolutePathImg = path.join(__dirname, '../../', imgPath); // para poder enviar imagen a cloudinary

    const { public_id, secure_url: urlImgPrincipal } = await cloudinary.uploader.upload(absolutePathImg, { folder });
    uploadedImages.push(public_id);
    fs.unlinkSync(absolutePathImg); // borrar buffers temporales de la imagen

    const imgPrincipalUrlDB = getImgUrlDB(urlImgPrincipal);

    const queryProducto = 'INSERT INTO `productos` (`nombre`, `tipo`, `descripcion`, `imagen`) VALUES (?, ?, ?, ?)';
    const paramsProducto = [nombre, tipo, descripcion, imgPrincipalUrlDB];

    const [productResults] = await con.execute(queryProducto, paramsProducto);
    const { insertId: idProducto, affectedRows: productAffectedRows } = productResults;
    if (productAffectedRows === 0) throw 'Error al crear registro en la tabla de productos';

    // TABLA IMAGENES
    let imagenesProducto = [];
    if (files.length !== 0) { // si no se envio ninguna imagen más, ya termine todo, salto a mandar la respuesta

      let queryImages = 'INSERT INTO `imagenes` (id_producto, path) VALUES';
      const paramsImages = [];

      for (const secondaryImg of files) {
        const { path: imgPath } = secondaryImg;
        const absolutePathImg = path.join(__dirname, '../../', imgPath); // para poder enviar imagen a cloudinary

        const { public_id, secure_url: urlSecondaryImg } = await cloudinary.uploader.upload(absolutePathImg, { folder });
        uploadedImages.push(public_id);
        fs.unlinkSync(absolutePathImg); // borrar buffers temporales de la imagen

        const imgSecondaryUrlDB = getImgUrlDB(urlSecondaryImg);

        queryImages += ' (?, ?),';
        paramsImages.push(idProducto, imgSecondaryUrlDB);

      }

      queryImages = queryImages.substring(0, queryImages.length - 1); // borrar la coma al final de la query
      const [results] = await con.execute(queryImages, paramsImages);
      const { affectedRows } = results;
      if (affectedRows === 0) throw `Error al guardar imagenes secundarias en db`;

      const [imagesRows] = await con.execute(`SELECT id, path FROM imagenes WHERE id_producto = ?`, [idProducto]);
      if (imagesRows.length === 0) throw 'Se recibieron las imagenes pero ocurrio un error al guardarlas para leerlas de la db';

      imagenesProducto = imagesRows.map(image => { return { id: image.id, path: urlClodinaryImgs + image.path } });
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
        imagen: urlClodinaryImgs + imgPrincipalUrlDB,
        imagenes: imagenesProducto
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: 'Error al crear el producto, intente nuevamente',
      type: 'red'
    });
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