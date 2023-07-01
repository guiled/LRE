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
