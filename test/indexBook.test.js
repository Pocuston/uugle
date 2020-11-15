import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import { indexBook } from "../src/pages/Background/storage";
import {
  uu5Book,
  uu5BookData,
  uuAppFrameworkBook,
  uuAppFrameworkBookData,
} from "./testData";
import { getBooks, getTransaction } from "./testUtils";

beforeEach(() => {
  indexedDB = new FDBFactory();
});

test("Book is put into book object store", async () => {
  await indexBook(uu5BookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toHaveLength(1);
});

test("Same book is put into book object store only once", async () => {
  await indexBook(uu5BookData);
  await indexBook(uu5BookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toHaveLength(1);
});

test("More books can be put into book object store", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toContainEqual(uuAppFrameworkBook);
  expect(books).toHaveLength(2);
});
