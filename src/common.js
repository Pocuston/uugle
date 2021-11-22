import elasticlunr from "elasticlunr";

const databaseVersion = 5;
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
  const request = indexedDB.open(booksDatabase, databaseVersion);

  request.onupgradeneeded = async event => {
    const db = event.target.result;

    //when upgrading from v4 to v5, we need to rebuild index
    if (event.oldVersion === 4) {
      await migrate4to5(event);
    } else {
      if (db.objectStoreNames.length > 0) {
        db.deleteObjectStore(booksScheme);
        db.deleteObjectStore(pagesScheme);
        db.deleteObjectStore(indexScheme);
      }

      db.createObjectStore(booksScheme, {
        keyPath: "awid",
      });

      const pageStore = db.createObjectStore(pagesScheme, {
        keyPath: "id",
        autoIncrement: true,
      });
      pageStore.createIndex("awid", "awid", { unique: false });
      pageStore.createIndex("awid-code", ["awid", "code"], {
        multiEntry: false,
        unique: true,
      });

      db.createObjectStore(indexScheme, {
        keyPath: "id",
      });
    }

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

async function migrate4to5(event) {
  console.log("uuGle: running data migration from version 4 to 5");

  //read all pages
  const transaction = event.target.transaction;

  transaction.onerror = () => {
    console.error("uuGle: book indexing error");
  };

  const indexStore = transaction.objectStore(indexScheme);
  const pagesStore = transaction.objectStore(pagesScheme);

  const allPages = await requestToPromise(pagesStore.getAll());

  //rebuild index
  let index = elasticlunr(function () {
    this.setRef("id");
    this.addField("name");
    this.addField("bookName");
    this.saveDocument(false);
  });

  allPages.forEach(page => {
    const indexDoc = {
      id: page.id,
      name: page.name,
      bookName: page.bookName,
    };
    index.addDoc(indexDoc);
  });

  //store rebuilt index
  //Store updated index serialized in JSON
  const indexObject = {
    id: indexObjectId,
    indexDump: JSON.stringify(index),
  };
  await requestToPromise(indexStore.put(indexObject));

  console.log(
    "uuGle: data migration from version 4 to 5 completed successfully"
  );
}
