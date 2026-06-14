// Format — document store: localStorage index + IndexedDB content

window.Format = window.Format || {};

(function () {
  const STORAGE_KEY = "format.documents";
  const DB_NAME = "format-db";
  const DB_VERSION = 2;
  const CONTENT_STORE = "content";
  const STROKES_STORE = "strokes";

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CONTENT_STORE)) {
          db.createObjectStore(CONTENT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STROKES_STORE)) {
          db.createObjectStore(STROKES_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  // doc shape: { id, title, type, updatedAt }
  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const docs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(docs)) return [];
      return docs.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    } catch (err) {
      console.error("Format.DocStore.getAll failed", err);
      return [];
    }
  }

  function writeAll(docs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }

  function getDoc(id) {
    return getAll().find((doc) => doc.id === id) ?? null;
  }

  function generateId() {
    return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function createDoc(type, title) {
    const doc = {
      id: generateId(),
      title: title?.trim() || "Untitled",
      type,
      updatedAt: Date.now(),
    };
    writeAll([...getAll(), doc]);
    saveContent(doc.id, Format.Templates.generate(type));
    return doc;
  }

  function renameDoc(id, title) {
    const docs = getAll();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    doc.title = title?.trim() || "Untitled";
    doc.updatedAt = Date.now();
    writeAll(docs);
  }

  function deleteDoc(id) {
    writeAll(getAll().filter((doc) => doc.id !== id));
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(CONTENT_STORE, "readwrite");
          tx.objectStore(CONTENT_STORE).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function saveContent(id, html) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(CONTENT_STORE, "readwrite");
          tx.objectStore(CONTENT_STORE).put({ id, html });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function loadContent(id) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(CONTENT_STORE, "readonly");
          const request = tx.objectStore(CONTENT_STORE).get(id);
          request.onsuccess = () => resolve(request.result?.html ?? "");
          request.onerror = () => reject(request.error);
        })
    );
  }

  // Ink strokes are stored separately from the HTML content, keyed by doc id
  // (Phase 8 will populate `strokes` with per-page pen stroke data).
  function saveStrokes(id, strokes) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STROKES_STORE, "readwrite");
          tx.objectStore(STROKES_STORE).put({ id, strokes });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function loadStrokes(id) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STROKES_STORE, "readonly");
          const request = tx.objectStore(STROKES_STORE).get(id);
          request.onsuccess = () => resolve(request.result?.strokes ?? null);
          request.onerror = () => reject(request.error);
        })
    );
  }

  // Copies a document's metadata, content, and ink strokes (if any) into a
  // new document, appended to the top of the home grid.
  function duplicateDoc(id) {
    const doc = getDoc(id);
    if (!doc) return Promise.resolve(null);

    const copy = {
      id: generateId(),
      title: `${doc.title} (Copy)`,
      type: doc.type,
      updatedAt: Date.now(),
    };
    writeAll([...getAll(), copy]);

    return Promise.all([loadContent(id), loadStrokes(id)]).then(([html, strokes]) => {
      const tasks = [saveContent(copy.id, html)];
      if (strokes) tasks.push(saveStrokes(copy.id, strokes));
      return Promise.all(tasks);
    }).then(() => copy);
  }

  Format.DocStore = {
    STORAGE_KEY,
    getAll,
    getDoc,
    createDoc,
    renameDoc,
    deleteDoc,
    duplicateDoc,
    saveContent,
    loadContent,
    saveStrokes,
    loadStrokes,
  };
})();
