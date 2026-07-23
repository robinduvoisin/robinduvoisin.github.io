(function() {
  "use strict";

  var storageKey = "robin-watchlist";
  var items = JSON.parse(localStorage.getItem(storageKey) || "[]");
  var currentFilter = "all";
  var list = document.getElementById("watchlist-items");
  var count = document.getElementById("watchlist-count");

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function render() {
    var visibleItems = items.filter(function(item) {
      return currentFilter === "all" || (currentFilter === "completed" ? item.completed : !item.completed);
    });
    list.innerHTML = "";
    count.textContent = items.length + " item" + (items.length === 1 ? "" : "s") +
      " · " + items.filter(function(item) { return item.completed; }).length + " completed";

    if (!visibleItems.length) {
      list.innerHTML = '<p class="watchlist-empty">Nothing here yet. Add an article or video below.</p>';
      return;
    }

    visibleItems.forEach(function(item) {
      var article = document.createElement("article");
      article.className = "watchlist-item" + (item.completed ? " is-complete" : "");
      article.innerHTML =
        '<div class="checkbox"><label><input type="checkbox" data-action="complete" data-id="' + item.id + '" ' + (item.completed ? "checked" : "") + '> ' +
          '<span class="watchlist-title">' + escapeHtml(item.title) + '</span></label></div>' +
        '<div class="watchlist-meta"><i class="fas fa-' + iconFor(item.type) + '" aria-hidden="true"></i> ' + escapeHtml(item.type) +
          (item.link ? ' · <a href="' + escapeAttribute(item.link) + '" target="_blank" rel="noopener noreferrer">Open link</a>' : "") +
          (item.notes ? '<br><span>' + escapeHtml(item.notes) + '</span>' : "") + '</div>' +
        '<label>How much did I like it? <select class="form-control input-sm watchlist-rating" data-action="rating" data-id="' + item.id + '" aria-label="Rating for ' + escapeAttribute(item.title) + '">' +
          '<option value="0">Not rated</option><option value="1">★☆☆☆☆</option><option value="2">★★☆☆☆</option><option value="3">★★★☆☆</option><option value="4">★★★★☆</option><option value="5">★★★★★</option>' +
        '</select></label> <button type="button" class="btn btn-link btn-xs pull-right" data-action="delete" data-id="' + item.id + '">Remove</button>';
      article.querySelector('[data-action="rating"]').value = item.rating || "0";
      list.appendChild(article);
    });
  }

  function iconFor(type) {
    return type === "Video" ? "play-circle" : type === "Book" ? "book" : type === "Article" ? "file-alt" : "bookmark";
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  list.addEventListener("change", function(event) {
    var target = event.target;
    var item = items.find(function(entry) { return String(entry.id) === target.dataset.id; });
    if (!item) return;
    if (target.dataset.action === "complete") item.completed = target.checked;
    if (target.dataset.action === "rating") item.rating = target.value;
    save();
    render();
  });

  list.addEventListener("click", function(event) {
    if (event.target.dataset.action !== "delete") return;
    items = items.filter(function(item) { return String(item.id) !== event.target.dataset.id; });
    save();
    render();
  });

  document.querySelectorAll("[data-filter]").forEach(function(button) {
    button.addEventListener("click", function() {
      currentFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(function(filterButton) { filterButton.classList.remove("active"); });
      button.classList.add("active");
      render();
    });
  });

  document.getElementById("watchlist-form").addEventListener("submit", function(event) {
    event.preventDefault();
    items.push({
      id: Date.now(),
      title: document.getElementById("item-title").value.trim(),
      type: document.getElementById("item-type").value,
      link: document.getElementById("item-link").value.trim(),
      notes: document.getElementById("item-notes").value.trim(),
      completed: false,
      rating: 0
    });
    save();
    event.target.reset();
    render();
  });

  $("#navbar-include").load("navbar.html", function() {
    $("#home, #projects, #research").removeClass("active");
  });
  render();
}());