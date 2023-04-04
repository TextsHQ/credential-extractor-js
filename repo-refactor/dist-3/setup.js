const { writeFileSync } = require('fs');
const { join } = require('path');

const packageInfo = {
  name: 'browser-cookie3',
  version: '0.17.1',
  main: 'index.js',
  repository: {
    type: 'git',
    url: 'https://github.com/borisbabic/browser_cookie3'
  },
  author: {
    name: 'Boris Babic',
    email: 'boris.ivan.babic@gmail.com'
  },
  description:
    'Loads cookies from your browser into a cookiejar object so you can download with urllib and other libraries the same content you see in the web browser.',
  license: 'LGPL',
  dependencies: {
    'better-sqlite3': '^7.4.0',
    'tough-cookie': '^4.0.0'
  },
  optionalDependencies: {
    'lz4': '^0.6.0',
    'pycryptodomex': '^3.10.1',
    'dbus-python':
      'github:dbus-python/dbus-python#2.2.0; python_version < "3.7" and ("bsd" in sys_platform or sys_platform == "linux")',
    jeepney:
      'github:Stebalien/jeepney#0.6.0; python_version >= "3.7" and ("bsd" in sys_platform or sys_platform == "linux")'
  }
};

writeFileSync(join(__dirname, 'package.json'), JSON.stringify(packageInfo, null, 2));