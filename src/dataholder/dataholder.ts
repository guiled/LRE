type DataId = string;

export class DataHolder {
  #data: Record<DataId, any> = {};

  hasData(name: DataId): boolean {
    return this.#data.hasOwnProperty(name);
  }

  setData(name: DataId, value: any): void {
    this.#data[name] = value;
  }

  getData(name: DataId): any {
    return this.#data[name];
  }
}
