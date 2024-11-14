import { Sheet } from "../sheet";

export const DataHolder: Mixable<MixableParams, IDataHolder> = (
  superclass: Newable = class {},
) =>
  class DataHolder extends superclass implements IDataHolder {
    #data: DataStorage = {};
    #realId: string;
    #sheet: Sheet;
    #persistent: DataStorage = {};

    constructor(sheet: Sheet, realId: string) {
      super();
      this.#realId = realId;
      this.#sheet = sheet;
      this.#persistent = this.loadPersistent();
    }

    hasData(name: DataId): boolean {
      return (
        Object.prototype.hasOwnProperty.call(this.#data, name) ||
        Object.prototype.hasOwnProperty.call(this.#persistent, name)
      );
    }

    data(
      name: DataId,
      value: DataType = "",
      persistent = false,
    ): this | DataType {
      if (arguments.length === 1) {
        return this.#getData(name);
      }

      if (persistent) {
        this.#setPersistent(name, value);
      } else {
        this.#setData(name, value);
      }

      return this;
    }

    deleteData(name: DataId, persistent: boolean = false): this {
      if (persistent) {
        this.#deletePersistent(name);
      } else {
        this.#deleteData(name);
      }

      return this;
    }

    loadPersistent(): DataStorage {
      lre.trace(`Load persistent data for ${this.#realId}`);
      return (this.#persistent =
        this.#sheet.persistingCmpData(this.#realId) || {});
    }

    #savePersistent(): void {
      lre.trace(`Save persistent data for ${this.#realId}`);
      this.#sheet.persistingCmpData(
        this.#realId,
        this.#persistent as LetsRole.ViewData,
      );
    }

    #setData(name: DataId, value: DataType): void {
      this.#data[name] = value;
      this.#deletePersistent(name);
    }

    #setPersistent(name: DataId, value: DataType): void {
      this.#persistent[name] = value;
      this.#deleteData(name);
      this.#savePersistent();
    }

    #getData(name: DataId): DataType {
      if (Object.prototype.hasOwnProperty.call(this.#data, name)) {
        return this.#data[name];
      } else if (Object.prototype.hasOwnProperty.call(this.#persistent, name)) {
        return this.#persistent[name];
      }

      return undefined;
    }

    #deleteData(name: DataId): void {
      if (Object.prototype.hasOwnProperty.call(this.#data, name)) {
        delete this.#data[name];
      }
    }

    #deletePersistent(name: DataId): void {
      if (Object.prototype.hasOwnProperty.call(this.#persistent, name)) {
        delete this.#persistent[name];
        this.#savePersistent();
      }
    }
  };
