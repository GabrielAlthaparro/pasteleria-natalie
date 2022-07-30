const indexArrayToObject = (array, key) => array.reduce((acc, el) => {
  acc[el[key]] = el;
  return acc;
}, {});

const indexArrayToObjectWhitArray = (array, key) => {
  const indexedObjectWithArrayInside = array.reduce((acc, el) => {
    if (!acc[el[key]]) acc[el[key]] = [];
    acc[el[key]].push(el);
    return acc;
  }, {});
  return indexedObjectWithArrayInside;
}

module.exports = {
  indexArrayToObject,
  indexArrayToObjectWhitArray
};