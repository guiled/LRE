import { Component } from ".";
import {
  dynamicSetter,
  extractDataProviders,
} from "../globals/decorators/dynamicSetter";
import { Table } from "../tables/table";

type ChoiceValueWithData = ComponentValueWithData<string>;
export type ChoicesWithData = Record<
  LetsRole.ChoiceValue,
  ChoiceValueWithData | string
>;
type ChoiceData = Record<
  LetsRole.ChoiceValue,
  LetsRole.TableRow | LetsRole.ComponentValue
>;

export const UPDATE_CHECK_CHANGES = "update:checkChanges:__lre__";

export type ChoiceEvents =
  | "select"
  | "valselect"
  | "unselect"
  | "valunselect"
  | "valclick";
export class Choice<
  ValueType extends LetsRole.ComponentValue = LetsRole.ChoiceValue,
  Events extends string = LetsRole.EventType,
> extends Component<ValueType, ChoiceEvents | Events> {
  #choices: LetsRole.Choices = {};
  #choiceData: ChoiceData = {};
  #choiceDataProvider: IDataProvider | undefined;
  #currentValue: LetsRole.ComponentValue | void;
  #optional: boolean = false;
  #defaultLabel: string = "";

  constructor(
    raw: LetsRole.Component,
    sheet: ISheet,
    realId: LetsRole.ComponentID,
  ) {
    super(raw, sheet, realId);
    this.lreType("choice");

    try {
      this.#currentValue = lre.value(raw.value());
    } catch (e) {
      lre.error(`[Choice] Unable to get ${realId} value. ${e}`);
    }

    this.on(UPDATE_CHECK_CHANGES, this.#checkChanges.bind(this));
  }

  #checkChanges(choice: Component): void {
    const newValue = choice.value();

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
  @extractDataProviders(function (this: Choice, dataProvider: IDataProvider) {
    this.#choiceDataProvider = dataProvider;
  })
  setChoices(
    choices: DynamicSetValue<LetsRole.Choices | ChoicesWithData>,
  ): void {
    const currentValue: LetsRole.ChoiceValue =
      this.value() as LetsRole.ChoiceValue;
    const newChoices: LetsRole.Choices = {};
    let newValues: LetsRole.ChoiceValues = [];
    const newChoiceData: ChoiceData = {};

    if (lre.isObject<LetsRole.Choices | ChoicesWithData>(choices)) {
      newValues = Object.keys(choices);
      newValues.forEach((chVal: LetsRole.ChoiceValue) => {
        const v = choices[chVal];

        if (lre.isObject<ChoiceValueWithData>(v)) {
          newChoices[chVal] = v.value;
          newChoiceData[chVal] = v.data;
        } else {
          newChoices[chVal] = v;
          newChoiceData[chVal] = null;
        }
      });
    }

    if (!Object.prototype.hasOwnProperty.call(newChoices, currentValue)) {
      const availableValues: LetsRole.ChoiceValues = Object.keys(this.#choices);

      if (
        availableValues.length &&
        newValues.length &&
        !newValues.includes(currentValue)
      ) {
        const tmpChoices: LetsRole.Choices = {};
        tmpChoices[currentValue] = this.#choices[currentValue];
        tmpChoices[newValues[0]] = newChoices[newValues[0]];
        this.raw().setChoices(tmpChoices);
        this.value(newValues[0]);
        this.sheet().sendPendingDataFor(this.realId());
      }
    }

    this.#choices = newChoices;
    this.#choiceData = newChoiceData;
    this.#setChoicesToComponent();
    this.trigger("update", this);
  }

  #setChoicesToComponent(): void {
    try {
      super.setChoices.apply(this, [
        this.#getChoicesWithOptional(this.#choices),
      ]);
    } catch (e) {}
  }

  #getChoicesWithOptional(choices: LetsRole.Choices): LetsRole.Choices {
    const resultChoices: LetsRole.Choices = {};

    if (this.#optional) {
      resultChoices[""] = this.#defaultLabel;
    }

    return Object.assign(resultChoices, choices);
  }

  refreshChoices(): void {
    this.#setChoicesToComponent();
  }

  getChoices(): LetsRole.Choices {
    if (!this.#choices || lre.isObjectEmpty(this.#choices)) {
      LRE_DEBUG &&
        lre.warn(
          'this component has no choice available for LRE. If this Choice component is filled with a table, we recommend to use script to fill it (see choiceComponent.populate()) instead of built-in "Table/ List Label" parameters',
        );
    }

    return this.#choices;
  }

  label(value?: LetsRole.ChoiceValue): string | undefined {
    if (
      arguments.length > 0 &&
      value !== this.value() &&
      typeof value !== "undefined"
    ) {
      if (!this.#choices) {
        lre.error("No choices known for this component. Use setChoices first.");
        return "";
      }

      if (Object.prototype.hasOwnProperty.call(this.#choices, value)) {
        return this.#choices[value!];
      }

      return undefined;
    }

    return this.text();
  }

  getChoiceData(value?: LetsRole.ChoiceValue): DataProviderDataValue {
    if (this.#choiceDataProvider) {
      if (arguments.length === 0) {
        return this.#choiceDataProvider?.providedValue() || null;
      }

      if (typeof value === "undefined" || value === null) return null;
      return this.#choiceDataProvider?.getData(value) || null;
    }

    if (arguments.length <= 0 || typeof value === "undefined") {
      return this.#choiceData || null;
    }

    return this.#choiceData[value!] || null;
  }

  optional(isOptional: boolean = true, labelForDefault: string = ""): void {
    this.#optional = isOptional;
    this.#defaultLabel = labelForDefault;

    if (!lre.isObjectEmpty(this.#choices)) {
      this.#setChoicesToComponent();
    }
  }

  choiceData(
    value: LetsRole.ChoiceValue = this.value() as LetsRole.ChoiceValue,
  ): LetsRole.TableRow | LetsRole.ComponentValue {
    return this.getChoiceData(value);
  }

  valueData(): LetsRole.ComponentValue | LetsRole.TableRow {
    return this.choiceData();
  }

  valueProvider(): IDataProvider | undefined {
    return this.#choiceDataProvider?.where(this.value());
  }

  row(): LetsRole.TableRow | LetsRole.ComponentValue {
    return this.choiceData();
  }

  @dynamicSetter
  @extractDataProviders(function (this: Choice, dataProvider: IDataProvider) {
    this.#choiceDataProvider = dataProvider;
  })
  populate(
    tableOrCb: DynamicSetValue<
      string | Array<LetsRole.TableRow> | LetsRole.Choices
    >,
    label: string = "id",
    optional: boolean = false,
  ): void {
    if (arguments.length >= 2) {
      this.optional(optional);
    }

    if (Array.isArray(tableOrCb)) {
      const choices: ChoicesWithData = {};
      tableOrCb.forEach((row) => {
        choices[row.id] = {
          value: row[label],
          data: row,
        };
      });
      this.setChoices(choices);
    } else if (
      lre.isObject<BasicObject<string | LetsRole.TableRow>>(tableOrCb)
    ) {
      const choices: LetsRole.Choices = {};
      Object.keys(tableOrCb).forEach((choiceId) => {
        const currentChoice: string | LetsRole.TableRow = tableOrCb[choiceId];

        if (lre.isObject(currentChoice)) {
          let id = choiceId;
          let val = choiceId;

          if (Object.prototype.hasOwnProperty.call(currentChoice, "id")) {
            id = currentChoice.id;
          }

          if (Object.prototype.hasOwnProperty.call(currentChoice, label)) {
            val = currentChoice[label];
          }

          choices[id] = val;
        } else {
          choices[choiceId] = currentChoice;
        }
      });
      this.setChoices(choices);
    } else if (typeof tableOrCb === "string") {
      const table = Tables.get(tableOrCb) as Table | null;
      if (!table) return;
      this.setChoices(table.select(label));
    }
  }
}
