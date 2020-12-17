import React from "react";
import InputNumber from "antd/lib/input-number";

export default function NumberField({
  form,
  field,
  ...otherProps
}: any) {
  return <InputNumber {...otherProps} />;
}
