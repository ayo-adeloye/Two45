export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = new URL('https://5412063a.two45.pages.dev');
    origin.pathname = url.pathname;
    origin.search = url.search;
    const upstream = await fetch(new Request(origin.toString(), request));
    const type = upstream.headers.get('content-type') || '';
    if (!type.includes('text/html')) return upstream;
    let html = await upstream.text();
    const patch = '<style id="two45-single-ask-fix">button.analyze{display:none!important}</style>';
    html = html.includes('</head>') ? html.replace('</head>', patch + '</head>') : patch + html;
    const headers = new Headers(upstream.headers);
    headers.delete('content-length');
    return new Response(html, { status: upstream.status, headers });
  }
};
