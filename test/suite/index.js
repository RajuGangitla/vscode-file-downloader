const path = require('path');
const Mocha = require('mocha');

const mocha = new Mocha({
    ui: 'tdd',
    color: true
});

const testsRoot = path.resolve(__dirname, '.');

mocha.addFile(path.resolve(testsRoot, 'extension.test.js'));

mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
});