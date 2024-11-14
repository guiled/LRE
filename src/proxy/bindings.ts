export const registerLreBindings = (
  modeHandler: ProxyModeHandler,
  originalBindings: LetsRole.Bindings,
): LetsRole.Bindings => {
  return {
    add: (name, componentId, viewId, dataCallback) =>
      modeHandler.getMode() !== "virtual"
        ? originalBindings.add(name, componentId, viewId, dataCallback)
        : () => {},
    clear: (componentId) =>
      modeHandler.getMode() !== "virtual"
        ? originalBindings.clear(componentId)
        : () => {},
    remove: (name) =>
      modeHandler.getMode() !== "virtual"
        ? originalBindings.remove(name)
        : () => {},
    send: (sheet, name) =>
      modeHandler.getMode() !== "virtual"
        ? originalBindings.send(sheet, name)
        : () => {},
  };
};
