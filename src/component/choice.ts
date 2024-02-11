import { Component } from ".";
import { dynamicSetter } from "../globals/decorators/dynamicSetter";

type ChoiceEvents =
  | "select"
  | "valselect"
  | "unselect"
  | "valunselect"
  | "valclick";
export class Choice extends Component<LetsRole.ChoiceValue, ChoiceEvents> {
  #choices: LetsRole.Choices = {};
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
  setChoices(choices?: LetsRole.Choices): void {
    const currentValue: LetsRole.ChoiceValue = this.value()!;

    if (choices && !choices.hasOwnProperty(currentValue)) {
      const availableValues: LetsRole.ChoiceValues = Object.keys(this.#choices);
      const newValues: LetsRole.ChoiceValues = Object.keys(choices);
      if (
        availableValues.length &&
        newValues.length &&
        !newValues.includes(currentValue)
      ) {
        const tmpChoices: LetsRole.Choices = {};
        tmpChoices[currentValue] = this.#choices[currentValue];
        tmpChoices[newValues[0]] = choices[newValues[0]];
        this.raw().setChoices(tmpChoices);
        this.value(newValues[0]);
        this.sheet().sendPendingDataFor(this.realId());
      }
    }
    this.#choices = choices!;
    super.setChoices.apply(this, Array.from(arguments) as [LetsRole.Choices]);
    this.trigger("update", this);
  }

  getChoices(): LetsRole.Choices {
    if (!this.#choices || Object.keys(this.#choices).length === 0) {
      lre.warn(
        'this component has no choice available for LRE. If this Choice component is filled with a table, we recommend to use script to fill it (see choiceComponent.populate()) instead of built-in "Table/ List Label" parameters'
      );
    }
    return this.#choices;
  }

  label(): string {
    return this.text()!;
  }
}
