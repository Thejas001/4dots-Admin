const fs = require('fs'); 
const files = ['src/pages/products/new.tsx', 'src/pages/products/[id].tsx']; 
files.forEach(f => { 
  let content = fs.readFileSync(f, 'utf8'); 
  content = content.replace(/border-gray-200 px-3 py-2 text-sm"/g, 'border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"'); 
  content = content.replace(/border-gray-200 px-3 py-2 text-sm disabled:opacity-50"/g, 'border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50"'); 
  content = content.replace(/className="space-y-6"/g, 'className="max-w-5xl mx-auto space-y-8 pb-12"');
  fs.writeFileSync(f, content); 
});
