<<<<<<< HEAD
const { Router} = require('express');

const { body } = require('express-validator');

const validateRequestFields = require('../helpers/validate-request-fields');

const { signIn } = require('../controllers/auth.controller');

const router = Router();

router.post('/signin', [
  body('password', 'Contraseña inválida')
    .notEmpty().bail().withMessage('Ingrese su contraseña')
    .customSanitizer(value => value.toString()),
  validateRequestFields
], signIn);

module.exports = router;
=======
const router = require('express').Router();
const authController = require('../controllers/auth.controller');

router.post('/signin', authController.signin);

module.exports = router;
>>>>>>> f8f303f0938b4c235d8608d112c4b8086a4bf67a
