import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import {
  uu5BookData,
  uu5BookNewPages,
  uu5BookNewPagesItemMap,
  uu5BookPages,
  uu5BookRemovedPagesItemMap,
  uuAppFrameworkBookData,
  uuAppFrameworkBookPages,
} from "./testData";

import indexBook from "../src/indexBook";
import { initialize } from "../src/searchIndex";
import { beforeEach, test } from "@jest/globals";
import search, { getSuggestion } from "../src/search";
import { forceBookToBeReIndexed, getBooks, getPages } from "./testUtils";

beforeEach(async () => {
  indexedDB = new FDBFactory();
  await initialize();
});

test("Pages from multiple books can be found", async () => {
  await indexBook(uu5BookData);
  await indexBook(uuAppFrameworkBookData);

  const suggest = jest.fn();
  await search("validation", suggest);

  expect(suggest).toHaveBeenCalledWith(
    [
      uuAppFrameworkBookPages.find(page => page.name.includes("Validation")),
      uu5BookPages.find(page => page.name.includes("Validation")),
    ].map(page => getSuggestion(page))
  );
});

test("After reindex new pages can be found", async () => {
  await indexBook(uu5BookData);

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

  const suggest = jest.fn();
  await search("usecontext", suggest);

  expect(suggest).toHaveBeenCalledWith(
    [uu5BookNewPages.find(page => page.name.includes("useContext"))].map(page =>
      getSuggestion(page)
    )
  );
});

test("After reindex removed pages can be no longer found", async () => {
  await indexBook(uu5BookData);

  const book = (await getBooks())[0];
  await forceBookToBeReIndexed(book);

  await indexBook({
    ...uu5BookData,
    getBookStructure: {
      itemMap: uu5BookRemovedPagesItemMap,
    },
  });

  const suggest = jest.fn();
  await search("validation", suggest);

  expect(suggest).toHaveBeenCalledWith([]);
});
