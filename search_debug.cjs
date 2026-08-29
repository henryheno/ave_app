const https = require('https');
https.get('https://ave-vert.vercel.app/auth', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const regex = /src="(\/assets\/[^"]+\.js)"/g;
    let match;
    const urls = [];
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[1]);
    }
    console.log('Found JS files:', urls.length);
    urls.forEach(url => {
      https.get('https://ave-vert.vercel.app' + url, (jsRes) => {
        let js = '';
        jsRes.on('data', d => js += d);
        jsRes.on('end', () => {
          if (js.includes('DEBUG URL')) {
            console.log('FOUND DEBUG URL IN', url);
            const excerpt = js.substring(js.indexOf('DEBUG URL'), js.indexOf('DEBUG URL') + 100);
            console.log(excerpt);
          }
        });
      });
    });
  });
});
