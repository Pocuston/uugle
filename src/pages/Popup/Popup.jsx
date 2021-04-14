import React, { useState } from "react";
import Search from "@material-ui/icons/Search";
import { List, InputAdornment, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import "./Popup.css";
import PageListItem from "./PageListItem";

const useStyles = makeStyles(theme => ({
  textField: {
    width: "95%",
  },
  list: {
    overflowY: "auto",
    maxHeight: "500px",
  },
  listIconItem: {
    marginLeft: "4px",
    minWidth: "26px",
  },
  pageIcon: {
    color: theme.palette.grey.A700,
    fontSize: "1.2rem",
  },
}));

function Popup() {
  const classes = useStyles();
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  function handleSearchResponse(response) {
    setSearchResults(response.results);
    setSelectedIndex(0);
  }

  async function handleSearchFieldChange(event) {
    const query = event.target.value;
    chrome.runtime.sendMessage(
      { messageType: "searchRequest", data: { query } },
      handleSearchResponse
    );
  }

  function handlePageClick(page, newTab) {
    openPage(page, newTab);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      setSelectedIndex(selectedIndex => {
        const newIndex = selectedIndex + 1;
        return newIndex < searchResults.length ? newIndex : selectedIndex;
      });
    } else if (event.key === "ArrowUp") {
      setSelectedIndex(selectedIndex => {
        const newIndex = selectedIndex - 1;
        return newIndex >= 0 ? newIndex : selectedIndex;
      });
    } else if (event.key === "Enter") {
      if (searchResults[selectedIndex] !== undefined) {
        openPage(searchResults[selectedIndex], event.ctrlKey);
      }
    }
  }

  function openPage(page, newTab) {
    //we do not use standard href with page url to be able to open links in background tabs and to search popup remain open
    if (newTab) {
      chrome.tabs.create({ url: page.url, active: false });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        chrome.tabs.update(tab.id, { url: page.url });
      });
    }
  }

  return (
    <div>
      <TextField
        label="Search"
        variant="outlined"
        autoFocus={true}
        size={"small"}
        className={classes.textField}
        onChange={handleSearchFieldChange}
        onKeyDown={handleKeyDown}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />
      <List component="nav" dense={true} classes={{ root: classes.list }}>
        {searchResults.map((page, index) => (
          <PageListItem
            page={page}
            selected={index === selectedIndex}
            onClick={handlePageClick}
          />
        ))}
      </List>
    </div>
  );
}

export default Popup;
