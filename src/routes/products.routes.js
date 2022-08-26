'use strict';
const { Router } = require('express');

const CANTIDAD_ARCHIVOS_PERMITIDOS = 20;
const multer = require('multer');
const upload = multer(
  {
    dest: './src/uploads',
    limits: {
      fileSize: 5242880, // cada archivo puede pesar máximo 5mb
      files: CANTIDAD_ARCHIVOS_PERMITIDOS // cuantos archivos puede tener cada campor de file
    }
  });

const { header, param, body } = require('express-validator');

const {
  validateReqFilesNotEmpty,
  validateReqFilesExtensions,
  validateJWT,
  multerErrorHandler
} = require('../middlewares')

const { validateExistsIdTipo, validateExistsIdProduct, validateArrayImagenes, } = require('../helpers/validators');
const validateRequestFields = require('../helpers/validate-request-fields');

const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/products.controller');

const router = Router();


router.get('/', [
  body('tipo', 'Tipo inválido').optional()
    .isInt({ min: 1 }).bail()
    .toInt()
    .custom(validateExistsIdTipo),
  body('offset', 'Offset inválido').optional()
    .isInt({ min: 1 }).bail()
    .toInt(),
  body('limite', 'Límite inválido').optional()
    .isInt({ min: 1 }).bail()
    .toInt(),

  validateRequestFields
], getProducts);


router.post('/', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString())
    .trim(),
  validateJWT,

  upload.array('imagenes'), // aca se cargan los campos de texto también, o sea todos los campos del body del formdata, si no mandan ningun campo, entonces req.files = undefined
  multerErrorHandler('imagenes', CANTIDAD_ARCHIVOS_PERMITIDOS),
  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString())
    .trim()
    .toLowerCase()
    .matches(/^[a-zñ0-9 ]*$/g).bail().withMessage('El nombre tiene caracteres inválidos')
    .isLength({ max: 50 }).bail().withMessage('Máximo 50 caracteres'),
  body('tipo', 'Tipo inválido')
    .notEmpty().bail().withMessage('El tipo es obligatorio')
    .isInt().bail()
    .toInt()
    .custom(validateExistsIdTipo),
  body('descripcion', 'Descripción inválida')
    .notEmpty().bail().withMessage('Ingrese una descripción')
    .customSanitizer(value => value.toString())
    .trim()
    .toLowerCase()
    .matches(/^[a-zñáéíóúü0-9,\."' ]*$/).bail().withMessage('La descripción tiene caracteres inválidos')
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),

  validateReqFilesNotEmpty('imagenes'),
  validateReqFilesExtensions('imagenes', ['jpg', 'png', 'jpeg', 'webp', 'gif']),

  validateRequestFields
], createProduct);


router.put('/:id', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString())
    .trim(),
  validateJWT,

  param('id', 'ID inválido')
    .notEmpty().bail().withMessage('El ID no puede estar vacío')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdProduct),

  upload.array('nuevasImagenes'),
  multerErrorHandler('nuevasImagenes', CANTIDAD_ARCHIVOS_PERMITIDOS),
  validateReqFilesExtensions('nuevasImagenes', ['jpg', 'png', 'jpeg', 'webp', 'gif']),

  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString())
    .trim()
    .toLowerCase()
    .matches(/^[a-zñ0-9 ]*$/g).bail().withMessage('Caracteres inválidos')
    .isLength({ max: 50 }).bail().withMessage('Máximo 50 caracteres'),
  body('idTipo', 'Tipo inválido')
    .notEmpty().bail().withMessage('El tipo es obligatorio')
    .isInt({ min: 1 }).bail()
    .toInt()
    .custom(validateExistsIdTipo),
  body('descripcion', 'Descripción inválida')
    .notEmpty().bail().withMessage('Ingrese una descripción')
    .customSanitizer(value => value.toString())
    .trim()
    .toLowerCase()
    .matches(/^[a-zñáéíóúü0-9,\."' ]*$/).bail().withMessage('Caracteres inválidos')
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),

  body('cantidadConsultas', 'Cantidad de consultas inválida')
    .notEmpty().bail().withMessage('Envíe una cantidad de consultas')
    .isInt({ min: 0 }).bail().withMessage('La cantidad de consultas tiene que ser un valor numérico positivo')
    .toInt(),

  body('imagenes', 'Imágenes inválidas')
    .notEmpty().bail().withMessage('El array de imágenes existentes no puede estar vacío')
    .customSanitizer(value => value.toString())
    .isJSON({ allow_primitives: true }).bail().withMessage('Imágenes inválidas, se esperaba un JSON')
    .customSanitizer(value => JSON.parse(value))
    .isArray().bail(),

  body('imagenes.*.id').isInt({ min: 1 }).bail().withMessage('ID de imágen inválido').toInt(),
  body('imagenes.*.principal').isBoolean().bail().withMessage('Campo principal en imágen inválido').toBoolean(),

  body('imagenes', 'Imágenes inválidas')
    .if(body('imagenes.*.principal').isBoolean())
    .customSanitizer(imagenes => imagenes.sort((imgA, imgB) => Number(Boolean(imgB.principal)) - Number(Boolean(imgA.principal))))
    .custom(validateArrayImagenes),

  validateRequestFields
], updateProduct);


router.delete('/:id', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString())
    .trim(),
  validateJWT,

  param('id', 'ID inválido')
    .notEmpty().bail().withMessage('El ID no puede estar vacío')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdProduct),

  validateRequestFields
], deleteProduct);

module.exports = router;