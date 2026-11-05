// CloudFront Function (viewer-request) for the GradeByAI SPA.
//
// Before: every missing S3 object (403/404) was rewritten to /index.html with
// HTTP 200, so /.well-known/*, /api/* typos and any random path answered
// "200 OK" HTML. Crawlers and agent scanners saw soft 404s.
//
// Now: only real client-side routes are rewritten to /index.html. Everything
// else goes to S3 untouched; a missing file returns HTTP 404 (CloudFront still
// serves index.html as the body so the app can render its Not Found page).
//
// Keep SPA_ROUTES in sync with the <Route> list in frontend/src/App.tsx.

var SPA_ROUTES = [
  /^\/$/,
  /^\/analysis\/[^\/]+\/?$/,
  /^\/compare\/?$/,
  /^\/check\/?$/,
  /^\/faq\/?$/,
  /^\/leaderboard\/?$/,
  /^\/guides(\/[a-z0-9-]+)?\/?$/,
  /^\/how-it-works\/?$/,
  /^\/privacy\/?$/,
  /^\/terms\/?$/,
  /^\/admin\/?$/
];

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Markdown for Agents: "Accept: text/markdown" on the home page gets /index.md
  // (generated at build time by frontend/scripts/generate-agent-files.mjs).
  var accept = request.headers.accept ? request.headers.accept.value : '';
  if (uri === '/' && accept.indexOf('text/markdown') !== -1) {
    request.uri = '/index.md';
    return request;
  }

  // Routes first: /analysis/example.com contains a dot but is still an app route.
  for (var i = 0; i < SPA_ROUTES.length; i++) {
    if (SPA_ROUTES[i].test(uri)) {
      request.uri = '/index.html';
      return request;
    }
  }

  // Everything else (static files, /.well-known/*, unknown paths) goes to S3 as is.
  // A missing object comes back as a real 404.
  return request;
}
