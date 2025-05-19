import { Component } from ".";
import { ChangeTracker } from "../globals/changetracker";
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
  | "valclick"; // todo : check if this is still necessary and remove it. This event seems to be triggered only when value doesn't change but the update event that execute this event should NOT be triggered when the value doesn't change

const choiceEvents: Array<ChoiceEvents> = [
  "select",
  "valselect",
  "unselect",
  "valunselect",
  "valclick",
];
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
  #valueProvider: IDataProvider | undefined;
  #checkWithValue: (newChoices: LetsRole.Choices) => void;

  constructor(
    raw: LetsRole.Component,
    sheet: ISheet,
    realId: LetsRole.ComponentID,
    checkWithValue?: (newChoices: LetsRole.Choices) => void,
  ) {
    super(raw, sheet, realId);
    this.lreType("choice");

    if (arguments.length >= 4) {
      this.#checkWithValue = checkWithValue!;
    } else {
      this.#checkWithValue = this.#checkChoiceWithValue.bind(this);
    }

    try {
      this.#currentValue = lre.value(raw.value());
    } catch (e) {
      lre.error(`[Choice] Unable to get ${realId} value. ${e}`);
    }

    this.on(
      "eventhandler-created:__lre__",
      this.#addSelEventHandler.bind(this),
    );
  }

  #addSelEventHandler(_target: Choice, eventName: ChoiceEvents): void {
    if (choiceEvents.includes(eventName)) {
      this.off("eventhandler-created:__lre__");
      this.on(UPDATE_CHECK_CHANGES, this.#checkChanges.bind(this));
    }
  }

  #checkChanges(choice: Component): void {
    const newValue = choice.value();

    if (newValue !== this.#currentValue) {
      this.trigger(`${choiceEvents[1]}:${newValue}`);
      this.trigger(choiceEvents[0], newValue);
      this.trigger(`${choiceEvents[3]}:${this.#currentValue}`);
      this.trigger(choiceEvents[2], this.#currentValue);
    }

    this.trigger(`${choiceEvents[4]}:${newValue}`);
    this.#currentValue = newValue;
  }

  @ChangeTracker.linkParams(undefined, [
    function (this: Choice, dataProvider: IDataProvider | undefined) {
      this.#choiceDataProvider = dataProvider;
    },
  ])
  setChoices(
    choices: DynamicSetValue<LetsRole.Choices | ChoicesWithData>,
  ): void {
    this.#valueProvider = undefined;

    const [newChoices, newChoiceData] = this.#splitChoicesAndData(choices);

    this.#checkWithValue(newChoices);

    this.#choices = newChoices;
    this.#choiceData = newChoiceData;
    this.#setChoicesToComponent();
  }

  #splitChoicesAndData(
    newChoices: DynamicSetValue<LetsRole.Choices | ChoicesWithData>,
  ): [LetsRole.Choices, ChoiceData] {
    if (!lre.isObject<LetsRole.Choices | ChoicesWithData>(newChoices)) {
      return [{}, {}];
    }

    const choices: LetsRole.Choices = {};
    const choiceData: ChoiceData = {};
    const values = Object.keys(newChoices);

    values.forEach((choiceId) => {
      const currentChoice = newChoices[choiceId];

      if (lre.isObject<ChoiceValueWithData>(currentChoice)) {
        choices[choiceId] = currentChoice.value;
        choiceData[choiceId] = currentChoice.data;
      } else {
        choices[choiceId] = currentChoice;
        choiceData[choiceId] = null;
      }
    });

    return [choices, choiceData];
  }

  #checkChoiceWithValue(newChoices: LetsRole.Choices): void {
    const currentValue: LetsRole.ChoiceValue =
      this.value() as LetsRole.ChoiceValue;
    const newAvailableValues: LetsRole.ChoiceValues = Object.keys(newChoices);

    if (!Object.prototype.hasOwnProperty.call(newChoices, currentValue)) {
      const availableValues: LetsRole.ChoiceValues = Object.keys(this.#choices);

      if (
        availableValues.length &&
        newAvailableValues.length &&
        !newAvailableValues.includes(currentValue)
      ) {
        const tmpChoices: LetsRole.Choices = {};
        tmpChoices[currentValue] = this.#choices[currentValue];
        tmpChoices[newAvailableValues[0]] = newChoices[newAvailableValues[0]];
        this.raw().setChoices(tmpChoices);
        this.setDefaultValue();
        this.sheet().sendPendingDataFor(this.realId());
      }
    }
  }

  setDefaultValue(): void {
    if (this.#optional) {
      this.value("");
    } else {
      this.value(Object.keys(this.#choices)[0]);
    }
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
    this.#valueProvider ??= this.#choiceDataProvider?.filter((_v, k, _data) => {
      const val = this.value();

      if (Array.isArray(val)) {
        return val.includes(k as string);
      }

      return k === val;
    }, "value");

    return this.#valueProvider;
  }

  row(): LetsRole.TableRow | LetsRole.ComponentValue {
    return this.choiceData();
  }

  @ChangeTracker.linkParams(undefined, [
    function (this: Choice, dataProvider: IDataProvider | undefined) {
      this.#choiceDataProvider = dataProvider;
    },
  ])
  populate(
    tableOrCb: DynamicSetValue<
      string | Array<LetsRole.TableRow> | LetsRole.Choices
    >,
    label: string = "id",
    optional: boolean = false,
  ): void {
    this.#valueProvider = undefined;

    if (Array.isArray(tableOrCb)) {
      const choices: ChoicesWithData = {};
      tableOrCb.every((row) => {
        if (typeof row.id === "undefined") {
          lre.error("Table row must have an id field");
          return false;
        } else if (typeof row[label] === "undefined") {
          lre.warn(`Table row misses a ${label} field`);
        }

        if (arguments.length >= 2) {
          this.optional(optional);
        }

        return (choices[row.id] = {
          value: row[label],
          data: row,
        });
      });
      this.setChoices(choices);
    } else if (
      lre.isObject<BasicObject<string | LetsRole.TableRow>>(tableOrCb)
    ) {
      const choices: ChoicesWithData = {};
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

          choices[id] = {
            value: val,
            data: currentChoice,
          };
        } else {
          choices[choiceId] = currentChoice;
        }
      });

      if (arguments.length >= 2) {
        this.optional(optional);
      }

      this.setChoices(choices);
    } else if (typeof tableOrCb === "string") {
      const table = Tables.get(tableOrCb) as Table | null;
      if (!table) return;

      if (arguments.length >= 2) {
        this.optional(optional);
      }

      this.setChoices(table.select(label));
    }
  }
}
