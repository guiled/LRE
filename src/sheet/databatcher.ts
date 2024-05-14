import { REP_ID_SEP } from "../component";
import { EventHolder } from "../eventholder";
import { structuredClone } from "../globals/structuredClone";
import { Mixin } from "../mixin";

type PendingData = {
  v: LetsRole.ComponentValue;
  k: string;
};

type DataBatcherEventType = "processed" | "pending";

const ASYNC_DATA_SET_DELAY = 50;
const MAX_DATA_BATCH_SIZE = 20;

export class DataBatcher extends Mixin(EventHolder<DataBatcherEventType>) {
  #modeHandler: ProxyModeHandler;
  #currentMode: ProxyMode;
  #sheet: LetsRole.Sheet;

  #pending: Record<ProxyMode, Array<PendingData>> = {
    real: [],
    virtual: [],
  };
  #indexes: Record<ProxyMode, Record<LetsRole.ComponentID, number>> = {
    real: {},
    virtual: {},
  };

  #isSendPending: boolean = false;

  constructor(modeHandler: ProxyModeHandler, sheet: LetsRole.Sheet) {
    super([[`batcher-${sheet.id()}-${sheet.getSheetId()}`]]);
    this.#modeHandler = modeHandler;
    this.#currentMode = modeHandler.getMode();
    this.#sheet = sheet;
  }

  #checkMode() {
    const mode = this.#modeHandler.getMode();
    if (mode === "virtual" && this.#currentMode !== "virtual") {
      this.#indexes.virtual = {};
      this.#pending.virtual = [];
    }
    this.#currentMode = mode;
  }

  #runEvent(eventName: DataBatcherEventType) {
    this.trigger(eventName);
  }

  #runSendBatch(withEvent: boolean = true) {
    if (this.#currentMode === "virtual") {
      withEvent && this.#runEvent("pending");
      this.#sendBatch();
    } else if (!this.#isSendPending) {
      this.#isSendPending = true;
      lre.wait(ASYNC_DATA_SET_DELAY, this.#sendBatch.bind(this), "sendBatch");
      withEvent && this.#runEvent("pending");
    }
  }

  #sendBatch(dataToSend: LetsRole.ViewData = {}) {
    this.#isSendPending = false;
    let added = Object.keys(dataToSend).length;
    let analyzed = 0;
    const currentSheetData = this.#sheet.getData();
    while (
      added < MAX_DATA_BATCH_SIZE &&
      this.#pending[this.#currentMode].length > 0
    ) {
      let data = this.#pending[this.#currentMode].shift()!;
      delete this.#indexes[this.#currentMode][data.k];
      if (typeof data.v !== "undefined" && !Number.isNaN(data.v)) {
        const ids = data.k.split(REP_ID_SEP);
        if (ids.length === 1) {
          dataToSend[ids[0]] = data.v;
          added++;
        } else {
          const currentData = currentSheetData[ids[0]] || {};
          const newData = dataToSend[ids[0]] || structuredClone(currentData);
          if (!newData.hasOwnProperty(ids[1])) {
            newData[ids[1]] = {};
          }
          if (ids.length === 3) {
            newData[ids[1]][ids[2]] = data.v;
          } else {
            newData[ids[1]] = data.v
          }
          if (!lre.deepEqual(newData, currentData)) {
            added++;
            dataToSend[ids[0]] = newData;
          }
        }
      }
      analyzed++;
    }
    const hasMoreToSend = this.#pending[this.#currentMode].length > 0;

    if (hasMoreToSend) {
      for (let k in this.#indexes[this.#currentMode]) {
        if (this.#indexes[this.#currentMode][k] >= analyzed) {
          this.#indexes[this.#currentMode][k] -= analyzed;
        }
      }
      if (arguments.length === 0) {
        this.#runSendBatch(false);
      }
    }
    if (added > 0) {
      this.#sheet.setData(dataToSend);
    }
    if (!hasMoreToSend) {
      this.#runEvent("processed");
    }
  }

  #removePendingData(id: LetsRole.ComponentID): void {
    if (this.#indexes[this.#currentMode].hasOwnProperty(id)) {
      const pos = this.#indexes[this.#currentMode][id];
      delete this.#indexes[this.#currentMode][id];
      this.#pending[this.#currentMode].splice(pos, 1);
      for (let k in this.#indexes[this.#currentMode]) {
        if (this.#indexes[this.#currentMode][k] >= pos) {
          this.#indexes[this.#currentMode][k]--;
        }
      }
    }
  }

  raw() {
    return this;
  }

  setData(data: LetsRole.ViewData): void {
    this.#checkMode();
    const indexes = this.#indexes[this.#currentMode],
      pending = this.#pending[this.#currentMode];

    for (let k in data) {
      const v = data[k];

      if (
        indexes.hasOwnProperty(k) &&
        typeof pending[indexes[k]] !== "undefined"
      ) {
        pending[indexes[k]].v = v;
      } else {
        indexes[k] = pending.length;
        pending.push({ k, v });
      }
    }
    if (pending.length > 0) {
      this.#runSendBatch();
    }
  }

  getPendingData(
    id?: LetsRole.ComponentID
  ): LetsRole.ComponentValue | undefined {
    this.#checkMode();
    if (!id) {
      const result: LetsRole.ViewData = {};
      this.#pending.real.forEach((p) => (result[p.k] = p.v));
      if (this.#currentMode === "virtual") {
        this.#pending.virtual.forEach((p) => (result[p.k] = p.v));
      }
      return result;
      // The following case should never happens as virtual mode immediately sends pendingData.
      // This code is saved ni order to restore it if we change the virtual way to work of wait()
      //} else if (
      //  this.#currentMode === "virtual" &&
      //  this.#indexes.virtual.hasOwnProperty(id)
      //) {
      //  return this.#pending.virtual[this.#indexes.virtual[id]].v;
    } else if (this.#indexes.real.hasOwnProperty(id)) {
      return this.#pending.real[this.#indexes.real[id]].v;
    }
    return;
  }

  sendPendingDataFor(id: LetsRole.ComponentID) {
    this.#checkMode();
    if (this.#indexes[this.#currentMode].hasOwnProperty(id)) {
      const val =
        this.#pending[this.#currentMode][this.#indexes[this.#currentMode][id]]
          .v;
      this.#removePendingData(id);
      const data: LetsRole.ViewData = {
        [id]: val,
      };
      this.#sendBatch(data);
    }
  }
}
