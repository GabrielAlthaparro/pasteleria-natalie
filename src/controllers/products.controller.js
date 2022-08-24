const path = require('path');
const fs = require('fs');

const { request, response } = require('express');

const { indexArrayToObjectWhitArray } = require('../helpers/indexArray');
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
  const { nombre, idTipo, descripcion, cantidadConsultas, imagenes } = req.body;
  const { files } = req;
  const { con } = req;

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
    if (productDB.cantidadConsultas !== cantidadConsultas) {
      queryUpdateProduct += ' cantidad_consultas = ?,';
      paramsUpdateProduct.push(cantidadConsultas);
    }

    if (paramsUpdateProduct.length !== 0) { // si hay que editar algun dato del producto en tabla productos
      queryUpdateProduct = queryUpdateProduct.substring(0, queryUpdateProduct.length - 1); // borrar la coma del final de la query
      queryUpdateProduct += ' WHERE id = ?';
      paramsUpdateProduct.push(idProducto);
      const [results] = await con.execute(queryUpdateProduct, paramsUpdateProduct);
      const { affectedRows } = results;
      if (affectedRows === 0) throw `Error al editar los datos del producto`;
    }

    const [imagesRows] = await con.execute('SELECT id, path, principal FROM imagenes WHERE id_producto = ? ORDER BY principal', [idProducto]);

    imagenes.sort((imgA, imgB) => imgA.principal - imgB.principal);
    if (imagenes[0].principal && imagenes[1].principal) throw 'Error, hay dos imágenes principales';

    // dejar img principal, borrar imgs secundarias, y crear nuevas
    // if (imagen === 0) {
    //   let hayQueBorrarImgsEnDB = false;
    //   let queryDeleteImages = 'DELETE FROM imagenes WHERE';
    //   const paramsDeleteImages = [];
    //   for (const secondaryImg of imagesRows) { // por cada imagen de la db
    //     const receivedSecondaryImg = imagenes.find(({ id }) => id === secondaryImg.id);
    //     if (receivedSecondaryImg === undefined) { // si no existe en el array que me mandaron, la tengo que borrar
    //       hayQueBorrarImgsEnDB = true;
    //       queryDeleteImages += ' id = ? OR';
    //       paramsDeleteImages.push(secondaryImg.id);

    //       const public_id_img = getPublicIdFromCloudinaryImageUrl(urlClodinaryImgs + secondaryImg.path);
    //       await deleteImgCloudinary(public_id_img);
    //     }
    //   }
    //   if (hayQueBorrarImgsEnDB) {
    //     queryDeleteImages = queryDeleteImages.substring(0, queryDeleteImages.length - 1); // borrar ultimo OR
    //     const [imagesResult] = await con.execute(queryDeleteImages, paramsDeleteImages);
    //     const { affectedRows } = imagesResult;
    //     if (affectedRows === 0) throw 'Imágenes que se deberían borrar de DB no se pudieron borrar';
    //   }
    //   console.log(queryDeleteImages);
    // }

    await con.commit();
    const msg = { text: 'Producto editado correctamente', type: 'green' };
    res.json({ msg });

  } catch (err) {
    console.log(err);
    const msg = { text: 'Error al editar producto, intente nuevamente', type: 'red' };
    res.json({ msg })
  }

  deleteTmpFilesBuffers(files);
  next();
};
/*
[{
  principal: true,
  id: 0,
  path: ""
},
{
  principal: false,
  id: 0,
  path: "#fdsfds"
},
  {
    principal: false,
    id: 0,
    path: "#fdsfds"
  }]

[{
  binario: "fdsfsd"
},
{
  binario: "fdsfsd"
},
  {
    binario: "fdsfsd"
  }]
buscarEnNuevasImg: false
remplazo: idImg
*/

const deleteProduct = async (req = request, res = response, next) => {
  const { id } = req.params;
  const { con } = req;

  try {
    // borrar imágenes de cloudinary
    const queryGetProductImages = 'SELECT path FROM imagenes WHERE id_producto = ?';
    const paramsGetProductImages = [id];
    const [productImages] = await con.execute(queryGetProductImages, paramsGetProductImages);
    for (const image of productImages) {
      const completeUrlImg = urlClodinaryImgs + image.path;
      const public_id_img = getPublicIdFromCloudinaryImageUrl(completeUrlImg);
      await deleteImgCloudinary(public_id_img);
    }

    // borrar producto e imagenes de DB
    const queryDeleteProduct = 'DELETE FROM productos where id = ?'; // por clave foránea se borran las imgs de la tabla imagenes
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