const fs = require('fs');
const path = require('path');

const dir = 'd:/SMKAW02PDN/Laporan PKL/Project/vcf/vcf-github-rinko/fe/src/app/(dashboard)/master';
const files = fs.readdirSync(dir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(dir, d.name, 'page.tsx'));

files.push('d:/SMKAW02PDN/Laporan PKL/Project/vcf/vcf-github-rinko/fe/src/app/(dashboard)/vcf/list/page.tsx');

let changedFiles = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace ID in exportHeaders for user/page.tsx which does it differently
  if (file.includes('users')) {
    content = content.replace(/const headers = \["ID", /g, 'const headers = ["No.", ');
    content = content.replace(/const dataArr = data\.map\(\(u\) => \[\n\s*u\.id,/g, 'const dataArr = data.map((u, index) => [\n                    index + 1,');
  } 
  else {
    // Normal single-line exportToExcel calls
    // Replace: exportToExcel("Name", ["ID", ...], data.map(v => [v.id, ...]))
    content = content.replace(/exportToExcel\(([^,]+),\s*\["ID"/g, 'exportToExcel($1, ["No."');
    
    // Replace: data.map(v => [v.id,
    // Or: data.map(i => [i.id,
    content = content.replace(/data\.map\(\s*([a-zA-Z0-9_]+)\s*=>\s*\[\s*\1\.id\s*,/g, 'data.map(($1, index) => [index + 1,');
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log('Updated', file);
  }
}
console.log('Total files changed:', changedFiles);
