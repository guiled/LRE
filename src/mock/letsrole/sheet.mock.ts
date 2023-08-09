import { MockComponent } from "./component.mock";

type Params = {
  id: string;
};

export type MockedSheet = LetsRole.Sheet;

export const MockSheet = ({ id }: Params): MockedSheet => {
  const sheet: MockedSheet = {
    id: jest.fn(() => id),
    getSheetId: jest.fn(() => "12345"),
    name: jest.fn(() => "name"),
    properName: jest.fn(() => "properName"),
    get: jest.fn((cmpId: LetsRole.ComponentID) =>
      MockComponent({ id: cmpId, sheet })
    ),
    getVariable: jest.fn((id: string) => 12),
    prompt: (
      title: string,
      view: string,
      callback: (result: LetsRole.ViewData) => void,
      callbackInit: (promptView: LetsRole.Sheet) => void
    ) => {},
    setData: jest.fn((data: LetsRole.ViewData) => {}),
    getData: jest.fn(() => ({})),
  };

  return sheet;
};
