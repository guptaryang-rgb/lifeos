try {
  const rel = require('./.next/server/app/page.js');
  console.log("Rel success!");
} catch (e) {
  console.log("Rel failed:", e);
}

try {
  const abs = require('C:\\Users\\gupta_ikq631n\\teamwork_projects\\lifeos\\.next\\server\\app\\page.js');
  console.log("Abs success!");
} catch (e) {
  console.log("Abs failed:", e.stack);
}
