import "../../assets/img/icon-34.png";
import "../../assets/img/icon-128.png";
import { indexBook, initialize, search } from "./storage";

//TODO tlatictko na smazani indexu

//Initialize page index
initialize();

// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function () {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // That fires when a page's URL contains a 'g' ...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: "uu-bookkitg01-main" },
          }),
        ],
        // And shows the extension's page action.
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]);
  });
});

// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.
chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
  //TODO throttling
  search(text, suggest);
});

// This event is fired with the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(function (text) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { url: text });
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.messageType === "bookDataRetrieved") {
    console.log("uuGle: background script retrieved book data:", request.data);
    indexBook(request.data);
  }
});
