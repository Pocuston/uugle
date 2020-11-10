import "../../assets/img/icon-34.png";
import "../../assets/img/icon-128.png";
import indexBook from "../../indexBook";
import { initialize } from "../../searchIndex";
import search from "../../search";

(async function () {
  //Initialize page index
  await initialize();

  // This event is fired each time the user updates the text in the omnibox,
  // as long as the extension's keyword mode is still active.
  chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
    //TODO throttling
    search(text, suggest);
  });

  // This event is fired when the user accepts the input in the omnibox.
  chrome.omnibox.onInputEntered.addListener(function (text) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      chrome.tabs.update(currentTab.id, { url: text });
    });
  });

  // Listening for events from inject.js
  chrome.runtime.onMessage.addListener(async function (
    request,
    sender,
    sendResponse
  ) {
    if (request.messageType === "bookDataRetrieved") {
      console.log(
        "uuGle: background script retrieved book data:",
        request.data
      );
      await indexBook(request.data);
    }
  });
})();
