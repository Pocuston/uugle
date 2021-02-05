import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import "./Popup.css";

class Popup extends Component {
  render() {
    return (
      <div>
        <h1>This is the Popup Window</h1>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button variant="contained" color="primary">
            Hello World
          </Button>
        </div>
      </div>
    );
  }
}

export default Popup;
