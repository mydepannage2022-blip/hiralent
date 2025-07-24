"use client";

import Select from "react-select";
import {locationOptions} from "../../../constants/groupedLocationOptions"; // use grouped or flat as you like

export default function LocationSelect({ onChange }: { onChange: (value: any) => void }) {
  return (
    <Select
      options={locationOptions}
      placeholder="Search city or country..."
      onChange={onChange}
      isSearchable={true}
      className="w-full md:w-64"
      styles={{
        control: (base) => ({
          ...base,
          padding: "4px",
          borderRadius: "8px",
          borderColor: "#ccc",
          boxShadow: "none",
        }),
      }}
    />
  );
}
