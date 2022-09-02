'use strict';
const { Router } = require('express');

const CANTIDAD_ARCHIVOS_PERMITIDOS = 10;
const multer = require('multer');
const upload = multer(
  {
    dest: './src/uploads',
    limits: {
      fileSize: 5242880, // cada archivo puede pesar máximo 5mb
    }
  });

const { header, param, query, body } = require('express-validator');

const {
  validateReqFilesNotEmpty,
  validateReqFilesExtensions,
  multerErrorHandler,
  validateReqMaxFiles
} = require('../middlewares')

const {
  validateExistsIdTipo,
  validateExistsIdProduct,
  validateIDsNotRepeatInArray,
  validateJWT,
  validateRequestFields } = require('../helpers');

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/products.controller');

const router = Router();

router.get('/', [
  query('page', 'Páginación inválida').optional()
    .notEmpty().bail()
    .isInt({ min: 1 }).bail().withMessage('La página debe ser un número natural')
    .toInt(),
  query('tipo', 'Tipo inválido').optional()
    .notEmpty().bail()
    .isInt({ min: 0 }).bail()
    .toInt(),
  query('nombre', 'Nombre inválido').optional()
    .notEmpty().bail()
    .customSanitizer(value => value.toString()).trim()
    .matches(/^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ ]*$/).bail().withMessage('El nombre tiene caracteres inválidos')
    .isLength({ max: 50 }).bail().withMessage('Ingrese un nombre con menos de 50 caracteres'),

  validateRequestFields
], getProducts);

router.get('/:id', [
  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdProduct),
  validateRequestFields
], getProduct);

router.post('/', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  upload.array('imagenes'), // aca se cargan los campos de texto también, o sea todos los campos del body del formdata. Si no mandan ningun archivo, entonces req.files = undefined y body.imagenes = ''
  multerErrorHandler(),
  validateReqFilesNotEmpty(),
  validateReqMaxFiles(CANTIDAD_ARCHIVOS_PERMITIDOS),
  validateReqFilesExtensions(['jpg', 'png', 'jpeg', 'webp', 'gif']),

  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString()).trim()
    .matches(/^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ ]*$/).bail().withMessage('El nombre tiene caracteres inválidos')
    .isLength({ max: 50 }).bail().withMessage('Máximo 50 caracteres'),
  body('tipo', 'Tipo inválido')
    .notEmpty().bail().withMessage('El tipo es obligatorio')
    .isInt({ min: 1 }).bail()
    .toInt()
    .custom(validateExistsIdTipo),
  body('descripcion', 'Descripción inválida')
    .notEmpty().bail().withMessage('Ingrese una descripción')
    .customSanitizer(value => value.toString()).trim()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ0-9$,\."' ]*$/).bail().withMessage('La descripción tiene caracteres inválidos')
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),

  validateRequestFields
], createProduct);

let imagenesOk = false;
router.put('/:id', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdProduct),

  upload.array('nuevasImagenes'),
  multerErrorHandler(),
  validateReqMaxFiles(CANTIDAD_ARCHIVOS_PERMITIDOS),
  validateReqFilesExtensions(['jpg', 'png', 'jpeg', 'webp', 'gif']),

  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString()).trim()
    .toLowerCase()
    .matches(/^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ ]*$/g).bail().withMessage('Caracteres inválidos')
    .isLength({ max: 50 }).bail().withMessage('Máximo 50 caracteres'),
  body('idTipo', 'Tipo inválido')
    .notEmpty().bail().withMessage('El tipo es obligatorio')
    .isInt({ min: 1 }).bail()
    .toInt()
    .custom(validateExistsIdTipo),
  body('descripcion', 'Descripción inválida')
    .notEmpty().bail().withMessage('Ingrese una descripción')
    .customSanitizer(value => value.toString()).trim()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ0-9,\."' ]*$/).bail().withMessage('Caracteres inválidos')
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),

  body('imagenes', 'Imágenes inválidas')
    .notEmpty().bail().withMessage('El array de imágenes existentes no puede estar vacío')
    .customSanitizer(value => value.toString()).trim()
    .isJSON({ allow_primitives: true }).bail().withMessage('Imágenes inválidas, se esperaba un JSON')
    .customSanitizer(value => JSON.parse(value))
    .isArray().bail()
    .custom(value => { return imagenesOk = true }), // si llego hasta aca, me tengo que fijar los campos internos tambien son correctos

  // controlar campo id
  body('imagenes.*.id')
    .if(body('imagenes').custom(value => imagenesOk)) // si ya hay un error antes no hago nada
    .isInt({ min: 1 }).bail().withMessage('ID de imágen inválido').toInt(), // transformo los ids a int
  body('imagenes')
    .if(body('imagenes').custom(value => imagenesOk)) // si ya hay un error antes no hago nada
    .if(body('imagenes.*.id').isInt({ min: 1 }))
    .custom(validateIDsNotRepeatInArray).bail().withMessage('Se enviaron imágenes con IDs repetidos'),

  // controlar campo principal
  body('imagenes.*.principal')
    .if(body('imagenes').custom(value => imagenesOk)) // si ya hay un error antes no hago nada
    .isBoolean().bail().withMessage('Campo principal en imágen inválido').toBoolean(), // transformo los principal a boolean
  body('imagenes')
    .if(body('imagenes').custom(value => imagenesOk)) // si ya hay un error antes no hago nada
    .if(body('imagenes.*.principal').isBoolean())
    .customSanitizer(imagenes => imagenes.sort((imgA, imgB) => Number(Boolean(imgB.principal)) - Number(Boolean(imgA.principal))))
    .custom((imagenes, { req }) => {
      if (req.files.length === 0) {
        if (imagenes.length === 0 || imagenes[0].principal === false) throw 'Se quiere reemplazar la imágen principal, pero no se envió una nueva';
      }
      if (imagenes.length >= 2 && (imagenes[0].principal && imagenes[1].principal)) throw 'Se enviaron dos imágenes principales';
      return true;
    }),
  // volver a inicializar la variable
  body('imagenes').custom(value => {
    imagenesOk = false;
    return true;
  }),

  validateRequestFields
], updateProduct);


router.delete('/:id', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdProduct),

  validateRequestFields
], deleteProduct);

module.exports = router;