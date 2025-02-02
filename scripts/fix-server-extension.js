import fs from 'fs';
import path from 'path';

const serverPath = path.join('dist/server/index.js');
const newServerPath = path.join('dist/server/index.cjs');

if (fs.existsSync(serverPath)) {
  fs.renameSync(serverPath, newServerPath);
  console.log('✅ server.js renomeado para server.cjs');
} else {
  console.log('⚠ server.js não encontrado, verifique o build');
}
