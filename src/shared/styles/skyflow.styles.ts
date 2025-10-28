import {CollectInputStylesVariant, CollectLabelStylesVariant} from "../../types/commons";
import {LabelStyles} from "skyflow-js/types/utils/common";

const DEFAULT_SKYFLOW_INPUT_STYLES: CollectInputStylesVariant = {
  base: {
    border: "1px solid #e0e0e0",
    padding: "10px 7px",
    borderRadius: "5px",
    color: "#1d1d1d",
    marginTop: "2px",
    backgroundColor: "white",
    fontFamily: '"Inter", sans-serif',
    fontSize: "16px",
    "&::placeholder": {
      color: "#ccc",
    },
  },
  complete: {
    color: "#4caf50",
  },
  invalid: {
    border: "1px solid #f44336",
  },
  empty: {},
  focus: {},
  global: {
    "@import":
      'url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap")',
  },
};

const DEFAULT_SKYFLOW_lABEL_STYLES: LabelStyles = {
  base: {
    fontSize: "12px",
    fontWeight: "500",
    fontFamily: '"Inter", sans-serif'
  },
};

const DEFAULT_SKYFLOW_ERROR_TEXT_STYLES: CollectLabelStylesVariant = {
  base: {
      fontSize: '12px',
      fontWeight: '500',
      fontFamily: '"Inter", sans-serif',
      color: "#f44336",
  },
}

const SKYFLOW_HIDDEN_ERROR_TEXT_STYLES = {
  base: {
      fontSize: '12px',
      fontWeight: '500',
      color: "#f44336",
      fontFamily: '"Inter", sans-serif'
  },
};

export {
  DEFAULT_SKYFLOW_INPUT_STYLES,
  DEFAULT_SKYFLOW_lABEL_STYLES,
  DEFAULT_SKYFLOW_ERROR_TEXT_STYLES,
  SKYFLOW_HIDDEN_ERROR_TEXT_STYLES,
};
