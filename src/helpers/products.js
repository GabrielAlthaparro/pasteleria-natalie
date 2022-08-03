const getImgUrlDB = (secure_url) => {
  const urlSplit = secure_url.split('/');
  let imgUrlDB = '';
  for (let i = 6; i < urlSplit.length; i++) {
    imgUrlDB += '/' + urlSplit[i];
  }
  return imgUrlDB;
}

module.exports = {
  getImgUrlDB
}