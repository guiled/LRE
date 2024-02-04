import { Component } from ".";
import { dynamicSetter } from "../globals/decorators/dynamicSetter";

type ChoiceEvents =
  | "select"
  | "valselect"
  | "unselect"
  | "valunselect"
  | "valclick";
export class Choice extends Component<LetsRole.ComponentValue, ChoiceEvents> {
  //#choices: LetsRole.Choices = {};
  #currentValue: LetsRole.ComponentValue | void;

  constructor(
    raw: LetsRole.Component,
    sheet: ISheet,
    realId: LetsRole.ComponentID
  ) {
    super(raw, sheet, realId);
    this.lreType("choice");
    try {
      this.#currentValue = lre.value(raw.value());
    } catch (e) {
      lre.error(`[Choice] Unable to get ${realId} value. ${e}`);
    }
    this.on("update:checkChanges", this.#checkChanges.bind(this));
  }

  #checkChanges(choice: Component) {
    const newValue = choice.value()!;
    if (newValue !== this.#currentValue) {
      this.trigger(`valselect:${newValue}`);
      this.trigger("select", newValue);
      this.trigger(`valunselect:${this.#currentValue}`);
      this.trigger("unselect", this.#currentValue);
    }
    this.trigger(`valclick:${newValue}`);
    this.#currentValue = newValue;
  }

  @dynamicSetter
  setChoices(_choices?: LetsRole.Choices): void {
    super.setChoices.apply(
      this,
      Array.from(arguments) as [choices: LetsRole.Choices]
    );
  }
}
