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
    console.error("uuGle: book indexing error");
  };

  const booksStore = transaction.objectStore(booksScheme);
  const pagesStore = transaction.objectStore(pagesScheme);

  const awid = getBookAwid(bookData.url);
  const currentTime = new Date();

  //If the book has been already indexed and index is up to date, then there is no more to be done
  let book = await getBookByAwid(booksStore, awid);
  if (book && book.lastUpdate > currentTime - bookIndexExpiration) {
    console.log(
      `uuGle: book "${book.name}" has been already indexed and it is up to date. Skipping..`
    );
    return;
  }

  let existingPages;
  //Create new book or update existing book
  if (!book) {
    book = createNewBookObject(bookData.loadBook, awid, currentTime);
    existingPages = [];
    console.log(`uuGle: new book "${book.name}" is being indexed`);
  } else {
    book.lastUpdate = currentTime;
    existingPages = await getBookPages(awid, pagesStore);
    console.log(`uuGle: existing book "${book.name}" will be re-indexed`);
  }
  let bookId = await requestToPromise(booksStore.put(book));

  //create list of pages from retrieved book data
  const bookDataPages = getPageList(bookData, bookId, awid);

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
 * Extracts bookkit base URL and awid from any page URL.
 * @param {string} pageUrl
 * @returns {string}
 */
function getBookAwid(pageUrl) {
  const bookBaseUrlRexExp = /https:\/\/[a-zA-Z0-9]+\.plus4u.net\/(uu-dockitg01-main|uu-bookkit-maing01|uu-bookkitg01-main)\/([a-z0-9]+-)?([a-z0-9]+)/;
  const matches = pageUrl.match(bookBaseUrlRexExp);
  if (!matches || matches.length === 0) {
    throw new Error("uuGle: invalid bookkit page url: " + pageUrl);
  }

  return matches[3];
}

/**
 * Loads single book bu URL
 * @param bookStore
 * @param {string} awid
 * @returns {Promise<Book>}
 */
function getBookByAwid(bookStore, awid) {
  return requestToPromise(bookStore.get(awid));
}

async function getBookPages(awid, pagesStore) {
  const index = pagesStore.index("awid");
  return requestToPromise(index.getAll(awid));
}

function comparePages(pageA, pageB) {
  return pageA.code === pageB.code && pageA.name === pageB.name;
}

async function applyChangePatch(patch, pagesStore) {
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

  let pagesToAdd = [];
  patch
    .filter(action => action.type === "add")
    .forEach(action => (pagesToAdd = [...pagesToAdd, ...action.items]));

  //every new page is put to object store and added to index
  await Promise.all(
    pagesToAdd.map(page => {
      return requestToPromise(pagesStore.add(page)).then(pageId => {
        const indexDoc = {
          id: pageId,
          name: page.name,
          bookName: page.bookName,
        };
        searchIndex.addDoc(indexDoc);
      });
    })
  );
  console.log(`uuGle: added ${pagesToAdd.length} new pages`);
}

function createNewBookObject(bookData, awid, lastUpdate) {
  const { primaryLanguage, name } = bookData;
  return {
    awid,
    name: name[primaryLanguage],
    lastUpdate,
  };
}

function getPageList(bookData, bookId, awid) {
  const { name, primaryLanguage, menu } = bookData.loadBook;

  //TODO stav stranky
  //TODO ikona knizky?
  //TODO smazani knizky

  const pages = [];
  menu.forEach((menuItem, menuItemIndex) => {
    const page = {
      bookId,
      bookName: name[primaryLanguage],
      awid,
      code: menuItem.page,
      name: menuItem.label[primaryLanguage],
      breadcrumbs: getBreadcrumbs(pages, menu, menuItem, menuItemIndex),
    };
    pages.push(page);
  });

  return pages;
}

function getBreadcrumbs(pages, menu, menuItem, menuItemIndex) {
  if (menuItem.indent === 0) {
    return [];
  }

  for (let i = menuItemIndex - 1; i >= 0; i--) {
    const prevMenuItem = menu[i];
    if (prevMenuItem.indent < menuItem.indent) {
      const parent = pages[i];
      return [...parent.breadcrumbs, createBreadcrumbFromPage(parent)];
    }
  }

  console.error("Could not get breadcrumbs for menu item", menuItem);
  return [];
}

/**
 * Creates breadcrumb from page
 * @param page
 * @returns {{code, name}}
 */
export function createBreadcrumbFromPage(page) {
  return {
    code: page.code,
    name: page.name,
  };
}
