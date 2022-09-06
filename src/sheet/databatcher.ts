import EventHolder from "../eventholder";

type PendingData = {
  k: LetsRole.ComponentID;
  v: LetsRole.ComponentValue;
};

const ASYN_DATA_SET_DELAY = 50;
const MAX_DATA_BATCH_SIZE = 20;

export default class DataBatcher extends EventHolder {
  #sheet: LetsRole.Sheet;

  #pending: Array<PendingData> = [];
  #indexes: Record<LetsRole.ComponentID, number> = {};

  #isSendPending: boolean = false;

  constructor(sheet: LetsRole.Sheet) {
    super({});
    this.#sheet = sheet;
    Object.assign(this, new EventHolder(this));
  }

  #sendBatch() {
    const dataToSend: LetsRole.ViewData = {};
    let added = 0;
    let analysed = 0;
    while (added < MAX_DATA_BATCH_SIZE && this.#pending.length > 0) {
      let data = this.#pending.shift();
      delete this.#indexes[data!.k];
      if (typeof data!.v !== "undefined" && !Number.isNaN(data!.v)) {
        dataToSend[data!.k] = data!.v;
        added++;
      }
      analysed++;
    }
    this.#isSendPending = this.#pending.length > 0;
    if (this.#isSendPending) {
      for (let k in this.#indexes) {
        if (this.#indexes[k] >= analysed) {
          this.#indexes[k] -= analysed;
        }
      }
      wait(ASYN_DATA_SET_DELAY, this.#sendBatch);
    }
    this.#sheet.setData(dataToSend);
    if (!this.#isSendPending) {
      this.trigger("click");
    }
  }

  setData(data: LetsRole.ViewData): void {
    for (let k in data) {
      const v = data[k];
      if (
        this.#indexes.hasOwnProperty(k) &&
        typeof this.#pending[this.#indexes[k]] !== "undefined"
      ) {
        this.#pending[this.#indexes[k]].v = v;
      } else {
        this.#indexes[k] = this.#pending.length;
        this.#pending.push({ k, v });
      }
      if (!this.#isSendPending && this.#pending.length > 0) {
        this.#isSendPending = true;
        wait(ASYN_DATA_SET_DELAY, this.#sendBatch);
      }
    }
  }
}
