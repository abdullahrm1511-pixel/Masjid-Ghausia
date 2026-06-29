const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = process.env.NEXT_DIST_DIR || ".next";
const target = path.resolve(projectRoot, distDir);

if (!target.startsWith(projectRoot + path.sep)) {
  throw new Error(`Buildmap staat buiten het project: ${target}`);
}

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
