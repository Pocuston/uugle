import {
  booksScheme,
  indexScheme,
  openDb,
  pagesScheme,
  requestToPromise,
} from "../src/pages/Background/storage";

//TODO export schemes from storage.js

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
  return await requestToPromise(pagesStore.getAll());
}
