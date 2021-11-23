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
  return (
    pageA.code === pageB.code &&
    pageA.name === pageB.name &&
    pageA.bookName === pageB.bookName &&
    pageA.state === pageB.state
  );
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
  const { name, primaryLanguage, menu, theme } = bookData.loadBook;
  const itemMap = { ...bookData.getBookStructure.itemMap };
  const bookName = name[primaryLanguage];
  const color = theme?.main;

  const pages = [];

  //first, we iterate pages in menu, because from there we can assemble breadcrumbs
  menu.forEach((menuItem, menuItemIndex) => {
    const pageFromItemMap = itemMap[menuItem.page];

    const pageFromMenu = {
      bookId,
      bookName,
      awid,
      code: menuItem.page,
      name: menuItem.label[primaryLanguage],
      breadcrumbs: getBreadcrumbs(pages, menu, menuItem, menuItemIndex),
      color,
      state: pageFromItemMap?.state,
    };

    //once page from menu is processed, we delete it from itemMap so we do not index it in duplicite
    if (pageFromItemMap) {
      delete itemMap[menuItem.page];
    }

    pages.push(pageFromMenu);
  });

  //not every page is in menu, so we need to go through itemMap as well for remaining set of pages
  Object.entries(itemMap).map(itemPair => {
    const [code, item] = itemPair;
    const pageFromItemMap = {
      bookId,
      bookName,
      awid,
      code,
      name: item.label[primaryLanguage],
      breadcrumbs: [],
      color,
      state: item.state,
    };
    pages.push(pageFromItemMap);
  });

  return pages;
}

/**
 * Creates list of breadcrumb pages from menu items
 * @param pages list of already created pages
 * @param menu menu structure from loadBook response data
 * @param menuItem current menu item
 * @param menuItemIndex current menu item index
 * @returns {*[]} list of breadcrumb pages
 */
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
