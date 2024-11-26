import {
  dynamicSetter,
  extractDataProviders,
} from "../globals/decorators/dynamicSetter";
import { Component } from "./component";

export class Checkbox extends Component {
  #disabled: boolean = false;
  #valueWhenDisabled: LetsRole.ComponentValue | null = null;

  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("checkbox");
  }

  not(): boolean {
    return !this.value();
  }

  isEnabled(): boolean {
    return !this.#disabled;
  }

  isDisabled(): boolean {
    return this.#disabled;
  }

  #setEnabled(value: DynamicSetValue<boolean>): this {
    if (value) {
      this.removeClass("opacity-25");
      this.#disabled = false;
      this.#valueWhenDisabled = null;
      this.off("click:__lreDisabling");
      this.enableEvent("update");
    } else {
      this.addClass("opacity-25");
      this.#disabled = true;
      this.#valueWhenDisabled = this.value();
      this.on("click:__lreDisabling", this.#disableMethod.bind(this));
      this.disableEvent("update");
    }

    return this;
  }

  @dynamicSetter
  @extractDataProviders()
  enable(value: DynamicSetValue<boolean> = true): this {
    return this.#setEnabled(value);
  }

  @dynamicSetter
  @extractDataProviders()
  disable(value: DynamicSetValue<boolean> = true): this {
    return this.#setEnabled(!value);
  }

  #disableMethod(): void {
    this.value(this.#valueWhenDisabled);
  }
}
