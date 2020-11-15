import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import { indexBook } from "../src/pages/Background/storage";
import {
  uu5Book,
  uu5BookData,
  uu5BookPages,
  uuAppFrameworkBook,
  uuAppFrameworkBookData,
  uuAppFrameworkBookPages,
} from "./testData";
import { getBooks, getPages, getTransaction } from "./testUtils";

beforeEach(() => {
  indexedDB = new FDBFactory();
});

test("Books can be put into book object store", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toContainEqual(uuAppFrameworkBook);
  expect(books).toHaveLength(2);
});

test("Same book is put into book object store only once", async () => {
  await indexBook(uu5BookData);
  await indexBook(uu5BookData);

  const books = await getBooks();
  expect(books).toContainEqual(uu5Book);
  expect(books).toHaveLength(1);
});

test("All pages are put into pages object store", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const pages = await getPages();

  uu5BookPages.forEach((page) =>
    expect(pages).toContainEqual(expect.objectContaining(page))
  );
  uuAppFrameworkBookPages.forEach((page) =>
    expect(pages).toContainEqual(expect.objectContaining(page))
  );
  expect(pages).toHaveLength(
    uu5BookPages.length + uuAppFrameworkBookPages.length
  );
});
