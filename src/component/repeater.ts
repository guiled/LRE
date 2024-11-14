import { Component, REP_ID_SEP } from "./component";
import { Entry } from "./entry";

type RepeaterEvents =
  | "initread"
  | "save"
  | "init"
  | "edit"
  | "initedit"
  | "delete"
  | "new"
  | "dataChange"
  | "entrychange";

type DefinedRepeaterValue = Exclude<LetsRole.RepeaterValue, undefined>;

export class Repeater extends Component<
  LetsRole.RepeaterValue,
  RepeaterEvents
> {
  #savedValue: DefinedRepeaterValue = {};

  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("repeater");
    this.on(
      "eventhandler-added:__lre__:__rep__",
      this.#runInitReadEvent.bind(this),
    );
    const currentValue = this.#saveValue();

    if (typeof currentValue !== "object" || currentValue === null) {
      this.value({});
    }

    this.on("click:__lre__", this.#clickHandler.bind(this));
    this.on("update:__lre__", this.#updateHandler.bind(this));
  }

  #saveValue(value?: LetsRole.RepeaterValue): DefinedRepeaterValue {
    if (arguments.length === 0) {
      value = this.sheet().getData(this.realId()) as LetsRole.RepeaterValue;
    }

    this.#savedValue = structuredClone(value || {});

    return this.#savedValue;
  }

  // protect repeater : overwrite repeater "text" will break it (unable to setData on it)
  text(): string {
    return super.text();
  }

  #runInitReadEvent(
    _cmp: this,
    event: RepeaterEvents,
    _subComponent: unknown,
    callback: (
      cmp: this,
      entry: Entry,
      entryId: LetsRole.Index,
      value: LetsRole.ViewData,
    ) => void,
  ): void {
    if (event === "initread") {
      const val = this.value();

      for (const entryId in val) {
        const entry = this.find(entryId) as Entry;

        if (!entry?.hasClass("editing")) {
          callback.call(this, this, entry, entryId, val[entryId]);
        }
      }
    }
  }

  #clickHandler(): void {
    const newValues = this.value()!;

    if (!newValues) {
      return;
    }

    each(newValues, (entryData: LetsRole.ViewData, entryId: LetsRole.Index) => {
      const entry = this.find(entryId)!;

      if (!Object.prototype.hasOwnProperty.call(this.#savedValue, entryId)) {
        if (!entry.data("initialized")) {
          entry.data("initialized", true);
          entry.data("saved", false);
          entry.data(
            "children",
            this.sheet()
              .knownChildren(entry)
              .map((c) => c.realId()),
          );
          // Save the data before potential changes in init event
          // I don't remember the reason of this line
          //const valueSave = structuredClone(entryData);
          this.trigger("init", entry, entryId, entryData);
          this.trigger("initedit", entry, entryId, entryData);
          //this.#applyValuesToEntry(entryId, valueSave);
        }
      } else if (
        entry.hasClass("editing") &&
        (!entry.hasData("saved") || entry.data("saved"))
      ) {
        entry.data("saved", false);
        entry.data(
          "children",
          this.sheet()
            .knownChildren(entry)
            .map((c) => c.realId()),
        );

        // Refresh all raw component of each entry children
        entry.knownChildren().forEach(function (child) {
          if (child && child.exists()) {
            child.refreshRaw();
          }
        });

        this.trigger("edit", entry, entryId, entryData);
        this.trigger("initedit", entry, entryId, entryData);
      }
    });
  }

  // #applyValuesToEntry(entryId: LetsRole.Index, value: LetsRole.ViewData) {
  //   const entry = this.find(entryId) as Entry;
  //   if (!entry.exists()) {
  //     return;
  //   }

  //   const values = this.value() as DefinedRepeaterValue;

  //   if (!Object.prototype.hasOwnProperty.call(values, entryId)) {
  //     values[entryId] = {};
  //   }

  //   each(value, (val, key) => {
  //     values[entryId][key] = val;
  //     const child = entry.find(key);
  //     // The child may not exists as the edit view is being closed by click on "Done"
  //     if (child?.exists()) {
  //       child.value(val);
  //     }
  //   });
  // }

  #updateHandler(): void {
    const newValues = this.value() as DefinedRepeaterValue;
    let somethingChanged = false;
    each(
      this.#savedValue,
      (oldEntryData: LetsRole.ViewData, entryId: LetsRole.Index) => {
        if (!Object.prototype.hasOwnProperty.call(newValues, entryId)) {
          this.trigger("delete", entryId, oldEntryData);
          this.sheet().forget(this.realId() + REP_ID_SEP + entryId);
          somethingChanged = true;
        } else {
          const entry = this.find(entryId) as Entry;
          const newEntryValue = newValues[entryId];

          if (!lre.deepEqual(oldEntryData, newEntryValue)) {
            this.trigger(
              "entrychange",
              entry,
              entryId,
              newEntryValue,
              oldEntryData,
            );
            somethingChanged = true;
          }

          // Refresh all raw component of each entry children
          entry.knownChildren().forEach((child) => {
            if (child && child.exists()) {
              child.refreshRaw();
            }
          });

          if (entry.hasData("saved") && !entry.data("saved")) {
            entry.data("saved", true);
            this.trigger("save", entry, entryId, newEntryValue, oldEntryData);
          }

          if (
            !entry.hasClass("lre_initread") ||
            !lre.deepEqual(newEntryValue, oldEntryData)
          ) {
            this.trigger("initread", entryId, newEntryValue, oldEntryData);
            entry.addClass("lre_initread");
          }

          if (entry.hasData("children")) {
            let oldChildren: Array<LetsRole.ComponentID> = entry.data(
              "children",
            ) as Array<LetsRole.ComponentID>;

            if (!Array.isArray(oldChildren)) {
              oldChildren = [];
            }

            const addedChildren: Array<LetsRole.ComponentID> = this.sheet()
              .knownChildren(entry)
              .map((c) => c.realId());

            each(oldChildren, (realId: LetsRole.ComponentID) => {
              if (!addedChildren.includes(realId)) {
                this.sheet().forget(realId);
              }
            });
          }
        }
      },
    );

    // New entries
    each(newValues, (entryData: LetsRole.ViewData, entryId: LetsRole.Index) => {
      if (!Object.prototype.hasOwnProperty.call(this.#savedValue, entryId)) {
        const entry = this.find(entryId) as Entry;
        entry.data("saved", true);
        this.trigger("save", entry, entryId, entryData, {});
        this.trigger("initread", entry, entryId, entryData, {});
        this.trigger("new", entry, entryId, entryData, {});
        entry.addClass("lre_initread");
        somethingChanged = true;
      }
    });

    if (somethingChanged) {
      this.trigger("dataChange");
    }

    this.#saveValue();
  }

  find(id: LetsRole.ComponentID, silent = false): ComponentSearchResult {
    // Apply new repeater values if pending, in order to have up to date entries
    this.sheet().sendPendingDataFor(this.realId());
    return this.sheet().get(
      this.realId() + REP_ID_SEP + id,
      silent,
    ) as ComponentSearchResult;
  }

  // add() {

  // }

  // remove() {

  // }
}
