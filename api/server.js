const { handler } = require('../backend/dist/src/serverless.js');

module.exports = async (req, res) => {
  await handler(req, res);
};
