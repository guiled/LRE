import { disabledMethod } from ".";
import { LreProxy } from "./proxy";
import { SheetContext, SheetProxy } from "./sheet";

class ComponentProxy
  extends LreProxy<LetsRole.Component>
  implements LetsRole.Component
{
  #sheet: SheetProxy;
  #getVirtualContext: () => SheetContext;

  constructor(
    proxyModeHandler: ProxyModeHandler,
    realCmp: LetsRole.Component,
    sheet: SheetProxy,
    getVirtualContext: () => SheetContext,
  ) {
    super(proxyModeHandler, realCmp);
    this.#sheet = sheet;
    this.#getVirtualContext = getVirtualContext;

    this.setModeDest("virtual", this.#initVirtualComponent.bind(this));
  }

  #initVirtualComponent(cmp: LetsRole.Component): LetsRole.Component {
    const id = cmp.id()!;
    const context = this.#getVirtualContext();

    context.sheetData[id] = cmp.value();
    context.cmpClasses[id] = cmp.getClasses();
    context.cmpTexts[id] = cmp.text();
    context.virtualValues[id] = cmp.virtualValue();
    context.visible[id] = cmp.visible?.() ?? true;

    const cmpProxy = {
      ...cmp,
      id: () => id,
      find: this.find,
      parent: this.parent,
      sheet: this.sheet,
      on: disabledMethod,
      off: disabledMethod,
      hide: () => {
        context.visible[id] = false;
        context.cmpClasses[id].push("d-none");
      },
      show: () => {
        context.visible[id] = true;
        const idx = context.cmpClasses[id].indexOf("d-none");
        context.cmpClasses[id].splice(idx, 1);
      },
      addClass: (className: LetsRole.ClassName) => {
        context.cmpClasses[id].push(className);
      },
      removeClass: (className: LetsRole.ClassName) => {
        const idx = context.cmpClasses[id].indexOf(className);

        if (idx !== -1) {
          context.cmpClasses[id].splice(idx, 1);
        }
      },
      getClasses: () => context.cmpClasses[id],
      hasClass: (className: LetsRole.ClassName) =>
        context.cmpClasses[id].includes(className),
      toggleClass: (className: LetsRole.ClassName) => {
        const idx = context.cmpClasses[id].indexOf(className);

        if (idx === -1) {
          context.cmpClasses[id].push(className);
        } else {
          context.cmpClasses[id].splice(idx, 1);
        }
      },
      virtualValue: (newValue?: LetsRole.ComponentValue) => {
        if (newValue !== void 0) {
          context.virtualValues[id] = newValue;
        } else {
          return context.virtualValues[id];
        }
      },
      rawValue: () => context.sheetData[id],
      text: (replacement?: string) => {
        if (replacement !== void 0) {
          context.cmpTexts[id] = replacement!;
        }

        return context.cmpTexts[id];
      },
      visible: (): boolean => !!context.visible[id],
      setChoices: disabledMethod,
      setToolTip: disabledMethod,
      value: (newValue?: any) => {
        if (newValue !== void 0) {
          context.sheetData[id] = newValue;
        }

        return context.sheetData[id];
      },
    };
    return cmpProxy;
  }

  id(): LetsRole.ComponentID | null {
    let id;

    try {
      id = this.getDest().id();
    } catch (e) {
      id = "";
    }

    return id;
  }

  name(): string {
    return this.getDest().name();
  }

  index(): string | null {
    return this.getDest().index();
  }

  #proxyIt(raw: LetsRole.Component): ComponentProxy {
    return new ComponentProxy(
      this._proxyModeHandler,
      raw,
      this.#sheet,
      this.#getVirtualContext,
    );
  }

  parent(): LetsRole.Component {
    return this.#proxyIt(this._realDest.parent());
  }

  find(id: string): LetsRole.Component {
    return this.#proxyIt(this._realDest.find(id));
  }

  on(): void {
    const proxy = this.getDest();
    proxy.on.apply(proxy, Array.from(arguments) as any);
  }

  off(): void {
    const proxy = this.getDest();
    proxy.off.apply(proxy, Array.from(arguments) as any);
  }

  hide(): void {
    this.getDest().hide();
  }

  show(): void {
    this.getDest().show();
  }

  addClass(className: LetsRole.ClassName): void {
    this.getDest().addClass(className);
  }

  removeClass(className: LetsRole.ClassName): void {
    this.getDest().removeClass(className);
  }

  getClasses(): LetsRole.ClassName[] {
    this._proxyModeHandler.logAccess("class", this.getDest().id()!);
    return this.getDest().getClasses();
  }

  hasClass(className: LetsRole.ClassName): boolean {
    this._proxyModeHandler.logAccess("class", this.getDest().id()!);
    return this.getDest().hasClass(className);
  }

  toggleClass(className: LetsRole.ClassName): void {
    this.getDest().toggleClass(className);
  }
  virtualValue(newValue?: LetsRole.ComponentValue): LetsRole.ComponentValue {
    if (arguments.length > 0) {
      this.getDest().virtualValue(newValue);
      return;
    }

    this._proxyModeHandler.logAccess("virtualValue", this.getDest().id()!);
    return this.getDest().virtualValue();
  }

  rawValue(): LetsRole.ComponentValue {
    this._proxyModeHandler.logAccess("rawValue", this.getDest().id()!);
    return this.getDest().rawValue();
  }

  text(replacement?: string): any {
    if (arguments.length > 0) {
      this.getDest().text(replacement!);
      return;
    }

    this._proxyModeHandler.logAccess("text", this.getDest().id()!);
    return this.getDest().text();
  }

  visible(): boolean {
    this._proxyModeHandler.logAccess("visible", this.getDest().id()!);
    return this.getDest().visible();
  }

  setChoices(newChoices: LetsRole.Choices): void {
    this.getDest().setChoices(newChoices);
  }

  setToolTip(text: string, placement?: LetsRole.TooltipPlacement): void {
    this.getDest().setToolTip(text, placement);
  }

  value(newValue?: any): LetsRole.ComponentValue {
    if (arguments.length > 0) {
      this.getDest().value(newValue);
      return;
    }

    this._proxyModeHandler.logAccess("value", this.getDest().id()!);
    return this.getDest().value();
  }
  sheet(): LetsRole.Sheet {
    return this.#sheet as LetsRole.Sheet;
  }
}

//const ComponentProxy = CmpProxy;

export { ComponentProxy };
