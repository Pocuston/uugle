console.log("uuGle: inject script is running");

(function () {
  let origOpen = XMLHttpRequest.prototype.open;
  //We need data from two requests to be able to index the book
  let bookData = {
    loadBook: null,
    getBookStructure: null,
  };
  XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
    if (url.includes("loadBook")) {
      this.addEventListener("load", function () {
        console.log(`uuGle: intercepted loadBook response`);
        bookData.loadBook = JSON.parse(this.responseText);
      });
    }
    if (url.includes("getBookStructure")) {
      this.addEventListener("load", function () {
        console.log(`uuGle: intercepted getBookStructure response`);
        bookData.getBookStructure = JSON.parse(this.responseText);

        //Once we have bot response data we invoke event, which is consumed by uuGle plugin to index the book
        document.dispatchEvent(
          new CustomEvent("uuGle:bookRetrieved", {
            detail: JSON.stringify(bookData),
          })
        );
      });
    }
    origOpen.apply(this, arguments);
  };
})();
