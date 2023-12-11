export const registerLreBindings = (
  modeHandler: ProxyModeHandler,
  originalBindings: LetsRole.Bindings
): LetsRole.Bindings => {
  return {
    add: (name, componentId, viewId, dataCallback) =>
      modeHandler.getMode() === "real"
        ? originalBindings.add(name, componentId, viewId, dataCallback)
        : () => {},
    clear: (componentId) =>
      modeHandler.getMode() === "real"
        ? originalBindings.clear(componentId)
        : () => {},
    remove: (name) =>
      modeHandler.getMode() === "real"
        ? originalBindings.remove(name)
        : () => {},
    send: (sheet, name) =>
      modeHandler.getMode() === "real"
        ? originalBindings.send(sheet, name)
        : () => {},
  };
};
