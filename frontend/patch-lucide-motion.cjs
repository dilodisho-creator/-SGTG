const fs = require('fs');

['dist/index.js', 'dist/index.cjs'].forEach((f) => {
  const file = './node_modules/lucide-motion/' + f;
  let content = fs.readFileSync(file, 'utf8');

  const idx = content.indexOf('var PARENT_HOVER_SELECTOR =');
  if (idx !== -1) {
    const endIdx = content.indexOf(';', idx);
    content =
      content.slice(0, idx) +
      'var PARENT_HOVER_SELECTOR = "[data-motion-icon-group], button, a, [role=\\"button\\"], .group, label, tr";' +
      content.slice(endIdx + 1);
  }

  content = content.replace(
    'const parent = svgRef.current?.closest(PARENT_HOVER_SELECTOR);',
    'const parent = svgRef.current?.closest(PARENT_HOVER_SELECTOR) || svgRef.current;'
  );

  fs.writeFileSync(file, content);
  console.log(f, 'successfully patched!');
});