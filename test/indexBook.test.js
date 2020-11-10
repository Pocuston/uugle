import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import {
  uu5Book,
  uu5BookData,
  uu5BookNewPages,
  uu5BookNewPagesItemMap,
  uu5BookPages,
  uu5BookRemovedPages,
  uu5BookRemovedPagesItemMap,
  uuAppFrameworkBook,
  uuAppFrameworkBookData,
  uuAppFrameworkBookPages,
} from "./testData";
import {
  getBooks,
  getPages,
  forceBookToBeReIndexed,
  comparePages,
} from "./testUtils";
import indexBook from "../src/indexBook";
import { initialize } from "../src/searchIndex";
import { beforeEach, test } from "@jest/globals";

beforeEach(async () => {
  indexedDB = new FDBFactory();
  await initialize();
});

test("Books can be put into book object store", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const books = await getBooks();
  expect(books).toContainEqual(expect.objectContaining(uu5Book));
  expect(books).toContainEqual(expect.objectContaining(uuAppFrameworkBook));
  expect(books).toHaveLength(2);
});

test("Same book is put into book object store only once", async () => {
  await indexBook(uu5BookData);
  await indexBook(uu5BookData);

  const books = await getBooks();
  expect(books).toContainEqual(expect.objectContaining(uu5Book));
  expect(books).toHaveLength(1);
});

test("All pages are put into pages object store", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const pages = await getPages();

  expect(pages).toEqual(
    [...uu5BookPages, ...uuAppFrameworkBookPages]
      .sort(comparePages)
      .map(page => expect.objectContaining(page))
  );
});

test("Reindex does not recreate existing pages", async () => {
  await indexBook(uu5BookData);
  const pagesBeforeReindex = await getPages();

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook(uu5BookData);

  const pagesAfterReindex = await getPages();
  expect(pagesAfterReindex).toEqual(pagesBeforeReindex);
});

test("Reindex adds new pages ane keeps existing", async () => {
  await indexBook(uu5BookData);
  const pagesBeforeReindex = await getPages();

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    getBookStructure: {
      itemMap: {
        ...uu5BookData.getBookStructure.itemMap,
        ...uu5BookNewPagesItemMap,
      },
    },
  });

  //TODO write custom matcher to compare equal page arrays
  const pagesAfterReindex = await getPages();
  expect(pagesAfterReindex).toEqual(
    [...pagesBeforeReindex, ...uu5BookNewPages]
      .sort(comparePages)
      .map(page => expect.objectContaining(page))
    //)
  );

  expect(pagesAfterReindex.length).toBe(
    pagesBeforeReindex.length + uu5BookNewPages.length
  );
});

test("Reindex removes deleted pages", async () => {
  await indexBook(uu5BookData);

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    getBookStructure: {
      itemMap: uu5BookRemovedPagesItemMap,
    },
  });

  const pagesAfterReindex = await getPages();
  expect(pagesAfterReindex).toEqual(
    uu5BookRemovedPages
      .sort(comparePages)
      .map(page => expect.objectContaining(page))
  );
});
