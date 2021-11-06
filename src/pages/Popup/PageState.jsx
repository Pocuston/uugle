import React from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  underConstruction: {
    color: "rgb(0, 0, 0)",
    backgroundColor: "rgb(245, 166, 35)",
    borderRadius: "50%",
    border: "2px solid #fff",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 50%)",
    fontWeight: "bold",
    fontSize: "10px",
    minWidth: "16px",
    minHeight: "1px",
    marginLeft: "8px",
    paddingTop: "2px",
    display: "inline-block",
    textAlign: "center",
  },
});

export default function PageState({ state }) {
  const classes = useStyles();
  return state === "underConstruction" ? (
    <span className={classes.underConstruction}>W</span>
  ) : null;
}
