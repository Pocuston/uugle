import React, { useEffect, useState } from "react";
import logo from "../../assets/img/logo.svg";
import "./Popup.css";

const bookkitBaseUrl = "https://uuos9.plus4u.net/uu-bookkitg01-main/";

//TODO:
//https://developer.chrome.com/extensions/getstarted
//https://developer.chrome.com/extensions/omnibox
//https://developer.chrome.com/extensions/samples#search:omnibox
//http://elasticlunr.com/docs/document_store.js.html

//poorman choice for first version
//https://stackoverflow.com/questions/15995583/how-to-search-indexeddb-for-a-string

async function loadBook() {
  const response = await fetch(
    "https://uuos9.plus4u.net/uu-bookkitg01-main/78462435-b8597675362f488b92f9fe9c88cfe42e/loadBook"
  );
  console.log(response);
}

const Popup = () => {
  useEffect(getCurrentPageUrl, []);

  function getCurrentPageUrl() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let url = tabs[0].url;
      console.log(url);
      setPageUrl(url);
    });
  }

  const [pageUrl, setPageUrl] = useState(null);
  return (
    <div className="App">
      <p>Current URL: {pageUrl}</p>
    </div>
  );
};

export default Popup;
