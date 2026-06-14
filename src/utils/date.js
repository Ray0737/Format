// Format — date/time formatting helpers

window.Format = window.Format || {};

(function () {
  function formatDate(timestamp) {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  Format.formatDate = formatDate;
})();