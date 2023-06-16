import { Sheet } from "../sheet";
import { Entry } from "./entry";
import { Repeater } from "./repeater";

export interface ComponentCommon {
  lreType: () => ComponentType;
  sheet: () => Sheet;
  realId: () => string;
  entry: (entry?: Entry) => Entry | undefined;
  repeater: (repeater?: Repeater) => Repeater | undefined;
}
