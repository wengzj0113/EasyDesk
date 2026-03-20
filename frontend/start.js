const { spawn } = require('child_process');
const path = require('path');

const reactScriptsPath = path.join(__dirname, 'node_modules', 'react-scripts', 'bin', 'react-scripts.js');

const child = spawn('node', [reactScriptsPath, 'start'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
