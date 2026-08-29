const https = require('https');
https.get('https://ave-vert.vercel.app/auth', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if(match) {
      https.get('https://ave-vert.vercel.app' + match[1], (jsRes) => {
        let js = '';
        jsRes.on('data', d => js += d);
        jsRes.on('end', () => {
          const supabaseMatch = js.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.(co|com|in|net)/);
          console.log('Found Supabase URL in JS:', supabaseMatch ? supabaseMatch[0] : 'None');
        });
      });
    } else {
      console.log('JS file not found');
    }
  });
});
