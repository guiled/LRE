import { MockComponent } from "./component.mock";

type Params = {
  id: string;
  realId?: string;
  properName?: string;
};

export type MockedSheet = LetsRole.Sheet;

export const MockSheet = ({ id, realId = "12345", properName = "properName" }: Params): MockedSheet => {
  const sheet: MockedSheet = {
    id: jest.fn(() => id),
    getSheetId: jest.fn(() => realId),
    name: jest.fn(() => "name"),
    properName: jest.fn(() => properName),
    get: jest.fn((cmpId: LetsRole.ComponentID) =>
      MockComponent({ id: cmpId, sheet })
    ),
    getVariable: jest.fn(() => 12),
    prompt: jest.fn(),
    setData: jest.fn(),
    getData: jest.fn(),
  };

  return sheet;
};
