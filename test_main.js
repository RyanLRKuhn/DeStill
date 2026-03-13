const e = require('electron');
console.log('typeof electron:', typeof e);
console.log('electron keys:', typeof e === 'object' ? Object.keys(e).slice(0, 5) : 'not object');
console.log('app:', typeof e.app);
