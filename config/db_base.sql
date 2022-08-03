-- phpMyAdmin SQL Dump
-- version 4.7.1
-- https://www.phpmyadmin.net/
--
-- Host: sql10.freemysqlhosting.net
-- Generation Time: Jul 30, 2022 at 09:15 AM
-- Server version: 5.5.62-0ubuntu0.14.04.1
-- PHP Version: 7.0.33-0ubuntu0.16.04.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sql10508968`
--

-- --------------------------------------------------------

--
-- Table structure for table `consultas`
--

CREATE TABLE `consultas` (
  `id_mensaje` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `imagenes`
--

CREATE TABLE `imagenes` (
  `id` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `path` varchar(150) COLLATE utf8_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mensajes`
--

CREATE TABLE `mensajes` (
  `id` int(11) NOT NULL,
  `mail` varchar(70) COLLATE utf8_spanish_ci NOT NULL,
  `nombre` varchar(70) COLLATE utf8_spanish_ci NOT NULL,
  `aclaraciones` text COLLATE utf8_spanish_ci NOT NULL,
  `fecha` varchar(10) COLLATE utf8_spanish_ci NOT NULL,
  `visto` bit(1) NOT NULL DEFAULT b'0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) COLLATE utf8_spanish_ci NOT NULL,
  `tipo` int(11) NOT NULL,
  `cantidad_consultas` int(11) NOT NULL DEFAULT '0',
  `descripcion` text COLLATE utf8_spanish_ci NOT NULL,
  `imagen` varchar(150) COLLATE utf8_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tipos`
--

CREATE TABLE `tipos` (
  `id` int(11) NOT NULL,
  `descripcion` varchar(70) COLLATE utf8_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

--
-- Dumping data for table `tipos`
--

INSERT INTO `tipos` (`id`, `descripcion`) VALUES
(1, 'tradicional'),
(2, 'rico y saludable');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `mail` varchar(50) COLLATE utf8_spanish_ci NOT NULL,
  `nombre` varchar(50) COLLATE utf8_spanish_ci NOT NULL,
  `apellido` varchar(50) COLLATE utf8_spanish_ci NOT NULL,
  `password` varchar(100) COLLATE utf8_spanish_ci NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`mail`, `nombre`, `apellido`, `password`) VALUES
('nataliepasteleria.artesanal@gmail.com', 'Natalia', 'Soria', '$2b$10$0O2N9y0NyiVaZI7WavIwv.VOY95QGqSA48PdNRJ5jHjblqSvC6pxC');


--
-- Views
--

CREATE VIEW `get_all_products` AS (SELECT `p`.`id` AS `id`, `nombre`,`p`.`descripcion` AS `descripcion`, `imagen`,`p`.`tipo` AS `idTipo`,`t`.`descripcion` AS `tipo`,`p`.`cantidad_consultas` AS `cantidadConsultas` FROM (`productos` `p` join `tipos` `t` ON`p`.`tipo` = `t`.`id`));


--
-- Indexes for dumped tables
--

--
-- Indexes for table `consultas`
--
ALTER TABLE `consultas`
  ADD PRIMARY KEY (`id_mensaje`,`id_producto`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indexes for table `imagenes`
--
ALTER TABLE `imagenes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_producto_ibfk` (`id_producto`);

--
-- Indexes for table `mensajes`
--
ALTER TABLE `mensajes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tipo_ibfk` (`tipo`);

--
-- Indexes for table `tipos`
--
ALTER TABLE `tipos`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`mail`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `imagenes`
--
ALTER TABLE `imagenes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `mensajes`
--
ALTER TABLE `mensajes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tipos`
--
ALTER TABLE `tipos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `consultas`
--
ALTER TABLE `consultas`
  ADD CONSTRAINT `consultas_ibfk_1` FOREIGN KEY (`id_mensaje`) REFERENCES `mensajes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `consultas_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `imagenes`
--
ALTER TABLE `imagenes`
  ADD CONSTRAINT `imagenes_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`tipo`) REFERENCES `tipos` (`id`) ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
