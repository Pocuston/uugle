import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import {
  uu5BookData,
  uu5BookNewMenuItems,
  uu5BookNewPages,
  uu5BookPages,
  uu5BookRemovedMenuItems,
  uuAppFrameworkBookData,
  uuAppFrameworkBookPages,
} from "./testData";

import indexBook from "../src/indexBook";
import { initialize } from "../src/searchIndex";
import { beforeEach, test } from "@jest/globals";
import { searchAndSuggest } from "../src/search";
import {
  forceBookToBeReIndexed,
  getBooks,
  getTestSuggestion,
} from "./testUtils";

beforeEach(async () => {
  indexedDB = new FDBFactory();
  await initialize();
});

test("Pages from multiple books can be found", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const suggest = jest.fn();
  await searchAndSuggest("validation", suggest);

  const expectedSuggestions = [
    uu5BookPages.find(page => page.code === "36615176"),
    uuAppFrameworkBookPages.find(page => page.code === "validation_00"),
  ].map(page => getTestSuggestion(page));

  expect(suggest).toHaveBeenCalledWith(expectedSuggestions);
});

test("After reindex new pages can be found", async () => {
  await indexBook(uu5BookData);

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    loadBook: {
      ...uu5BookData.loadBook,
      menu: [...uu5BookData.loadBook.menu, ...uu5BookNewMenuItems],
    },
  });

  const suggest = jest.fn();
  await searchAndSuggest("usecontext", suggest);

  expect(suggest).toHaveBeenCalledWith(
    [uu5BookNewPages.find(page => page.name.includes("useContext"))].map(page =>
      getTestSuggestion(page)
    )
  );
});

test("After reindex removed pages can be no longer found", async () => {
  await indexBook(uu5BookData);

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    loadBook: {
      ...uu5BookData.loadBook,
      menu: [...uu5BookRemovedMenuItems],
    },
  });

  const suggest = jest.fn();
  await searchAndSuggest("validation", suggest);

  expect(suggest).toHaveBeenCalledWith([]);
});

test("Pages can be searched also by book name", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const suggest = jest.fn();
  await searchAndSuggest("uu5", suggest);

  const expectedSuggestions = [
    uu5BookPages.find(page => page.code === "UU5BricksAccordion"),
    uu5BookPages.find(page => page.code === "UU5BricksModal"),
    uu5BookPages.find(page => page.code === "36615176"),
    uu5BookPages.find(page => page.code === "useEffect"),
  ].map(page => getTestSuggestion(page));

  expect(suggest).toHaveBeenCalledWith(expectedSuggestions);
});
