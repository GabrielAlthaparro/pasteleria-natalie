const {v4:uuidv4} = require('uuid');

const getUuidFileName = name => {
  const splitName = name.split('.');
  const extension = splitName[splitName.length - 1];
  const fileName = `${uuidv4()}.${extension}`;
  return fileName;
}

const capitalizeName = (name) => {
  const nameSplit = name.split(' ');
  const nameSplitCapitalized = nameSplit.map(partOfName => {
    const firstLetterCapitalized = partOfName.substring(0, 1).toUpperCase();
    const restOfLetters = partOfName.substring(1).toLowerCase();
    return firstLetterCapitalized + restOfLetters;
  });
  const nameCapitalized = nameSplitCapitalized.join('');
  return nameCapitalized;
}

module.exports = {
  capitalizeName,
  getUuidFileName
}