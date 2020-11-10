import { searchIndex } from "./searchIndex";
import { openDb, pagesScheme, requestToPromise } from "./common";

/**
 * Maximum number of items to suggest in omnibar
 * @type {number}
 */
const maxSuggestions = 15;

/**
 * Creates omnibox suggestion from page info
 * @param url
 * @param name
 * @returns {{description: string, content: *}}
 */
export function getSuggestion({ url, name }) {
  return {
    content: url,
    description: `${escapeHtml(name)} - <url>${url}</url>`,
  };
}

/**
 * Fulltext search in index
 * @param {string} query
 * @param {(suggestResults: chrome.omnibox.SuggestResult[]) => void} suggest
 */
export default async function search(query, suggest) {
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
    suggest([]);
    return;
  }

  query = query.trim();
  if (query === "") {
    suggest([]);
    return;
  }

  //First, we query index for page ids
  let indexResults = searchIndex.search(query, { expand: true });
  if (indexResults.length === 0) {
    suggest([]);
    return;
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
  const suggestions = await Promise.all(
    indexResults.map(indexDoc => {
      return requestToPromise(pagesStore.get(parseInt(indexDoc.ref)))
        .then(result => {
          const page = result;
          return getSuggestion(page);
        })
        .catch(error => {
          console.error("uuGle: error loading page:", indexDoc.ref, error);
        });
    })
  );

  console.log("uuGle: suggestions for '" + query + "' :", suggestions);
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
