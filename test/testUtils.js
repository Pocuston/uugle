import { openDb, requestToPromise } from "../src/pages/Background/storage";

//TODO export schemes from storage.js

export async function getTransaction() {
  const db = await openDb();
  const transaction = db.transaction(["books", "pages", "index"], "readwrite");
  return transaction;
}

export async function getBooks() {
  const transaction = await getTransaction();
  const booksStore = transaction.objectStore("books");
  return await requestToPromise(booksStore.getAll());
}
