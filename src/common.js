const booksDatabase = "booksDb";
export const booksScheme = "books";
export const pagesScheme = "pages";
export const indexScheme = "index";

/**
 * Opens db connection.
 * If database does not exists yet, it is initialized first.
 * @returns {Promise<IDBDatabase>}
 */
export async function openDb() {
  const request = indexedDB.open(booksDatabase, 3);

  request.onupgradeneeded = event => {
    const db = event.target.result;

    db.deleteObjectStore(booksScheme);
    db.deleteObjectStore(pagesScheme);
    db.deleteObjectStore(indexScheme);

    const bookStore = db.createObjectStore(booksScheme, {
      keyPath: "id",
      autoIncrement: true,
    });
    bookStore.createIndex("url", "url", {
      unique: true,
    });

    const pageStore = db.createObjectStore(pagesScheme, {
      keyPath: "id",
      autoIncrement: true,
    });
    pageStore.createIndex("bookId", "bookId");
    pageStore.createIndex("url", "url", {
      unique: true,
    });

    db.createObjectStore(indexScheme, {
      keyPath: "id",
    });

    console.log("uuGle: database initialized");
  };

  return new Promise((resolve, reject) => {
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => {
      console.log(`uuGle: error opening database ${booksDatabase}`);
      reject();
    };
  });
}

/**
 * Creates Promise from IDBRequest
 * @param request {IDBRequest}
 * @returns {Promise<any>}
 */
export async function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

export const indexObjectId = 1;
