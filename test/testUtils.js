import {
  booksScheme,
  indexScheme,
  openDb,
  pagesScheme,
  requestToPromise,
} from "../src/common";
import { getPageUrl, getSuggestion } from "../src/search";

async function getTransaction() {
  const db = await openDb();
  const transaction = db.transaction(
    [booksScheme, pagesScheme, indexScheme],
    "readwrite"
  );
  return transaction;
}

export async function getBooks() {
  const transaction = await getTransaction();
  const booksStore = transaction.objectStore(booksScheme);
  return await requestToPromise(booksStore.getAll());
}

export async function getPages() {
  const transaction = await getTransaction();
  const pagesStore = transaction.objectStore(pagesScheme);
  const pages = await requestToPromise(pagesStore.getAll());
  return pages.sort(comparePages);
}

export async function forceBookToBeReIndexed(book) {
  const transaction = await getTransaction();
  const booksStore = transaction.objectStore(booksScheme);
  return await requestToPromise(
    booksStore.put({
      ...book,
      lastUpdate: new Date(2020, 9, 1),
    })
  );
}

/**
 * Compares book pages by book awid and page code to be able to compare arrays of pages in tests
 * @param pageA
 * @param pageB
 * @returns {number}
 */
export function comparePages(pageA, pageB) {
  return `${pageA.awid}/${pageA.code}`.localeCompare(
    `${pageB.awid}/${pageB.code}`
  );
}

/**
 * Adds field with complete page URL and then returns suggestion
 * @param page
 * @returns {{description: string, content: *}}
 */
export function getTestSuggestion(page) {
  return getSuggestion({
    ...page,
    url: getPageUrl(page),
  });
}

/**
 * Replaces first occurrence of item by @predicate function by @replacement function.
 * Returns shallow copy of array.
 * @param array
 * @param predicate predicate function to find item to be replaced
 * @param replacement replacement function taking original item as parameter
 */
export function replaceInArray(array, predicate, replacement) {
  const result = [...array];
  const indexToBeReplaced = result.findIndex(predicate);
  if (indexToBeReplaced > -1) {
    result[indexToBeReplaced] = replacement(result[indexToBeReplaced]);
  }
  return result;
}
