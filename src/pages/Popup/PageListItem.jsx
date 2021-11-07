import { Link, ListItem, ListItemText, Typography } from "@material-ui/core";
import React, { useLayoutEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import KeyboardArrowRightIcon from "@material-ui/icons/ArrowRight";
import PageState from "./PageState";

const useStyles = makeStyles(theme => ({
  listItem: {
    paddingLeft: "8px",
  },
  pageLink: ({ color }) => ({
    fontWeight: "500",
    color,
  }),
  breadcrumbLink: ({ color }) => ({
    color: color,
  }),
}));

export default function PageListItem({ page, selected, onLinkClick }) {
  const classes = useStyles({ color: page.color });
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

  function handleLinkClick(event, url) {
    onLinkClick(url, event.ctrlKey);
    event.preventDefault();
    event.stopPropagation();
  }

  function showBreadCrumbs() {
    return page.breadcrumbs && page.breadcrumbs.length > 0;
  }

  function showHomeLink() {
    return page.bookName && page.bookUrl && showBreadCrumbs();
  }

  return (
    <ListItem
      button
      disableGutters
      selected={selected}
      ref={selected ? selectedLisItemRef : null}
      alignItems={"flex-start"}
      onClick={event => handleLinkClick(event, page.url)}
      className={classes.listItem}
    >
      <ListItemText
        primary={
          <>
            <Link
              title={page.url}
              href={page.url}
              className={classes.pageLink}
              onClick={event => handleLinkClick(event, page.url)}
            >
              {page.bookName && `${page.bookName} - `}
              {page.name}
            </Link>
            <PageState state={page.state} />
          </>
        }
        secondary={
          <Typography variant={"caption"}>
            {showHomeLink() && (
              <Link
                title={page.bookUrl}
                href={page.bookUrl}
                onClick={event => handleLinkClick(event, page.bookUrl)}
                className={classes.breadcrumbLink}
              >
                Home
              </Link>
            )}
            {showBreadCrumbs() &&
              page.breadcrumbs.map(breadcrumb => {
                const breadcrumbUrl = getBreadcrumbUrl(
                  page.bookUrl,
                  breadcrumb.code
                );
                return (
                  <React.Fragment key={breadcrumb.code}>
                    <KeyboardArrowRightIcon
                      style={{ verticalAlign: "text-bottom", fontSize: "16px" }}
                    />
                    <Link
                      key={breadcrumb.code}
                      title={breadcrumbUrl}
                      href={breadcrumbUrl}
                      onClick={event => handleLinkClick(event, breadcrumbUrl)}
                      className={classes.breadcrumbLink}
                    >
                      {breadcrumb.name}
                    </Link>
                  </React.Fragment>
                );
              })}
          </Typography>
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

function getBreadcrumbUrl(bookUrl, code) {
  return `${bookUrl}/book/page?code=${code}`;
}
