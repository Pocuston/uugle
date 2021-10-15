import { indexObjectId, indexScheme, openDb, requestToPromise } from "./common";

export const elasticlunr = require("elasticlunr");

//extend default elasticlunr separators by "." to allow search e.g. "accordion" in "UU5.Bricks.Accordion"
elasticlunr.tokenizer.setSeperator(/[\s\-./]+/);

/**
 * If indexed documents should be stored in index.
 * Use true for debugging only.
 * @type {boolean}
 */
const saveDocumentInIndex = false;
/**
 * In-memory fulltext index.
 * It must be initialized first by calling the initialize().
 */
export let searchIndex = null;

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

  searchIndex = await loadIndexFromDb(transaction);
  console.log("uuGle: index initialized");

  //TODO vypsat seznam knizek do konzole
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
      this.addField("bookName");
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
