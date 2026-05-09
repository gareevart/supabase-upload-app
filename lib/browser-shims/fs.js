// Browser shim for Node.js `fs` module.
// @diplodoc/transform (aikit peer dep) imports utilsFS which statically
// references `fs`, but never calls it in the browser path.
// This shim prevents bundler errors while keeping the API intact.
const noop = () => {};
const asyncNoop = async () => {};

const promises = {
  readFile: asyncNoop,
  writeFile: asyncNoop,
  mkdir: asyncNoop,
  stat: asyncNoop,
  readdir: async () => [],
  access: asyncNoop,
};

module.exports = {
  readFileSync: () => '',
  writeFileSync: noop,
  existsSync: () => false,
  readdirSync: () => [],
  mkdirSync: noop,
  statSync: () => ({ isDirectory: () => false, isFile: () => false }),
  promises,
};
