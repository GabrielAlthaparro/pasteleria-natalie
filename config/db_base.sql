-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 08-09-2022 a las 06:04:32
-- Versión del servidor: 5.7.31
-- Versión de PHP: 7.4.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pasteleria_natalie`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `imagenes`
--

DROP TABLE IF EXISTS `imagenes`;
CREATE TABLE IF NOT EXISTS `imagenes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_producto` int(11) NOT NULL,
  `path` varchar(150) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `principal` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  KEY `id_producto_ibfk` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `invalid_tokens`
--

DROP TABLE IF EXISTS `invalid_tokens`;
CREATE TABLE IF NOT EXISTS `invalid_tokens` (
  `token` varchar(200) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`token`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes`
--

DROP TABLE IF EXISTS `mensajes`;
CREATE TABLE IF NOT EXISTS `mensajes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(70) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `nombre` varchar(70) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `aclaraciones` text COLLATE utf8mb4_0900_ai_ci,
  `fecha` varchar(10) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_productos`
--

DROP TABLE IF EXISTS `mensajes_productos`;
CREATE TABLE IF NOT EXISTS `mensajes_productos` (
  `id_mensaje` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  PRIMARY KEY (`id_mensaje`,`id_producto`),
  KEY `id_producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE IF NOT EXISTS `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `id_tipo` int(11) NOT NULL,
  `cantidad_consultas` int(11) NOT NULL DEFAULT '0',
  `descripcion` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tipo_ibfk` (`id_tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos`
--

DROP TABLE IF EXISTS `tipos`;
CREATE TABLE IF NOT EXISTS `tipos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(70) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tipos`
--

INSERT INTO `tipos` (`id`, `descripcion`) VALUES
(1, 'tradicional'),
(2, 'rico y saludable');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE IF NOT EXISTS `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `apellido` varchar(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(100) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id`, `email`, `nombre`, `apellido`, `password`) VALUES
(1, 'nataliepasteleria.artesanal@gmail.com', 'Natalia', 'Soria', '$2b$10$0O2N9y0NyiVaZI7WavIwv.VOY95QGqSA48PdNRJ5jHjblqSvC6pxC');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tokens`
--

DROP TABLE IF EXISTS `user_tokens`;
CREATE TABLE IF NOT EXISTS `user_tokens` (
  `id_user` int(11) NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id_user`,`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `imagenes`
--
ALTER TABLE `imagenes`
  ADD CONSTRAINT `imagenes_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `mensajes_productos`
--
ALTER TABLE `mensajes_productos`
  ADD CONSTRAINT `mensajes_productos_ibfk_1` FOREIGN KEY (`id_mensaje`) REFERENCES `mensajes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mensajes_productos_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_tipo`) REFERENCES `tipos` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `user_tokens`
--
ALTER TABLE `user_tokens`
  ADD CONSTRAINT `user_tokens_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
