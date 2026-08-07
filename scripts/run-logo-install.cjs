const Module = require('module');
const path = require('path');
const { pathToFileURL } = require('url');
const monorepoModules = path.join(
  'C:',
  'Users',
  'Michael.Savitsky',
  'move-trust-hub-temp',
  'node_modules'
);
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return orig.call(this, request, parent, isMain, options);
  } catch (e) {
    if (request === 'sharp') {
      return orig.call(this, request, parent, isMain, {
        paths: [monorepoModules],
      });
    }
    throw e;
  }
};
import(pathToFileURL(path.join(__dirname, 'install-ith-final-logo.mjs')).href).catch((err) => {
  console.error(err);
  process.exit(1);
});
