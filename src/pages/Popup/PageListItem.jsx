import {
  Link,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@material-ui/core";
import React, { useLayoutEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import iconImage from "../../assets/img/icon-16.png";

const useStyles = makeStyles(theme => ({
  listIconItem: {
    marginLeft: "4px",
    minWidth: "26px",
  },
  pageIcon: {
    color: theme.palette.grey.A700,
    fontSize: "1.2rem",
  },
  pageLink: ({ color }) => ({
    fontWeight: "500",
    color,
  }),
  breadcrumbLink: ({ color }) => ({
    color: color,
  }),
  listItemIconImage: {
    opacity: 0.8,
  },
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

  return (
    <ListItem
      key={`${page.awid}/${page.code}`}
      button
      disableGutters
      selected={selected}
      ref={selected ? selectedLisItemRef : null}
      alignItems={"flex-start"}
      onClick={event => handleLinkClick(event, page.url)}
      style={{ paddingLeft: "16px" }}
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
          <Typography variant={"caption"}>
            {page.bookName && page.bookUrl && (
              <Link
                title={page.bookUrl}
                href={page.bookUrl}
                onClick={event => handleLinkClick(event, page.bookUrl)}
                className={classes.breadcrumbLink}
              >
                {page.bookName}
              </Link>
            )}{" "}
            {page.breadcrumbs &&
              page.breadcrumbs.map(breadcrumb => {
                const breadcrumbUrl = getBreadcrumbUrl(
                  page.bookUrl,
                  breadcrumb.code
                );
                return (
                  <>
                    >{" "}
                    <Link
                      title={breadcrumbUrl}
                      href={breadcrumbUrl}
                      onClick={event => handleLinkClick(event, breadcrumbUrl)}
                      className={classes.breadcrumbLink}
                    >
                      {" "}
                      {breadcrumb.name}{" "}
                    </Link>
                  </>
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
