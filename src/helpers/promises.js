'use strict';
const executeAsyncFunction = (f, textError, ...params) => {
  return new Promise((resolve, reject) => {
    f(...params, (err) => {
      if (err) {
        console.log(err);
        reject(textError);
        return;
      }
      resolve(true);
    })
  })
}

module.exports = {
  executeAsyncFunction
}