import "./assets/img/icon-34.png";
import "./assets/img/icon-128.png";
import indexBook from "./indexBook";
import { initialize } from "./searchIndex";
import { search, searchAndSuggest } from "./search";

(async function() {
  //Initialize page index
  await initialize();

  // Not all browsers have omnibox (for example Safari)
  if (chrome.omnibox) {
    // This event is fired each time the user updates the text in the omnibox,
    // as long as the extension's keyword mode is still active.
    chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
      searchAndSuggest(text, suggest);
    });

    // This event is fired when the user accepts the input in the omnibox.
    chrome.omnibox.onInputEntered.addListener(function(text) {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        chrome.tabs.update(currentTab.id, { url: text });
      });
    });
  }

  // Listening for events from inject.js
  chrome.runtime.onMessage.addListener(function(
    request,
    sender,
    sendResponse
  ) {
    if (request.messageType === "bookDataRetrieved") {
      console.log(
        "uuGle: background script retrieved book data:",
        request.data
      );
      indexBook(request.data);
    } else if (request.messageType === "searchRequest") {
      console.log("uuGle: search request", request);
      const {
        data: { query },
      } = request;

      search(query).then(results => sendResponse({ results }));

      //we return true to indicate that sendResponse will be called asynchronously
      return true;
    }
  });
})();
