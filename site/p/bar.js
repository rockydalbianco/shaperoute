/**
 * Safari's own bar over the page of a post's link, on an iPhone (TASK-482):
 * the page as it comes names the app (`apple-itunes-app` in index.html), and
 * this adds the link itself, which Safari hands to the app when «Open» is
 * touched. Not a module, and loaded in the head without `defer`: it runs
 * while the page is read, before Safari looks at the bar. Only the id after
 * the `#` that has the shape of a drawing's id (ID_PATTERN in view.js) is
 * taken; post.js keeps the bar right after a change of the `#`.
 */
(function () {
  var meta = document.querySelector('meta[name="apple-itunes-app"]');
  var id = String(location.hash || "").replace(/^#/, "");
  var shape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!meta || !shape.test(id)) {
    return;
  }
  var link = location.origin + location.pathname + "#" + id.toLowerCase();
  meta.setAttribute("content", meta.getAttribute("content") + ", app-argument=" + link);
})();
