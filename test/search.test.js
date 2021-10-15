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

  expect(suggest).toHaveBeenCalledWith(
    [
      uuAppFrameworkBookPages.find(page => page.name.includes("Validation")),
      uu5BookPages.find(page => page.name.includes("Validation")),
    ].map(page => getTestSuggestion(page))
  );
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
