import { subscribe } from "diagnostics_channel";
import { DataHolder } from "./index";

describe("Dataholder", () => {
  let subject: DataHolder;
  beforeEach(() => {
    subject = new DataHolder();
  });

  test("Dataholder set/get data", () => {
    const val = 42;
    const id = "test1";
    subject.setData(id, val);
    expect(subject.getData(id)).toEqual(val);
    expect(subject.hasData(id)).toBeTruthy();
  });
});
