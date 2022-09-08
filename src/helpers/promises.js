const execAsyncFunction = (func, ...params) => {
  return new Promise((resolve, reject) => {
    func(...params, (err, ...results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    })
  });
};

module.exports = { execAsyncFunction };