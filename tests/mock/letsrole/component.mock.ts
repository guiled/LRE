type OnMethod = (event: string, delegate: any, callback: any) => void;

export type MockedComponent = LetsRole.Component & {
  _trigger: (event: string, target?: MockedComponent) => void;
};

type Params = {
  id: LetsRole.ComponentID;
  sheet: LetsRole.Sheet;
  cntr?: MockedComponent | undefined;
  classes?: Array<string>;
  index?: string | null;
  name?: string;
  text?: string;
};

export const MockComponent = ({
  id,
  sheet,
  cntr,
  classes = [],
  index = null,
  name = "name",
  text = "text",
}: Params): MockedComponent => {
  const handlers: Record<string, (cmp: LetsRole.Component) => void> = {};
  let value: LetsRole.ComponentValue = "";
  let visible: boolean = true;
  const cmp: MockedComponent = {
    id: jest.fn(() => id),
    sheet: jest.fn(() => sheet),
    name: jest.fn(() => name),
    find: jest.fn((id: LetsRole.ComponentID) =>
      MockComponent({ id, sheet, cntr: cmp })
    ),
    index: jest.fn(() => index),
    parent: jest.fn(() =>
      MockComponent({ id: id + "parent", sheet, cntr: cmp })
    ),
    on: jest.fn((...args: any[]): void => {
      if (args.length === 3) {
        handlers[args[0] + args[1]] = args[2];
      } else {
        handlers[args[0]] = args[1];
      }
    }),
    off: jest.fn(),
    hide: jest.fn(() => (visible = false)),
    show: jest.fn(() => (visible = true)),
    addClass: jest.fn(a => classes.push(a)),
    removeClass: jest.fn(a => classes = classes.filter(c => c !== a)),
    getClasses: jest.fn(() => classes),
    hasClass: jest.fn((c) => classes.includes(c)),
    value: jest.fn((newValue?: LetsRole.ComponentValue) => {
      if (newValue !== void 0) {
        value = newValue;
        cmp._trigger("update");
      }
      return value;
    }),
    virtualValue: jest.fn(() => 0),
    rawValue: jest.fn(() => 0),
    text: jest.fn((t?: string): string | void => {
      if (t) {
        text = t;
        return;
      }
      return text;
    }) as LetsRole.Component["text"],
    visible: jest.fn(() => visible),
    setChoices: jest.fn(),
    _trigger: jest.fn((event: string, target?: MockedComponent) => {
      if (cntr) {
        cntr._trigger(event, cmp);
      } else if (target) {
        handlers[event + target.id()]?.(target);
      } else {
        handlers[event]?.(cmp);
      }
    }),
  };
  return cmp;
};
