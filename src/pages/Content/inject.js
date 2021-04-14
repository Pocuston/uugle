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

  //Later, uu5 requests are made using fetch instead of xhr, so we must intercept also fetch responses
  const fetch = window.fetch;
  window.fetch = (...args) =>
    (async args => {
      const response = await fetch(...args);
      if (response.url.includes("loadBook")) {
        console.log(`uuGle: intercepted loadBook response`);
        bookData.loadBook = await response.clone().json();
      } else if (response.url.includes("getBookStructure")) {
        console.log(`uuGle: intercepted getBookStructure response`);
        bookData.getBookStructure = await response.clone().json();

        //Once we have bot response data we invoke event, which is consumed by uuGle plugin to index the book
        document.dispatchEvent(
          new CustomEvent("uuGle:bookRetrieved", {
            detail: JSON.stringify(bookData),
          })
        );
      }
      return response;
    })(args);
})();
