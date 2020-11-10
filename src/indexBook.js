import diff from "fast-array-diff";
import {
  booksScheme,
  indexScheme,
  openDb,
  pagesScheme,
  requestToPromise,
  indexObjectId,
} from "./common";
import { searchIndex } from "./searchIndex";

/**
 * Book index expiration time interval after that is book re-indexed
 * @type {number}
 */
const bookIndexExpiration = 60 * 60 * 1000;

/**
 * Indexes new book or re-indexes existing book
 * @param bookData
 */
export default async function indexBook(bookData) {
  const db = await openDb();
  const transaction = db.transaction(
    [booksScheme, pagesScheme, indexScheme],
    "readwrite"
  );

  transaction.onerror = () => {
    console.error("uuGle: book indexing error", transaction.error);
  };

  const bookUrl = getBookBaseUrl(bookData.url);
  const booksStore = transaction.objectStore(booksScheme);
  const pagesStore = transaction.objectStore(pagesScheme);
  const currentTime = new Date();

  //If the book has been already indexed and index is up to date, then there is no more to be done
  let book = await getBookByUrl(booksStore, bookUrl);
  if (book && book.lastUpdate > currentTime - bookIndexExpiration) {
    console.log(
      `uuGle: book "${book.name}" has been already indexed and it is up to date. Skipping..`
    );
    return;
  }

  let existingPages;
  //Create new book or update existing book
  if (!book) {
    book = createNewBookObject(bookData.loadBook, bookUrl, currentTime);
    existingPages = [];
    console.log(`uuGle: new book "${book.name}" is being indexed`);
  } else {
    book.lastUpdate = currentTime;
    existingPages = await getBookPages(book.id, pagesStore);
    console.log(`uuGle: existing book "${book.name}" will be re-indexed`);
  }
  let bookId = await requestToPromise(booksStore.put(book));

  //create list of pages from retrieved book data
  const bookDataPages = getPageList(bookData, bookUrl, bookId);

  const changePatch = diff.getPatch(existingPages, bookDataPages, comparePages);
  await applyChangePatch(changePatch, pagesStore);

  //Store updated index serialized in JSON
  const indexStore = transaction.objectStore(indexScheme);
  const indexObject = {
    id: indexObjectId,
    indexDump: JSON.stringify(searchIndex),
  };
  await requestToPromise(indexStore.put(indexObject));
  console.log("uuGle: book indexing complete");
}

/**
 * Extracts bookkit base URL from any page URL.
 * @param {string} pageUrl
 * @returns {string}
 */
function getBookBaseUrl(pageUrl) {
  const bookBaseUrlRexExp = /https:\/\/[a-zA-Z0-9]+\.plus4u.net\/(uu-dockitg01-main|uu-bookkit-maing01|uu-bookkitg01-main)\/[a-z0-9-]+/;
  const matches = pageUrl.match(bookBaseUrlRexExp);
  if (!matches || matches.length === 0) {
    throw new Error("uuGle: invalid bookkit page url: " + pageUrl);
  }

  return matches[0];
}

/**
 * Loads single book bu URL
 * @param bookStore
 * @param url
 * @returns {Promise<Book>}
 */
function getBookByUrl(bookStore, url) {
  const index = bookStore.index("url");
  return requestToPromise(index.get(url));
}

async function getBookPages(bookId, pagesStore) {
  const index = pagesStore.index("bookId");
  return await requestToPromise(index.getAll(bookId));
}

function comparePages(pageA, pageB) {
  return pageA.url === pageB.url && pageA.name === pageB.name;
}

async function applyChangePatch(patch, pagesStore) {
  let pagesToAdd = [];
  patch
    .filter(action => action.type === "add")
    .forEach(action => (pagesToAdd = [...pagesToAdd, ...action.items]));

  //every new page is put to object store and added to index
  await Promise.all(
    pagesToAdd.map(page => {
      return requestToPromise(pagesStore.add(page)).then(pageId => {
        const indexDoc = { id: pageId, name: page.name };
        searchIndex.addDoc(indexDoc);
      });
    })
  );
  console.log(`uuGle: added ${pagesToAdd.length} new pages`);

  let pagesToRemove = [];
  patch
    .filter(action => action.type === "remove")
    .forEach(action => {
      pagesToRemove = [...pagesToRemove, ...action.items];
    });

  await Promise.all(
    pagesToRemove.map(page => {
      return requestToPromise(pagesStore.delete(page.id))
        .then(() => {
          searchIndex.removeDoc(page);
        })
        .catch(e => console.error("uuGle: error removing page ", e));
    })
  );
  console.log(`uuGle: removed ${pagesToRemove.length} existing pages`);
}

function createNewBookObject(bookData, bookUrl, lastUpdate) {
  const { primaryLanguage, name } = bookData;
  return {
    url: bookUrl,
    name: name[primaryLanguage],
    lastUpdate: lastUpdate,
  };
}

function getPageList(bookData, bookUrl, bookId) {
  const { name, primaryLanguage } = bookData.loadBook;
  const { itemMap } = bookData.getBookStructure;

  //TODO doplnit cestu
  return Object.entries(itemMap).map(itemPair => {
    const [key, item] = itemPair;
    return {
      bookId,
      url: `${bookUrl}/book/page?code=${key}`,
      name: name[primaryLanguage] + " > " + item.label[primaryLanguage],
    };
  });
}
