import Component from ".";
import HasRaw from "../hasraw";
import ComponentCommon from "./common";

export interface ComponentContainer<T = LetsRole.Sheet | LetsRole.Component> extends HasRaw<T>, ComponentCommon {
  get: ComponentFinder;
  find: ComponentFinder;
}
export type ComponentFinder = (id: string) => ComponentSearchResult;
export type ComponentSearchResult = Component | null;
