const elasticlunr = require("elasticlunr");

const booksDatabase = "booksDb";
const booksScheme = "books";
const pagesScheme = "pages";
const indexScheme = "index";
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

//Fulltext index must be initialized first by calling the initialize()
let index = null;

//TODO overit vykon:
//TODO velikost v databazi pro knizku
//TODO velikost indexu pro knizku
//TODO velikost pameti pro knizku
//TODO mereni casu: indexBook, initialize
//TODO optimalizace: neukladat index jako string ale objekt

/**
 * Indexes book
 * @param bookData
 */
export async function indexBook(bookData) {
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
  //TODO 3: zaindexovat i asid?

  const book = getBookObject(bookData.loadBook);
  const booksStore = transaction.objectStore(booksScheme);

  //Check if the book has been already indexed
  const bookKey = await requestToPromise(booksStore.getKey(book.awid));
  if (!!bookKey) {
    console.log("uuGle: book has been already indexed, skipping..");
    return;
  }

  //Store book
  booksStore.put(book);

  //Store each book page
  const pagesStore = transaction.objectStore(pagesScheme);
  const pageList = getPageList(bookData);

  await Promise.all(
    pageList.map((page) => {
      return new Promise((resolve) => {
        const request = pagesStore.add(page);
        request.onsuccess = (event) => {
          //Add each book page to index
          const pageId = event.target.result;
          index.addDoc({ id: pageId, name: page.name });
          resolve();
        };
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
  function getSuggestion({ code, awid, name }) {
    const url = `https://uuos9.plus4u.net/uu-bookkitg01-main/78462435-${awid}/book/page?code=${code}`;
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

  console.log("uuGle: searching results for `" + query + "`");

  //First, we search index for page ids
  let indexResults = index.search(query, { expand: true });
  console.log("uuGle: result from index:", indexResults);
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
  try {
    const suggestions = await Promise.all(
      indexResults.map((result) => {
        return new Promise((resolve, reject) => {
          const request = pagesStore.get(parseInt(result.ref));
          request.onsuccess = () => {
            const page = request.result;
            resolve(getSuggestion(page));
          };
          request.onerror = () => {
            console.error("uuGle: error loading page:", result.ref);
            reject("uuGle: error loading page");
          };
        });
      })
    );
    console.log("uuGle: suggestions:", suggestions);
    //We call suggest method from chrome.omnibox to suggest results
    suggest(suggestions);
  } catch (e) {
    console.error("uuGle: error loading suggested pages", e);
  }
}

/**
 * Initializes index for fulltext search from database
 */
export async function initialize() {
  console.log("uuGle: initializing index");
  const db = await openDb();
  const transaction = db.transaction([indexScheme]);
  transaction.onerror = () => {
    console.error("uuGle: page index load error", transaction.error);
  };

  //TODO indexStore.get prepsat na async/await
  const indexStore = transaction.objectStore(indexScheme);
  const request = indexStore.get(indexObjectId);
  request.onsuccess = (event) => {
    if (!request.result) {
      index = elasticlunr(function () {
        this.setRef("id");
        this.addField("name");
        this.saveDocument(saveDocumentInIndex);
      });
      console.log("uuGle: index not found in db");
      console.log("uuGle: creating new empty index");
      return;
    }

    const { indexDump } = request.result;
    const indexObject = JSON.parse(indexDump);
    index = elasticlunr.Index.load(indexObject);
    console.log("uuGle: index successfully loaded from database");
  };
  request.onerror = (event) => {
    console.error("uuGle: index load error", event);
  };
}

/**
 * Opens db connection.
 * If database does not exists yet, it is initialized first.
 * @returns {Promise<IDBDatabase>}
 */
async function openDb() {
  const request = indexedDB.open(booksDatabase, 1);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;

    db.createObjectStore(booksScheme, { keyPath: "awid" });

    const pageStore = db.createObjectStore(pagesScheme, {
      autoIncrement: true,
      keyPath: "id",
    });
    pageStore.createIndex("unique awid+code", ["awid", "code"], {
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

function getBookObject(bookData) {
  const { primaryLanguage, awid, name } = bookData;
  return {
    awid,
    name: name[primaryLanguage],
  };
}

function getPageList(bookData) {
  const { name, primaryLanguage, awid } = bookData.loadBook;
  const { itemMap } = bookData.getBookStructure;

  //TODO doplnit cestu
  return Object.entries(itemMap).map((itemPair) => {
    const [key, item] = itemPair;
    return {
      code: key,
      awid,
      name: name[primaryLanguage] + " > " + item.label[primaryLanguage],
    };
  });
}

/**
 * Creates Promise from IDBRequest
 * @param request {IDBRequest}
 * @returns {Promise<any>}
 */
async function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}
