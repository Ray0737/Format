// Format — initial document HTML per template type

window.Format = window.Format || {};

(function () {
  function blank() {
    return "<p><br></p>";
  }

  function table() {
    const headerCells = Array.from({ length: 4 }, (_, i) => `<th contenteditable="true">Column ${i + 1}</th>`).join("");
    const bodyRow = `<tr>${Array.from({ length: 4 }, () => `<td contenteditable="true"><br></td>`).join("")}</tr>`;
    const bodyRows = Array.from({ length: 3 }, () => bodyRow).join("");
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  function todo() {
    const items = ["First task", "Second task", "Third task"]
      .map((label) => `<li class="todo-item"><input type="checkbox"><span class="todo-text" contenteditable="true">${label}</span></li>`)
      .join("");
    return `<ul class="todo-list" data-todo="true">${items}</ul>`;
  }

  function pdf() {
    return (
      '<div class="pdf-import-placeholder" data-pdf-import="true">' +
      '<div class="pdf-import-icon"></div>' +
      "<p class=\"pdf-import-title\">Import a PDF</p>" +
      '<p class="pdf-import-hint">Each page becomes an annotatable background. Use Draw mode to write on top.</p>' +
      '<label class="pdf-import-btn">Choose PDF<input type="file" accept="application/pdf" hidden></label>' +
      "</div>"
    );
  }

  // `table` and `todo` are no longer offered as standalone doc types (the
  // checklist is now a toolbar insert), but the generators are retained so any
  // pre-existing docs of those types still open correctly.
  const GENERATORS = { blank, table, todo, pdf };

  function generate(type) {
    const generator = GENERATORS[type] ?? GENERATORS.blank;
    return generator();
  }

  Format.Templates = { generate };
})();