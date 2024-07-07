import { REP_ID_SEP } from "../component";
import { EventHolder } from "../eventholder";
import { Mixin } from "../mixin";

type PendingData = {
  v: LetsRole.ComponentValue;
  k: string;
};

type AllPendingData = Array<PendingData>;

type DataBatcherEventType = "processed" | "pending";

type PendingIndexes = Record<LetsRole.ComponentID, number>;

const ASYNC_DATA_SET_DELAY = 50;
const MAX_DATA_BATCH_SIZE = 20;
// This optimization is disabled because it naturally triggers repeater update event on every change
// Just kept in case Let's Role changed its behavior one day
const REPEATER_OPTIMIZATION_ENABLED = false;

export class DataBatcher extends Mixin(EventHolder<DataBatcherEventType>) {
  #modeHandler: ProxyModeHandler;
  #currentMode: ProxyMode;
  #sheet: LetsRole.Sheet;

  #pending: Record<ProxyMode, AllPendingData> = {
    real: [],
    virtual: [],
  };
  #indexes: Record<ProxyMode, PendingIndexes> = {
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

  #deferSendBatch(withEvent: boolean = true) {
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
    while (
      added < MAX_DATA_BATCH_SIZE &&
      this.#pending[this.#currentMode].length > 0
    ) {
      let data = this.#pending[this.#currentMode].shift()!;
      delete this.#indexes[this.#currentMode][data.k];
      if (typeof data.v !== "undefined" && !Number.isNaN(data.v)) {
        dataToSend[data.k] = data.v;
        added++;
      }
      analyzed++;
    }
    const hasMoreToSend = this.#pending[this.#currentMode].length > 0;

    if (hasMoreToSend) {
      this.#shiftIndexes(analyzed, analyzed);

      if (arguments.length === 0) {
        this.#deferSendBatch(false);
      }
    }
    if (added > 0) {
      this.#sheet.setData(dataToSend);
    }
    if (!hasMoreToSend) {
      this.#runEvent("processed");
    }
  }

  #shiftIndexes(from: number, by: number) {
    for (let k in this.#indexes[this.#currentMode]) {
      if (this.#indexes[this.#currentMode][k] >= from) {
        this.#indexes[this.#currentMode][k] -= by;
      }
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

    if (this.#addDataToPendingData(data)) {
      this.#deferSendBatch();
    }
  }

  #addDataToPendingData(data: LetsRole.ViewData): boolean {
    const indexes = this.#indexes[this.#currentMode],
      pending = this.#pending[this.#currentMode];

    for (let k in data) {
      this.#setValueToPendingData(k, data[k], pending, indexes);
    }

    return pending.length > 0;
  }

  #setValueToPendingData(
    key: string,
    value: LetsRole.ComponentValue,
    pending: AllPendingData,
    indexes: PendingIndexes
  ) {
    const componentId = REPEATER_OPTIMIZATION_ENABLED
      ? this.#getComponentIdFromKey(key)
      : key;
    if (
      !indexes.hasOwnProperty(componentId) ||
      typeof pending[indexes[componentId]] === "undefined"
    ) {
      this.#addPendingData(componentId, pending, indexes);
      if (key !== componentId) {
        pending[indexes[componentId]].v =
          this.#sheet.getData()[componentId] || {};
      }
    }
    if (key === componentId) {
      pending[indexes[componentId]].v = value;
    } else {
      this.#mergeRepeaterValueToPendingData(
        componentId,
        key as LetsRole.ComponentInRepeaterID,
        value as LetsRole.RepeaterValue,
        pending,
        indexes
      );
    }
  }

  #getComponentIdFromKey(key: string): LetsRole.ComponentID {
    return key.split(REP_ID_SEP)[0];
  }

  #addPendingData(
    key: LetsRole.ComponentInRepeaterID | LetsRole.ComponentID,
    pending: AllPendingData,
    indexes: PendingIndexes
  ) {
    indexes[key] = pending.length;
    pending.push({ k: key, v: null });
  }

  #mergeRepeaterValueToPendingData(
    repeaterId: LetsRole.ComponentID,
    key: LetsRole.ComponentInRepeaterID,
    value: LetsRole.RepeaterValue,
    pending: AllPendingData,
    indexes: PendingIndexes
  ) {
    const repeaterValue: LetsRole.RepeaterValue =
      this.#generateRepeaterValueFromKey(key, value);

    pending[indexes[repeaterId]].v = lre.deepMerge(
      pending[indexes[repeaterId]].v,
      repeaterValue
    );
  }

  #generateRepeaterValueFromKey(
    key: LetsRole.ComponentInRepeaterID,
    value: LetsRole.ComponentValue
  ): LetsRole.RepeaterValue {
    const ids = key.split(REP_ID_SEP);
    return this.#generateNestedValueFromKey(ids, value);
  }

  #generateNestedValueFromKey(
    ids: string[],
    value: LetsRole.ComponentValue
  ): LetsRole.RepeaterValue {
    const result: LetsRole.RepeaterValue = {};
    let nestedResult: LetsRole.ViewData = result;
    for (let i = 1; i < ids.length - 1; i++) {
      nestedResult = this.#createNestedValue(nestedResult, ids[i]);
    }
    nestedResult[ids[ids.length - 1]] = value;
    return result;
  }

  #createNestedValue(
    target: LetsRole.RepeaterValue | LetsRole.ViewData,
    id: string
  ): LetsRole.ViewData {
    target = typeof target === "undefined" ? ({} as LetsRole.ViewData) : target;
    if (typeof target[id] !== "object" || !target.hasOwnProperty(id)) {
      target[id] = {} as LetsRole.ViewData;
    }
    return target[id] as LetsRole.ViewData;
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
