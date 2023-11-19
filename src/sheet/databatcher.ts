import { EventHolder } from "../eventholder";

type PendingData = {
  v: LetsRole.ComponentValue;
  k: string;
};

type DataBatcherEventType = "processed" | "pending";

const ASYNC_DATA_SET_DELAY = 50;
const MAX_DATA_BATCH_SIZE = 20;

export class DataBatcher extends EventHolder<any, DataBatcherEventType> {
  #sheet: LetsRole.Sheet;

  #pending: Array<PendingData> = [];
  #indexes: Record<LetsRole.ComponentID, number> = {};

  #isSendPending: boolean = false;

  constructor(sheet: LetsRole.Sheet) {
    super(sheet.getSheetId());
    this.#sheet = sheet;
  }

  raw() {
    return this;
  }

  #sendBatch(dataToSend: LetsRole.ViewData = {}) {
    let added = Object.keys(dataToSend).length;
    let analyzed = 0;
    while (added < MAX_DATA_BATCH_SIZE && this.#pending.length > 0) {
      let data = this.#pending.shift()!;
      delete this.#indexes[data.k];
      if (typeof data.v !== "undefined" && !Number.isNaN(data.v)) {
        dataToSend[data.k] = data.v;
        added++;
      }
      analyzed++;
    }
    this.#isSendPending = this.#pending.length > 0;
    
    if (this.#isSendPending) {
      for (let k in this.#indexes) {
        if (this.#indexes[k] >= analyzed) {
          this.#indexes[k] -= analyzed;
        }
      }
      if (arguments.length === 0) {
        wait(ASYNC_DATA_SET_DELAY, this.#sendBatch.bind(this));
      }
    }
    if (added > 0) {
      this.#sheet.setData(dataToSend);
    }
    if (!this.#isSendPending) {
      try {
        this.trigger("processed");
      } catch (e) {
        lre.error('[Batcher:event:processed] ' + e);
      }
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
        wait(ASYNC_DATA_SET_DELAY, this.#sendBatch.bind(this));
        try {
          this.trigger("pending");
        } catch (e) {
          lre.error('[Batcher:event:pending] ' + e);
        }
      }
    }
  }

  #removePendingData(id: LetsRole.ComponentID): void {
    if (this.#indexes.hasOwnProperty(id)) {
      const pos = this.#indexes[id];
      delete this.#indexes[id];
      this.#pending.splice(pos, 1);
      for (let k in this.#indexes) {
        if (this.#indexes[k] >= pos) {
          this.#indexes[k]--;
        }
      }
    }
  }

  getPendingData(
    id?: LetsRole.ComponentID
  ): LetsRole.ComponentValue | undefined {
    if (!id) {
      const result: LetsRole.ViewData = {};
      this.#pending.forEach(p => result[p.k] = p.v);
      return result;
    } else if (this.#indexes.hasOwnProperty(id)) {
      return this.#pending[this.#indexes[id]].v;
    }
    return;
  }

  sendPendingDataFor(id: LetsRole.ComponentID) {
    if (this.#indexes.hasOwnProperty(id)) {
      const val = this.#pending[this.#indexes[id]].v;
      this.#removePendingData(id);
      const data: LetsRole.ViewData = {
        [id]: val,
      };
      this.#sendBatch(data);
    }
  }
}
