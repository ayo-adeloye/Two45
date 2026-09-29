export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const origin = new URL('https://two45-live-worker.adekunlasia.workers.dev');
      origin.pathname = url.pathname;
      origin.search = url.search;
      return fetch(new Request(origin.toString(), request));
    }

    return env.ASSETS.fetch(request);
  }
};
