const path = require('path');
const fs = require('fs');

const { v4: uuidv4 } = require('uuid');

const cloudinary = require('cloudinary').v2;
cloudinary.config(process.env.CLOUDINARY_URL);

const folder = (process.env.NODE_ENV === 'production') ? 'pasteleria-natalie' : 'pasteleria-natalie/dev';

const getUuidFileName = name => {
  const splitName = name.split('.');
  const extension = splitName[splitName.length - 1];
  const fileName = `${uuidv4()}.${extension}`;
  return fileName;
};

const capitalizeName = (name) => {
  const nameSplit = name.split(' ');
  const nameSplitCapitalized = nameSplit.map(partOfName => {
    const firstLetterCapitalized = partOfName.substring(0, 1).toUpperCase();
    const restOfLetters = partOfName.substring(1).toLowerCase();
    return firstLetterCapitalized + restOfLetters;
  });
  const nameCapitalized = nameSplitCapitalized.join('');
  return nameCapitalized;
};

const getPublicIdFromCloudinaryImageUrl = (urlImgCloudinary) => {
  // https://res.cloudinary.com/digitalsystemda/image/upload/v1659329811/pasteleria-natalie/dev/dea9ozxkd4kcfpjbjmer.jpg
  const splitUrl = urlImgCloudinary.split('/');
  let public_id = '';
  for (let i = 7; i < splitUrl.length; i++) {
    public_id += splitUrl[i] + '/';
  }
  // pasteleria-natalie/dev/dea9ozxkd4kcfpjbjmer.jpg
  [public_id] = public_id.split('.'); // separo entre el path y la extension, porque el public_id es sin la extensión
  // pasteleria-natalie/dev/dea9ozxkd4kcfpjbjmer
  return public_id;
};

const getImgUrlDB = (secure_url) => {
  const urlSplit = secure_url.split('/');
  let imgUrlDB = '';
  for (let i = 6; i < urlSplit.length; i++) {
    imgUrlDB += '/' + urlSplit[i];
  }
  return imgUrlDB;
}


const saveImgCloudinary = async (imgPath) => {
  const absolutePathImg = path.join(__dirname, '../../', imgPath); // vuelvo hasta carpeta src, y completo el path
  try {
    const { public_id, secure_url } = await cloudinary.uploader.upload(absolutePathImg, { folder });
    return { public_id, secure_url };
  } catch (err) {
    console.log(err);
    throw 'Error al subir imágen a cloudinary';
  }
};

const deleteImgCloudinary = async (public_id) => {
  try {
    const { result } = await cloudinary.uploader.destroy(public_id);
    if (result !== 'ok') throw 'Cloudinary no tiro error al borrar una foto, pero no me devolvio el ok';
  } catch (err) {
    console.log(err);
    console.log('Error al borrar una imágen de cloudinary');
  }
};

const deleteTmpFilesBuffers = (files) => {
  const projectRootDirectory = path.join(__dirname, '../../');
  for (const file of files) {
    try {
      fs.unlinkSync(path.join(projectRootDirectory, file.path));
    } catch (err) {
      console.log(err);
      console.log(`Error al borrar el buffer de ${file.originalname}`);
    }
  }
};

module.exports = {
  capitalizeName,
  getUuidFileName,
  saveImgCloudinary,
  deleteImgCloudinary,
  deleteTmpFilesBuffers,
  getPublicIdFromCloudinaryImageUrl,
  getImgUrlDB
};