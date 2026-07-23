(function() {
  "use strict";

  // Change this value to set the password for the private watchlist.
  var watchlistPassword = "NoPassword"; // I know it is not really protected
  var gate = document.getElementById("watchlist-gate");
  var app = document.getElementById("watchlist-app");
  var passwordForm = document.getElementById("watchlist-password-form");
  var passwordError = document.getElementById("watchlist-password-error");
  var unlocked = sessionStorage.getItem("watchlist-unlocked") === "true";

  function showWatchlist() {
    gate.classList.add("hidden");
    app.classList.remove("hidden");
  }

  if (!unlocked) {
    gate.classList.remove("hidden");
    passwordForm.addEventListener("submit", function(event) {
      event.preventDefault();
      if (document.getElementById("watchlist-password").value === watchlistPassword) {
        sessionStorage.setItem("watchlist-unlocked", "true");
        showWatchlist();
      } else {
        passwordError.classList.remove("hidden");
        document.getElementById("watchlist-password").select();
      }
    });
  } else {
    showWatchlist();
  }

  var storageKey = "robin-watchlist";
  var items = JSON.parse(localStorage.getItem(storageKey) || "[]");
  var currentFilter = "all";
  var currentTag = "all";
  var list = document.getElementById("watchlist-items");
  var count = document.getElementById("watchlist-count");

  items.forEach(function(item) {
    item.tags = item.tags || [];
    if (Array.isArray(item.comments)) {
      item.comments = item.comments.filter(Boolean);
    } else {
      item.comments = item.comments ? [item.comments] : [];
    }
    item.lectureTotal = item.lectureTotal || 1;
    item.lectureProgress = item.lectureProgress || 0;
  });

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(items));
    refreshTagFilter();
  }

  document.getElementById("watchlist-export").addEventListener("click", function() {
    var backup = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(backup);
    var link = document.createElement("a");
    link.href = url;
    link.download = "robin-watchlist-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("watchlist-import").addEventListener("change", function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      try {
        var importedItems = JSON.parse(reader.result);
        if (!Array.isArray(importedItems) || importedItems.some(function(item) {
          return !item || typeof item.title !== "string";
        })) throw new Error("Invalid backup");
        if (items.length && !window.confirm("Replace the current watchlist with this backup?")) return;
        items = importedItems;
        items.forEach(function(item) {
          item.tags = Array.isArray(item.tags) ? item.tags : [];
          item.comments = Array.isArray(item.comments) ? item.comments.filter(Boolean) : [];
          item.lectureTotal = item.lectureTotal || 1;
          item.lectureProgress = item.lectureProgress || 0;
        });
        save();
        render();
      } catch (error) {
        window.alert("That file is not a valid watchlist backup.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  });

  function render() {
    var visibleItems = items.filter(function(item) {
      var statusMatches = currentFilter === "all" || (currentFilter === "completed" ? item.completed : !item.completed);
      var tagMatches = currentTag === "all" || item.tags.indexOf(currentTag) !== -1;
      return statusMatches && tagMatches;
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
          (item.notes ? '<br><span>' + escapeHtml(item.notes) + '</span>' : "") +
          tagsHtml(item.tags) + '</div>' +
        (item.type === "Lecture" ? '<div class="watchlist-progress"><strong>Progress:</strong> lecture <input class="form-control input-sm" type="number" min="0" max="' + item.lectureTotal + '" value="' + item.lectureProgress + '" data-action="progress" data-id="' + item.id + '"> of ' + item.lectureTotal + '</div>' : "") +
        '<label>How much did I like it? <select class="form-control input-sm watchlist-rating" data-action="rating" data-id="' + item.id + '" aria-label="Rating for ' + escapeAttribute(item.title) + '">' +
          '<option value="0">Not rated</option><option value="1">★☆☆☆☆</option><option value="2">★★☆☆☆</option><option value="3">★★★☆☆</option><option value="4">★★★★☆</option><option value="5">★★★★★</option>' +
        '</select></label>' +
        '<div class="watchlist-comments"><label for="comment-' + item.id + '">Add a comment <span class="text-muted">(press Enter to save)</span></label><textarea id="comment-' + item.id + '" class="form-control input-sm" rows="2" data-action="comment" data-id="' + item.id + '" placeholder="What did I think about it?"></textarea>' +
          commentsHtml(item.comments) + '</div>' +
        '<div class="watchlist-actions"><button type="button" class="btn btn-default btn-xs" data-action="edit" data-id="' + item.id + '"><i class="fas fa-edit" aria-hidden="true"></i> Edit</button> ' +
        '<button type="button" class="btn btn-link btn-xs" data-action="delete" data-id="' + item.id + '">Remove</button></div>';
      article.querySelector('[data-action="rating"]').value = item.rating || "0";
      list.appendChild(article);
    });
  }

  function iconFor(type) {
    return type === "Video" ? "play-circle" : type === "Book" ? "book" : type === "Article" ? "file-alt" : type === "Lecture" ? "chalkboard-teacher" : "bookmark";
  }

  function tagsHtml(tags) {
    return tags.length ? '<br>' + tags.map(function(tag) { return '<span class="watchlist-tag">' + escapeHtml(tag) + '</span>'; }).join("") : "";
  }

  function commentsHtml(comments) {
    if (!comments.length) return "";
    return '<div class="watchlist-previous-comments"><strong>Previous comments</strong><ul>' +
      comments.map(function(comment, index) {
        return '<li data-comment-index="' + index + '"><span class="comment-text">' + escapeHtml(comment) + '</span> ' +
          '<button type="button" class="btn btn-link btn-xs comment-edit-button" data-action="edit-comment" data-comment-index="' + index + '">Edit</button></li>';
      }).join("") + '</ul></div>';
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
    if (target.dataset.action === "progress") {
      item.lectureProgress = Math.max(0, Math.min(item.lectureTotal, Number(target.value) || 0));
      item.completed = item.lectureProgress >= item.lectureTotal;
    }
    save();
    render();
  });

  list.addEventListener("keydown", function(event) {
    var target = event.target;
    if (target.dataset.action !== "comment" || event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    var item = items.find(function(entry) { return String(entry.id) === target.dataset.id; });
    var comment = target.value.trim();
    if (!item || !comment) return;
    item.comments.push(comment);
    save();
    render();
  });

  list.addEventListener("click", function(event) {
    var actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    var action = actionTarget.dataset.action;
    if (action === "edit-comment") {
      var commentItem = actionTarget.closest(".watchlist-item");
      var commentRow = actionTarget.closest("li");
      var commentId = commentItem.querySelector("[data-id]").dataset.id;
      var comment = items.find(function(item) { return String(item.id) === commentId; }).comments[Number(actionTarget.dataset.commentIndex)];
      commentRow.innerHTML = '<textarea class="form-control input-sm comment-edit-input" rows="2">' + escapeHtml(comment) + '</textarea> ' +
        '<button type="button" class="btn btn-primary btn-xs" data-action="save-comment" data-comment-index="' + actionTarget.dataset.commentIndex + '">Save</button> ' +
        '<button type="button" class="btn btn-default btn-xs" data-action="cancel-comment">Cancel</button>';
      commentRow.querySelector("textarea").focus();
      return;
    } else if (action === "save-comment") {
      var saveItem = actionTarget.closest(".watchlist-item");
      var saveId = saveItem.querySelector("[data-id]").dataset.id;
      var saveComment = items.find(function(item) { return String(item.id) === saveId; });
      var editedComment = actionTarget.closest("li").querySelector("textarea").value.trim();
      if (editedComment) saveComment.comments[Number(actionTarget.dataset.commentIndex)] = editedComment;
      save();
      render();
      return;
    } else if (action === "cancel-comment") {
      render();
      return;
    } else if (action === "delete") {
      items = items.filter(function(item) { return String(item.id) !== actionTarget.dataset.id; });
    } else if (action === "edit") {
      renderEdit(actionTarget.dataset.id);
      return;
    } else {
      return;
    }
    save();
    render();
  });

  function renderEdit(id) {
    var item = items.find(function(entry) { return String(entry.id) === id; });
    var article = list.querySelector('[data-id="' + id + '"]').closest(".watchlist-item");
    article.innerHTML = '<form class="watchlist-edit-form row" data-edit-id="' + item.id + '">' +
      '<div class="form-group col-sm-6"><label>Title</label><input class="form-control" name="title" required value="' + escapeAttribute(item.title) + '"></div>' +
      '<div class="form-group col-sm-3"><label>Type</label><select class="form-control" name="type"><option>Article</option><option>Video</option><option>Book</option><option>Lecture</option><option>Other</option></select></div>' +
      '<div class="form-group col-sm-3"><label>Link</label><input class="form-control" name="link" type="url" value="' + escapeAttribute(item.link) + '"></div>' +
      '<div class="form-group col-sm-9"><label>Notes</label><input class="form-control" name="notes" value="' + escapeAttribute(item.notes) + '"></div>' +
      '<div class="form-group col-sm-6"><label>Tags <span class="text-muted">(comma-separated)</span></label><input class="form-control" name="tags" value="' + escapeAttribute(item.tags.join(", ")) + '"></div>' +
      '<div class="form-group col-sm-3 edit-lecture-total' + (item.type === "Lecture" ? "" : " hidden") + '"><label>Number of lectures</label><input class="form-control" name="lectureTotal" type="number" min="1" value="' + item.lectureTotal + '"></div>' +
      '<div class="form-group col-sm-12"><button class="btn btn-primary btn-sm" type="submit">Save changes</button> <button class="btn btn-default btn-sm" type="button" data-action="cancel-edit">Cancel</button></div></form>';
    article.querySelector('[name="type"]').value = item.type;
    article.querySelector('[name="type"]').addEventListener("change", function() {
      article.querySelector(".edit-lecture-total").classList.toggle("hidden", this.value !== "Lecture");
    });
  }

  list.addEventListener("submit", function(event) {
    if (!event.target.classList.contains("watchlist-edit-form")) return;
    event.preventDefault();
    var form = event.target;
    var item = items.find(function(entry) { return String(entry.id) === form.dataset.editId; });
    item.title = form.elements.title.value.trim();
    item.type = form.elements.type.value;
    item.link = form.elements.link.value.trim();
    item.notes = form.elements.notes.value.trim();
    item.tags = form.elements.tags.value.split(",").map(function(tag) { return tag.trim(); }).filter(Boolean);
    if (item.type === "Lecture" && form.elements.lectureTotal) {
      item.lectureTotal = Math.max(1, Number(form.elements.lectureTotal.value) || 1);
      item.lectureProgress = Math.min(item.lectureProgress, item.lectureTotal);
      item.completed = item.lectureProgress >= item.lectureTotal;
    }
    save();
    render();
  });

  list.addEventListener("click", function(event) {
    var actionTarget = event.target.closest("[data-action]");
    if (actionTarget && actionTarget.dataset.action === "cancel-edit") render();
  });

  document.querySelectorAll("[data-filter]").forEach(function(button) {
    button.addEventListener("click", function() {
      currentFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(function(filterButton) { filterButton.classList.remove("active"); });
      button.classList.add("active");
      render();
    });
  });

  document.getElementById("tag-filter").addEventListener("change", function(event) {
    currentTag = event.target.value;
    render();
  });

  function refreshTagFilter() {
    var tagFilter = document.getElementById("tag-filter");
    var tags = [];
    items.forEach(function(item) { item.tags.forEach(function(tag) { if (tags.indexOf(tag) === -1) tags.push(tag); }); });
    tags.sort();
    tagFilter.innerHTML = '<option value="all">All tags</option>' + tags.map(function(tag) { return '<option value="' + escapeAttribute(tag) + '">' + escapeHtml(tag) + '</option>'; }).join("");
    if (currentTag !== "all" && tags.indexOf(currentTag) === -1) currentTag = "all";
    tagFilter.value = currentTag;
  }

  document.getElementById("watchlist-form").addEventListener("submit", function(event) {
    event.preventDefault();
    items.push({
      id: Date.now(),
      title: document.getElementById("item-title").value.trim(),
      type: document.getElementById("item-type").value,
      link: document.getElementById("item-link").value.trim(),
      notes: document.getElementById("item-notes").value.trim(),
      tags: document.getElementById("item-tags").value.split(",").map(function(tag) { return tag.trim(); }).filter(Boolean),
      comments: document.getElementById("item-comments").value.trim() ? [document.getElementById("item-comments").value.trim()] : [],
      lectureTotal: Number(document.getElementById("item-lecture-total").value) || 1,
      lectureProgress: 0,
      completed: false,
      rating: 0
    });
    save();
    event.target.reset();
    $(".lecture-only").addClass("hidden");
    render();
  });

  $("#item-type").on("change", function() {
    $(".lecture-only").toggleClass("hidden", this.value !== "Lecture");
  });

  $("#navbar-include").load("navbar.html", function() {
    $("#home, #projects, #research").removeClass("active");
  });
  refreshTagFilter();
  render();
}());