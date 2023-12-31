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
  parent?: MockedComponent;
  value?: LetsRole.ComponentValue;
};

export const MockComponent = ({
  id,
  sheet,
  cntr,
  classes = [],
  index = null,
  name = "name",
  text = "text",
  parent,
  value = "",
}: Params): MockedComponent => {
  const handlers: Record<string, (cmp: LetsRole.Component) => void> = {};
  let visible: boolean = true;
  const cmp: MockedComponent = {
    id: jest.fn(() => id),
    sheet: jest.fn(() => sheet),
    name: jest.fn(() => name),
    find: jest.fn((id: LetsRole.ComponentID) => {
      return MockComponent({ id, sheet, cntr: cmp });
    }),
    index: jest.fn(() => index),
    parent: jest.fn(
      () => parent || MockComponent({ id: id + "parent", sheet, cntr })
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
    addClass: jest.fn((a) => classes.push(a)),
    removeClass: jest.fn((a) => (classes = classes.filter((c) => c !== a))),
    getClasses: jest.fn(() => classes),
    hasClass: jest.fn((c) => classes.includes(c)),
    toggleClass: jest.fn((a) => {
      classes.includes(a)
        ? (classes = classes.filter((c) => c !== a))
        : classes.push(a);
    }),
    value: jest.fn((newValue?: LetsRole.ComponentValue) => {
      if (newValue !== void 0) {
        value = newValue;
        cmp._trigger("update");
        sheet.setData({
          [cmp.id()]: newValue,
        });
      } else if (value !== void 0) {
        return value;
      }
      const d = sheet.getData();
      return d[cmp.id()];
    }),
    virtualValue: jest.fn(() => null),
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
      if (!target) {
        handlers[event]?.(cmp);
        if (cntr) {
          cntr._trigger(event, cmp);
        }
      } else {
        handlers[event + target.id()]?.(target);
      }
    }),
    setTooltip: jest.fn((t) => t),
  };
  return cmp;
};
