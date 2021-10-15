import {
  Link,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@material-ui/core";
import React, { useLayoutEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import KeyboardArrowRightIcon from "@material-ui/icons/ArrowRight";
import iconImage from "../../assets/img/icon-16.png";

const useStyles = makeStyles(theme => ({
  listItem: {
    paddingLeft: "8px",
  },
  pageLink: {
    fontWeight: "500",
  },
  breadcrumb: {
    color: theme.palette.grey.A700,
  },
}));

export default function PageListItem({ page, selected, onLinkClick }) {
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
    >
      <ListItemIcon classes={{ root: classes.listIconItem }}>
        <img
          src={iconImage}
          width={16}
          height={16}
          className={classes.listItemIconImage}
          alt={"Book page icon"}
        />
      </ListItemIcon>
      <ListItemText
        primary={
          <Link
            title={page.url}
            href={page.url}
            className={classes.pageLink}
            onClick={event => handleLinkClick(event, page.url)}
          >
            {page.bookName && `${page.bookName} - `}
            {page.name}
          </Link>
        }
        secondary={
          <Typography variant={"caption"} className={classes.breadcrumb}>
            {showHomeLink() && (
              <Link
                title={page.bookUrl}
                href={page.bookUrl}
                onClick={event => handleLinkClick(event, page.bookUrl)}
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
