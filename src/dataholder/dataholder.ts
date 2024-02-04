import { Sheet } from "../sheet";

type DataId = string;

export const DataHolder: Mixable<any[], IDataHolder> = (
  superclass: Newable = class {}
) =>
  class DataHolder extends superclass implements IDataHolder {
    #data: Record<DataId, any> = {};
    #realId: string;
    #sheet: Sheet;
    #persistent: LetsRole.ViewData = {};

    constructor(sheet: Sheet, realId: string) {
      super();
      this.#realId = realId;
      this.#sheet = sheet;
      this.#persistent = this.loadPersistent();
    }

    hasData(name: DataId): boolean {
      return (
        this.#data.hasOwnProperty(name) || this.#persistent.hasOwnProperty(name)
      );
    }

    data(name: DataId, value: any = "", persistent = false): this {
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

    loadPersistent(): LetsRole.ViewData {
      lre.trace(`Load persistent data for ${this.#realId}`);
      return (this.#persistent =
        this.#sheet.persistingCmpData(this.#realId) || {});
    }

    #savePersistent(): void {
      lre.trace(`Save persistent data for ${this.#realId}`);
      this.#sheet.persistingCmpData(this.#realId, this.#persistent);
    }

    #setData(name: DataId, value: any): void {
      this.#data[name] = value;
      this.#deletePersistent(name);
    }

    #setPersistent(name: DataId, value: any): void {
      this.#persistent[name] = value;
      this.#deleteData(name);
      this.#savePersistent();
    }

    #getData(name: DataId): any {
      if (this.#data.hasOwnProperty(name)) {
        return this.#data[name];
      } else if (this.#persistent.hasOwnProperty(name)) {
        return this.#persistent[name];
      }
      return undefined;
    }

    #deleteData(name: DataId): void {
      if (this.#data.hasOwnProperty(name)) {
        delete this.#data[name];
      }
    }

    #deletePersistent(name: DataId): void {
      if (this.#persistent.hasOwnProperty(name)) {
        delete this.#persistent[name];
        this.#savePersistent();
      }
    }
  };
