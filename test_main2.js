console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);
// Try with explicit electron path
const Module = require('module');
const origLoad = Module._load;
Module._load = function(name, ...args) {
  const r = origLoad.call(this, name, ...args);
  console.log('loaded:', name, typeof r);
  return r;
};
const e = require('electron');
console.log('typeof electron:', typeof e);
