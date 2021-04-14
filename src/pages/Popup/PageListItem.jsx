import { Link, ListItem, ListItemIcon, ListItemText } from "@material-ui/core";
import BookmarkTwoToneIcon from "@material-ui/icons/BookmarkTwoTone";
import React, { useLayoutEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  listIconItem: {
    marginLeft: "4px",
    minWidth: "26px",
  },
  pageIcon: {
    color: theme.palette.grey.A700,
    fontSize: "1.2rem",
  },
}));

export default function PageListItem({ page, selected, onClick }) {
  const classes = useStyles();
  const selectedLisItemRef = useRef();

  useLayoutEffect(() => {
    if (
      selected &&
      selectedLisItemRef.current &&
      !isElementInViewport(selectedLisItemRef.current)
    ) {
      selectedLisItemRef.current.scrollIntoView(false);
    }
  }, [selected]);

  function handlePageClick(event) {
    onClick(page, event.ctrlKey);
    event.preventDefault();
  }

  return (
    <ListItem
      onClick={handlePageClick}
      key={`${page.awid}/${page.code}`}
      button
      disableGutters
      selected={selected}
      ref={selected ? selectedLisItemRef : null}
    >
      <ListItemIcon classes={{ root: classes.listIconItem }}>
        <BookmarkTwoToneIcon className={classes.pageIcon} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Link title={page.url} href={page.url}>
            {page.name}
          </Link>
        }
      />
    </ListItem>
  );
}

function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
