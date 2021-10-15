import { searchIndex } from "./searchIndex";
import { openDb, pagesScheme, requestToPromise } from "./common";

/**
 * Maximum number of items to suggest in omnibox
 * @type {number}
 */
const maxSuggestions = 30;

/**
 * Base URL of bookkit page
 * @type {string}
 */
const pageUrlBase = "https://uuapp.plus4u.net/uu-bookkit-maing01";

/**
 * Creates omnibox suggestion from page info
 * @param {{name: string, awid: string, code: string}} page
 * @returns {{description: string, content: *}}
 */
export function getSuggestion(page) {
  return {
    content: page.url,
    description: `${escapeHtml(page.name)} - <url>${page.url}</url>`,
  };
}

/**
 * Returns page URL
 * @param page
 * @returns {string}
 */
export function getPageUrl(page) {
  return `${pageUrlBase}/${page.awid}/book/page?code=${page.code}`;
}

/**
 * Returns book home URL
 * @param page
 * @returns {string}
 */
export function getBookUrl(page) {
  return `${pageUrlBase}/${page.awid}`;
}

/**
 * Fulltext search in index
 * @param {string} query
 */
export async function search(query) {
  /**
   * Creates chrome omnibox suggestion
   * @param page
   */

  if (searchIndex === null) {
    throw new Error(
      "Index must be initialized first. Call initialize() function."
    );
  }

  if (!query) {
    return [];
  }

  query = query.trim();
  if (query === "") {
    return [];
  }

  //First, we query index for page ids
  let indexResults = searchIndex.search(query, { expand: true });
  if (indexResults.length === 0) {
    return [];
  }

  if (indexResults.length > maxSuggestions) {
    indexResults = indexResults.slice(0, maxSuggestions);
  }

  //For each page id found, we load page from db and return list of suggestions
  const db = await openDb();
  const transaction = db.transaction([pagesScheme]);
  transaction.onerror = () => {
    console.error("uuGle: load page list error", transaction.error);
  };

  const pagesStore = transaction.objectStore(pagesScheme);

  //Since get requests run in parallel we must wait for all of them
  const results = await Promise.all(
    indexResults.map(indexDoc => {
      return requestToPromise(pagesStore.get(parseInt(indexDoc.ref)))
        .then(page => {
          return { ...page, url: getPageUrl(page), bookUrl: getBookUrl(page) };
        })
        .catch(error => {
          console.error("uuGle: error loading page:", indexDoc.ref, error);
        });
    })
  );

  console.log("uuGle: suggestions for '" + query + "' :", results);
  return results;
}

/**
 * Fulltext search in index
 * @param {string} query
 * @param {(suggestResults: chrome.omnibox.SuggestResult[]) => void} suggest
 */
export async function searchAndSuggest(query, suggest) {
  const searchResults = await search(query);

  const suggestions = searchResults.map(getSuggestion);

  //We call suggest method from chrome.omnibox to suggest results
  suggest(suggestions);
}

/**
 * Escapes HTML special chars
 * @param {string} unsafe
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
