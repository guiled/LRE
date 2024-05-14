export type MockedComponent = LetsRole.Component & {
  _trigger: (event: LetsRole.EventType, target?: MockedComponent) => void;
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
  virtualValue?: LetsRole.ComponentValue | null;
  choices?: LetsRole.Choices;
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
  virtualValue = null,
  choices = {},
}: Params): MockedComponent => {
  const handlers: Record<string, (cmp: LetsRole.Component) => void> = {};
  let visible: boolean = true;
  let privChoices = choices;
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
    off: jest.fn((...args: any[]): void => {
      if (args.length === 2) {
        delete handlers[args[0] + args[1]];
      } else {
        delete handlers[args[0]];
      }
    }),
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
      } else if (virtualValue !== null) {
        return virtualValue;
      } else if (value !== void 0) {
        return value;
      }
      const d = sheet.getData();
      return d[cmp.id()];
    }),
    virtualValue: jest.fn((newValue?: LetsRole.ComponentValue) => {
      if (newValue !== void 0) {
        virtualValue = newValue;
        return;
      }
      return virtualValue;
    }),
    rawValue: jest.fn(() => value),
    text: jest.fn((t?: string): string | void => {
      if (t) {
        text = t;
        return;
      }
      return text;
    }) as LetsRole.Component["text"],
    visible: jest.fn(() => visible),
    setChoices: jest.fn((newChoices: LetsRole.Choices) => {
      const val: string = cmp.value()?.toString() || "";
      if (
        privChoices?.hasOwnProperty(val) &&
        !newChoices?.hasOwnProperty(val)
      ) {
        throw new Error("This error can happen in Let's Role");
      }
      privChoices = newChoices;
    }),
    _trigger: jest.fn((event: LetsRole.EventType, target?: MockedComponent) => {
      if (!target) {
        handlers[event]?.(cmp);
        if (cntr) {
          cntr._trigger(event, cmp);
        }
      } else {
        handlers[event + target.id()]?.(target);
      }
    }),
    setToolTip: jest.fn((t) => t),
  };
  return cmp;
};
