const fs = require('fs');
try {
  if (fs.existsSync('./app/(farmer)/tasks.tsx')) {
    fs.unlinkSync('./app/(farmer)/tasks.tsx');
    console.log('Deleted (farmer)/tasks.tsx');
  }
  if (fs.existsSync('./app/(supervisor)/tasks.tsx')) {
    fs.unlinkSync('./app/(supervisor)/tasks.tsx');
    console.log('Deleted (supervisor)/tasks.tsx');
  }
  if (fs.existsSync('./app/(owner)/tasks.tsx')) {
    fs.unlinkSync('./app/(owner)/tasks.tsx');
    console.log('Deleted (owner)/tasks.tsx');
  }
} catch (e) {
  console.error(e);
}
