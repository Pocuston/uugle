//TODO rename to content.js
console.log("uuGle: content script started");

/**
 * We listen for event from inject.js script, who sends us loaded book data.
 * We add current page URL to this data and send message to background script.
 */
document.addEventListener("uuGle:bookRetrieved", function (e) {
  const data = { ...JSON.parse(e.detail), url: location.href };
  console.log("uuGle: received book data from inject script", data);
  chrome.runtime.sendMessage({ messageType: "bookDataRetrieved", data: data });
});

//content script run in isolated context, so we need to inject script into the page
//see https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
const scriptElement = document.createElement("script");
scriptElement.src = chrome.runtime.getURL("inject.bundle.js");
scriptElement.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(scriptElement);
