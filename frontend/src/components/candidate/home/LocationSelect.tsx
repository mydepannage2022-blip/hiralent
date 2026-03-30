"use client";
import Select, { components, type StylesConfig } from "react-select";
import { MapPin } from "lucide-react";
import { locationOptions } from "../../../constants/groupedLocationOptions";

const BLUE = "#005DDC";

const customStyles: StylesConfig<any, false> = {
  control: (base, state) => ({
    ...base,
    padding: "0 4px",
    borderRadius: "12px",
    border: "none",
    borderColor: "transparent",
    boxShadow: "none",
    backgroundColor: "transparent",
    minHeight: "44px",
    fontSize: "14px",
    cursor: "pointer",
    "&:hover": {
      borderColor: "transparent",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 4px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94A3B8",
    fontSize: "14px",
    fontWeight: 400,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0b1b3a",
    fontSize: "14px",
    fontWeight: 500,
  }),
  input: (base) => ({
    ...base,
    color: "#0b1b3a",
    fontSize: "14px",
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? BLUE : "#94A3B8",
    padding: "0 2px",
    transition: "color 0.15s, transform 0.2s",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    "&:hover": {
      color: BLUE,
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "#94A3B8",
    padding: "0 2px",
    "&:hover": {
      color: "#EF4444",
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "14px",
    border: "1px solid #E6ECF8",
    boxShadow: "0 12px 36px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,93,220,0.04)",
    overflow: "hidden",
    zIndex: 50,
    marginTop: "6px",
    padding: "4px",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: "220px",
    "::-webkit-scrollbar": {
      width: "4px",
    },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: "#E2E8F0",
      borderRadius: "4px",
    },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? `${BLUE}10`
      : state.isFocused
      ? "#F7FBFF"
      : "transparent",
    color: state.isSelected ? BLUE : "#0b1b3a",
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: "13px",
    padding: "9px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background-color 0.12s",
    "&:active": {
      backgroundColor: `${BLUE}12`,
    },
  }),
  groupHeading: (base) => ({
    ...base,
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#94A3B8",
    padding: "8px 12px 4px",
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: "13px",
    color: "#94A3B8",
  }),
};

/* Custom DropdownIndicator with MapPin */
function DropdownIndicator(props: any) {
  return (
    <components.DropdownIndicator {...props}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </components.DropdownIndicator>
  );
}

/* Custom Placeholder with location icon */
function CustomPlaceholder(props: any) {
  return (
    <components.Placeholder {...props}>
      <span className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" strokeWidth={2} />
        <span>Location</span>
      </span>
    </components.Placeholder>
  );
}

/* Custom SingleValue with location icon */
function CustomSingleValue(props: any) {
  return (
    <components.SingleValue {...props}>
      <span className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-[#005DDC]" strokeWidth={2} />
        <span>{props.children}</span>
      </span>
    </components.SingleValue>
  );
}

export default function LocationSelect({
  onChange,
}: {
  onChange: (value: any) => void;
}) {
  return (
    <Select
      options={locationOptions}
      placeholder="Location"
      onChange={onChange}
      isSearchable
      isClearable
      styles={customStyles}
      components={{
        DropdownIndicator,
        Placeholder: CustomPlaceholder,
        SingleValue: CustomSingleValue,
      }}
      className="w-full"
      classNamePrefix="loc"
    />
  );
}