const elasticlunr = require("elasticlunr");

const booksDatabase = "booksDb";
export const booksScheme = "books";
export const pagesScheme = "pages";
export const indexScheme = "index";

const indexObjectId = 1;

/**
 * Maximum number of items to suggest in omnibar
 * @type {number}
 */
const maxSuggestions = 15;

/**
 * If indexed documents should be stored in index.
 * Use true for debugging only.
 * @type {boolean}
 */
const saveDocumentInIndex = false;

//Extend default elasticlunr separators by "." to allow search e.g. "accordion" in "UU5.Bricks.Accordion"
elasticlunr.tokenizer.setSeperator(/[\s\-./]+/);

/**
 * In-memory fulltext index.
 * It must be initialized first by calling the initialize().
 */
let index = null;

//TODO overit vykon:
//TODO velikost v databazi pro knizku
//TODO velikost indexu pro knizku
//TODO velikost pameti pro knizku
//TODO mereni casu: indexBook, initialize

/**
 * Indexes book
 * @param bookData
 */
export async function indexBook(bookData) {
  function getBookBaseUrl(pageUrl) {
    const bookBaseUrlRexExp = /https:\/\/[a-zA-Z0-9]+\.plus4u.net\/(uu-dockitg01-main|uu-bookkit-maing01|uu-bookkitg01-main)\/[a-z0-9-]+/;
    const matches = pageUrl.match(bookBaseUrlRexExp);
    if (!matches || matches.length === 0) {
      throw new Error("uuGle: invalid bookkit page url: " + pageUrl);
    }

    return matches[0];
  }

  const db = await openDb();
  const transaction = db.transaction(
    [booksScheme, pagesScheme, indexScheme],
    "readwrite"
  );

  transaction.onerror = () => {
    console.error("uuGle: book indexing error", transaction.error);
  };

  //TODO 2: promazani stranek a indexu pokud uz je knizka zaindexovana
  //TODO 2: podminene indexovani podle casove platnosti nebo timestampu

  const bookUrl = getBookBaseUrl(bookData.url);
  const book = getBookObject(bookData.loadBook, bookUrl);
  const booksStore = transaction.objectStore(booksScheme);

  //Check if the book has been already indexed
  const bookKey = await requestToPromise(booksStore.getKey(bookUrl));
  if (!!bookKey) {
    console.log(
      "uuGle: book `" + book.name + "` has been already indexed, skipping.."
    );
    return;
  }

  //Store book
  booksStore.put(book);

  //Store each book page
  const pagesStore = transaction.objectStore(pagesScheme);
  const pageList = getPageList(bookData, bookUrl);

  //Before we add pages to index, we synchronize in-memory index with db
  index = await loadIndexFromDb(transaction);

  //Every page is put to object store and added to index
  await Promise.all(
    pageList.map((page) => {
      return new Promise(async (resolve) => {
        const pageId = await requestToPromise(pagesStore.add(page));
        const indexDoc = { id: pageId, name: page.name };
        index.addDoc(indexDoc);
        resolve();
      });
    })
  );

  //Store updated index serialized in JSON
  const indexStore = transaction.objectStore(indexScheme);
  const indexObject = {
    id: indexObjectId,
    indexDump: JSON.stringify(index),
  };
  await requestToPromise(indexStore.put(indexObject));
  console.log("uuGle: book indexing complete");
}

/**
 * Fulltext search in index
 * @param query
 */
export async function search(query, suggest) {
  /**
   * Creates chrome omnibox suggestion
   * @param page
   */
  function getSuggestion({ url, name }) {
    return {
      content: url,
      description: `${escapeHtml(name)} - <url>${url}</url>`,
    };
  }

  /**
   * Escapes HTML special chars **
   * @param unsafe
   * @returns {string}
   */
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (index === null) {
    throw new Error(
      "Index must be initialized first. Call initialize() function."
    );
  }

  if (!query) {
    suggest([]);
    return;
  }

  query = query.trim();
  if (query === "") {
    suggest([]);
    return;
  }

  //First, we search index for page ids
  let indexResults = index.search(query, { expand: true });
  if (indexResults.length === 0) {
    suggest([]);
    return;
  }

  if (indexResults.length > maxSuggestions) {
    indexResults = indexResults.slice(0, maxSuggestions);
  }

  //For each page id, we load page from db and return list of suggestions
  const db = await openDb();
  const transaction = db.transaction([pagesScheme]);
  transaction.onerror = () => {
    console.error("uuGle: load page list error", transaction.error);
  };

  const pagesStore = transaction.objectStore(pagesScheme);

  //Since get requests run in parallel we must wait for all of them
  const suggestions = await Promise.all(
    indexResults.map((indexDoc) => {
      return requestToPromise(pagesStore.get(parseInt(indexDoc.ref)))
        .then((result) => {
          const page = result;
          return getSuggestion(page);
        })
        .catch((error) => {
          console.error("uuGle: error loading page:", indexDoc.ref, error);
        });
    })
  );

  console.log("uuGle: suggestions for '" + query + "' :", suggestions);
  //We call suggest method from chrome.omnibox to suggest results
  suggest(suggestions);
}

/**
 * Initializes index for fulltext search from database
 */
export async function initialize() {
  console.log("uuGle: initializing index");
  const db = await openDb();
  const transaction = db.transaction([indexScheme]);
  transaction.onerror = () => {
    console.error("uuGle: index load error", transaction.error);
  };

  index = await loadIndexFromDb(transaction);
  console.log("uuGle: index initialized");
}

/**
 * Loads index from serialized dump in db.
 * @param transaction IDBTransaction
 */
async function loadIndexFromDb(transaction) {
  const indexStore = transaction.objectStore(indexScheme);
  const indexObject = await requestToPromise(indexStore.get(indexObjectId));

  if (!indexObject) {
    let index = elasticlunr(function () {
      this.setRef("id");
      this.addField("name");
      this.saveDocument(saveDocumentInIndex);
    });
    console.log("uuGle: index not found in db");
    console.log("uuGle: creating new empty index");
    return index;
  }

  const { indexDump } = indexObject;
  let index = elasticlunr.Index.load(JSON.parse(indexDump));
  console.log("uuGle: index successfully loaded from database");
  return index;
}

/**
 * Opens db connection.
 * If database does not exists yet, it is initialized first.
 * @returns {Promise<IDBDatabase>}
 */
export async function openDb() {
  const request = indexedDB.open(booksDatabase, 1);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;

    db.createObjectStore(booksScheme, { keyPath: "url" });

    const pageStore = db.createObjectStore(pagesScheme, {
      autoIncrement: true,
      keyPath: "id",
    });
    pageStore.createIndex("unique url", "url", {
      unique: true,
    });

    db.createObjectStore(indexScheme, {
      keyPath: "id",
    });

    console.log("uuGle: database initialized");
  };

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => {
      console.log(`uuGle: error opening database ${booksDatabase}`);
      reject();
    };
  });
}

function getBookObject(bookData, bookUrl) {
  const { primaryLanguage, name } = bookData;
  return {
    url: bookUrl,
    name: name[primaryLanguage],
  };
}

function getPageList(bookData, bookUrl) {
  const { name, primaryLanguage } = bookData.loadBook;
  const { itemMap } = bookData.getBookStructure;

  //TODO doplnit cestu
  return Object.entries(itemMap).map((itemPair) => {
    const [key, item] = itemPair;
    return {
      url: `${bookUrl}/book/page?code=${key}`,
      name: name[primaryLanguage] + " > " + item.label[primaryLanguage],
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
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}
