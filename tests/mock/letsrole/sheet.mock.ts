import { MockComponent } from "./component.mock";

type Params = {
  id: LetsRole.SheetID;
  realId?: LetsRole.SheetRealID;
  properName?: string;
  data?: LetsRole.ViewData;
  name?: string;
  variables?: Partial<Record<string, any>>;
};

export type MockedSheet = LetsRole.Sheet;

export const MockSheet = ({
  id,
  realId = "12345",
  properName = "properName",
  data = {},
  name = "name",
  variables = {},
}: Params): MockedSheet => {
  const sheet: MockedSheet = {
    id: jest.fn(() => id),
    getSheetId: jest.fn(() => realId),
    name: jest.fn(() => name),
    properName: jest.fn(() => properName),
    get: jest.fn((cmpId: LetsRole.ComponentID) =>
      MockComponent({ id: cmpId, sheet, value: data[cmpId] || "" })
    ),
    getVariable: jest.fn((id) => variables[id]),
    prompt: jest.fn(),
    setData: jest.fn((d) => Object.assign(data, d)),
    getData: jest.fn(() => structuredClone(data)),
  };

  return sheet;
};
