const {get} = require('./test/before');
get('fs/Volumes/MacData/Projects/node-restafary', '/', (res, body, cb) => {
  console.log(body);
})