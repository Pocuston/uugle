import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import {
  uu5Book,
  uu5BookData,
  uu5BookNewPages,
  uu5BookNewMenuItems,
  uu5BookPages,
  uu5BookUpdatedPages,
  uuAppFrameworkBook,
  uuAppFrameworkBookData,
  uuAppFrameworkBookPages,
  uu5BookUpdatedMenuItems,
} from "./testData";
import {
  getBooks,
  getPages,
  forceBookToBeReIndexed,
  comparePages,
  replaceInArray,
} from "./testUtils";
import indexBook, { createBreadcrumbFromPage } from "../src/indexBook";
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

test("Reindex adds new pages and keeps all existing untouched", async () => {
  await indexBook(uu5BookData);
  const pagesBeforeReindex = await getPages();

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    loadBook: {
      ...uu5BookData.loadBook,
      menu: [...uu5BookData.loadBook.menu, ...uu5BookNewMenuItems],
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
    loadBook: {
      ...uu5BookData.loadBook,
      menu: [...uu5BookUpdatedMenuItems],
    },
    getBookStructure: {
      itemMap: {},
    },
  });

  const pagesAfterReindex = await getPages();
  const expectedPages = uu5BookUpdatedPages
    .sort(comparePages)
    .map(page => expect.objectContaining(page));
  expect(pagesAfterReindex).toEqual(expectedPages);
});

test("When the page name is changed, it should be changed in index after the reindexing is done", async () => {
  await indexBook(uu5BookData);

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    loadBook: {
      ...uu5BookData.loadBook,
      menu: replaceInArray(
        uu5BookData.loadBook.menu,
        item => item.page === "UU5BricksAccordion",
        item => ({ ...item, label: { en: "UU5.Bricks.Accordion - updated!" } })
      ),
    },
  });

  const updatedPages = replaceInArray(
    uu5BookPages,
    item => item.code === "UU5BricksAccordion",
    item => ({
      ...item,
      name: "UU5.Bricks.Accordion - updated!",
    })
  );

  const pagesAfterReindex = await getPages();
  const expectedPages = updatedPages
    .sort(comparePages)
    .map(page => expect.objectContaining(page));

  expect(pagesAfterReindex).toEqual(expectedPages);
});

test("Pages have correct breadcrumbs", async () => {
  await indexBook(uu5BookData);

  const pages = await getPages();

  expect(pages.find(page => page.code === "36615176").breadcrumbs).toEqual([]);
  expect(
    pages.find(page => page.code === "UU5BricksAccordion").breadcrumbs
  ).toEqual([
    createBreadcrumbFromPage(pages.find(page => page.code === "36615176")),
  ]);
  expect(
    pages.find(page => page.code === "UU5BricksModal").breadcrumbs
  ).toEqual([
    createBreadcrumbFromPage(pages.find(page => page.code === "36615176")),
    createBreadcrumbFromPage(
      pages.find(page => page.code === "UU5BricksAccordion")
    ),
  ]);
  expect(pages.find(page => page.code === "useEffect").breadcrumbs).toEqual([]);
});

test("Pages have correct color", async () => {
  await indexBook(uu5BookData);

  const pages = await getPages();

  pages.forEach(page =>
    expect(page.color).toEqual(uu5BookData.loadBook.theme.main)
  );
});
