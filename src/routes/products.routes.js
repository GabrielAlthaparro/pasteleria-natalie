const { Router } = require('express');

const multer = require('multer')
const upload = multer({ dest: './src/uploads' });

const { header, param, body } = require('express-validator');

const {
  validateReqFilesNotEmpty,
  validateReqFilesExtensions,
  validateJWT
} = require('../middlewares')

const { validateExistsIdTipo, validateExistsIdProduct } = require('../helpers/db-validators');
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
    .isNumeric().bail()
    .toInt().bail()
    .custom(validateExistsIdTipo),
  body('offset', 'Offset inválido').optional()
    .isNumeric().bail()
    .toInt().bail()
    .custom(value => (value >= 0) ? true : false),
  body('limite', 'Límite inválido').optional()
    .isNumeric().bail()
    .toInt().bail()
    .custom(value => (value >= 0) ? true : false),

  validateRequestFields
], getProducts);

router.post('/', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString()),
  validateJWT,

  upload.array('imagenes'), // aca se cargan los campos de texto también, o sea todos los campos del body del formdata, si no mandan ningun campo, entonces req.files = undefined
  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString())
    .matches(/^[a-zñáéíóúü0-9 ]*$/gi).bail().withMessage('Caracteres inválidos')
    .trim()
    .toLowerCase()
    .isLength({ max: 50 }).bail().withMessage('Máximo 50 caracteres'),
  body('tipo', 'Tipo inválido')
    .notEmpty().bail().withMessage('El tipo es obligatorio')
    .isNumeric().bail()
    .toInt().bail()
    .custom(validateExistsIdTipo),
  body('descripcion', 'Descripción inválida')
    .notEmpty().bail().withMessage('Ingrese una descripción')
    .customSanitizer(value => value.toString())
    .matches(/^[a-zñáéíóúü0-9,\. ]*$/gi).bail().withMessage('Caracteres inválidos')
    .trim()
    .toLowerCase()
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),

  validateReqFilesNotEmpty('imagenes'),
  validateReqFilesExtensions('imagenes', ['jpg', 'png', 'jpeg', 'webp', 'gif']),

  validateRequestFields
], createProduct);

router.put('/:id', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString()),
  validateJWT,

  param('id', 'ID inválido')
    .notEmpty().bail().withMessage('El ID no puede estar vacío')
    .customSanitizer(value => Number.parseInt(Number(value)))
    .custom(value => !isNaN(value)).bail().withMessage('El ID debe ser un valor numérico')
    .custom(validateExistsIdProduct),

  upload.array('imagenes'),
  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString())
    .matches(/^[a-zñ0-9 ]*$/gi).bail().withMessage('Caracteres inválidos')
    .trim()
    .toLowerCase()
    .isLength({ max: 50 }).bail().withMessage('Máximo 50 caracteres'),
  body('tipo', 'Tipo inválido')
    .notEmpty().bail().withMessage('El tipo es obligatorio')
    .isNumeric().bail()
    .toInt().bail()
    .custom(validateExistsIdTipo),
  body('descripcion', 'Descripción inválida')
    .notEmpty().bail().withMessage('Ingrese una descripción')
    .customSanitizer(value => value.toString())
    .matches(/^[a-zñ0-9,\. ]*$/gi).bail().withMessage('Caracteres inválidos')
    .trim()
    .toLowerCase()
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),

  validateReqFilesExtensions('imagenes', ['jpg', 'png', 'jpeg', 'webp', 'gif']),

  validateRequestFields
], updateProduct);

router.delete('/:id', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString()),
  validateJWT,

  param('id', 'ID inválido')
    .notEmpty().bail().withMessage('El ID no puede estar vacío')
    .customSanitizer(value => Number.parseInt(Number(value)))
    .custom(value => !isNaN(value)).bail().withMessage('El ID debe ser un valor numérico')
    .custom(validateExistsIdProduct),

  validateRequestFields
], deleteProduct);

module.exports = router;