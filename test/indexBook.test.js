import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import { indexBook } from "../src/pages/Background/storage";
import { uu5Book, uu5BookData } from "./testData";
import { getBooks, getTransaction } from "./testUtils";

beforeEach(() => {
  indexedDB = new FDBFactory();
});

test("Book is put into book object store", async () => {
  const bookData = uu5BookData;

  await indexBook(bookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toHaveLength(1);
});

test("Same book is indexed only once", async () => {
  const bookData = uu5BookData;

  await indexBook(bookData);
  await indexBook(bookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toHaveLength(1);
});
