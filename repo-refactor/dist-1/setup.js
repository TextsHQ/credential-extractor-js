const setup = require('setup');

setup({
    name: 'browser-cookie3',
    version: '0.17.1',
    packages: ['browser_cookie3'],
    package_dir: {'browser_cookie3': '.'},
    author: 'Boris Babic',
    author_email: 'boris.ivan.babic@gmail.com',
    description: 'Loads cookies from your browser into a cookiejar object so can download with urllib and other libraries the same content you see in the web browser.',
    url: 'https://github.com/borisbabic/browser_cookie3',
    install_requires: [
        'lz4',
        'pycryptodomex',
        `dbus-python; python_version < "3.7" && ("bsd" in sys_platform || sys_platform === "linux")`,
        `jeepney; python_version >= "3.7" && ("bsd" in sys_platform || sys_platform === "linux")`,
    ],
    license: 'lgpl',
});