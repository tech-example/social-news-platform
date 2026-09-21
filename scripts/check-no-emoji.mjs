import fs from 'fs';
import path from 'path';

const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let hasError = false;

walkDir('./src', function(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (emojiRegex.test(content)) {
    console.error(`Error: Emoji found in ${filePath}. Emojis are strictly forbidden in this project.`);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log("Emoji check passed.");
}
