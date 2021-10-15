import React, { useState } from "react";
import Search from "@material-ui/icons/Search";
import { List, InputAdornment, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
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

  function handleLinkClick(url, newTab) {
    openUrl(url, newTab);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      setSelectedIndex(currentSelectedIndex => {
        const newIndex = currentSelectedIndex + 1;
        return newIndex < searchResults.length
          ? newIndex
          : currentSelectedIndex;
      });
    } else if (event.key === "ArrowUp") {
      setSelectedIndex(currentSelectedIndex => {
        const newIndex = currentSelectedIndex - 1;
        return newIndex >= 0 ? newIndex : currentSelectedIndex;
      });
    } else if (event.key === "Enter") {
      if (searchResults[selectedIndex] !== undefined) {
        const selectedPage = searchResults[selectedIndex];
        openUrl(selectedPage.url, event.ctrlKey);
      }
    }
  }

  //TODO volat pro vsechny odkazy
  function openUrl(url, newTab) {
    //we do not use standard href with page url to be able to open multiple links on background tabs and to search popup remain open
    if (newTab) {
      chrome.tabs.create({ url, active: false });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        chrome.tabs.update(tab.id, { url });
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
            key={`${page.awid}/${page.code}`}
            page={page}
            selected={index === selectedIndex}
            onLinkClick={handleLinkClick}
          />
        ))}
      </List>
    </div>
  );
}

export default Popup;
