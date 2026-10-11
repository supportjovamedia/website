// Isolated from the developer's running localhost and its build folder.
process.env.JOVA_BUILD_DIR = '.next-regression';
process.argv = ['node', 'next', 'start', '--hostname', '127.0.0.1', '--port', '4391'];
await import('next/dist/bin/next');
