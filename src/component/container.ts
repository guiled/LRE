import { Sheet } from "../sheet";
import { Component } from "./component";

export interface ComponentContainer {
  get: ComponentFinder;
  find: ComponentFinder;
  lreType(): ComponentType;
  realId(): string;
  sheet(): Sheet;
}
export type ComponentFinder = (id: string) => ComponentSearchResult;
export type ComponentSearchResult = Component | null;

export class Container extends Component {
  constructor(raw: LetsRole.Component, sheet: Sheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("container");
  }
}
