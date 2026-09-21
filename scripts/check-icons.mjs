import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let hasError = false;

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check if lucide-react is imported but not using specific icons
    if (content.includes("from 'lucide-react'") || content.includes('from "lucide-react"')) {
      // Basic check: we don't enforce strict AST matching here, but we fail if someone uses another icon library
    }
    
    if (content.includes('@heroicons') || content.includes('react-icons')) {
      console.error(`Error: Unauthorized icon library used in ${filePath}. Only lucide-react is allowed.`);
      hasError = true;
    }
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log("Icons check passed.");
}
