namespace LetsRoleMock {
  declare type SystemDefinitions = Partial<{
    tables: Record<LetsRole.TableID, Array<LetsRole.TableRow>>;
    views: Array<ViewDefinitions>;
    i18n: {
      defaultLang: string;
      texts: Array<string>;
      translations: Record<string, Record<string, string>>;
    };
    viewVariables: Record<LetsRole.ViewID, Record<string, number>>;
  }>;

  declare type ViewDefinitions = {
    type?: "Main" | "SubComponent" | "Craft";
    craft?: true | null;
    /* cspell: disable-next-line */
    tokenizable?: true | null;
    droppable?: true | null;
    width?: number;
    height?: number;
    id: LetsRole.ViewID;
    name?: LetsRole.Name;
    classes?: string | null;
    children: Array<ComponentDefinitions>;
    className: "View";
    collapsed?: boolean;
    references?: Array<LetsRole.ComponentID>;
    /* @deprecated */
    avatarId?: string;
  };

  declare type ComponentDefinitions =
    | ColumnDefinitions
    | RowDefinitions
    | ContainerDefinitions
    | TabDefinitions
    | IconDefinitions
    | AvatarDefinitions
    | ColorDefinitions
    | LabelDefinitions
    | NumberInputDefinitions
    | TextInputDefinitions
    | TextareaDefinitions
    | CheckboxDefinitions
    | ChoiceDefinitions
    | RepeaterDefinitions
    /* @deprecated */
    | ViewDefinitions
    | UnknownComponentDefinitions
    | EntryDefinitions;

  type CommonComponentDefinitions = {
    id: LetsRole.ComponentID;
    name?: LetsRole.Name;
    classes?: string | null;
    className:
      | "Row"
      | "Column"
      | "Container"
      | "Tab"
      | "Icon"
      | "Avatar"
      | "Color"
      | "Label"
      | "NumberInput"
      | "TextInput"
      | "Textarea"
      | "Checkbox"
      | "Choice"
      | "Repeater"
      | "RepeaterElement"
      /* @deprecated */
      | "View"
      | "_Unknown_"
      | "_CmpFromSheet_";
    collapsed?: boolean;
    references?: Array<LetsRole.ComponentID>;
    children?: Array<ComponentDefinitions>;
  };

  type ComponentClassName =
    | LetsRoleMock.CommonComponentDefinitions["className"]
    | "View"; // deprecated
  type WithTooltipDefinitions = {
    tooltip?: true;
    tooltipLabel?: string;
    tooltipPlacement?: "top" | "bottom" | "left" | "right";
  };

  type QuickBarDefinitions = {
    quickBar?: true | null;
    quickBarLabel?: string | null;
  };

  declare type ColumnDefinitions = CommonComponentDefinitions & {
    size?: number | null;
    className: "Column";
  };

  declare type RowDefinitions = CommonComponentDefinitions & {
    className: "Row";
  };

  declare type ContainerDefinitions = CommonComponentDefinitions & {
    className: "Container";
    layout?: "horizontal" | "vertical";
  };

  declare type WithDefaultValueDefinitions = {
    defaultValue?: string | null;
  };

  declare type TabDefinitions = CommonComponentDefinitions & {
    className: "Tab";
    tableId?: LetsRole.TableID;
    titleAttribute?: LetsRole.ColumnId | null;
    viewAttribute?: LetsRole.ColumnId | null;
    vertical?: boolean | null;
    verticalWidth?: number;
    verticalText: boolean | null;
    verticalAlign?: "left" | "right";
  };

  declare type IconDefinitions = CommonComponentDefinitions & {
    className: "Icon";
    iconName: string | null;
    roll?: string | null;
    rollTitle?: string | null;
  };

  declare type AvatarDefinitions = CommonComponentDefinitions & {
    className: "Avatar";
  };

  declare type ColorDefinitions = CommonComponentDefinitions & {
    className: "Color";
  };

  declare type LabelDefinitions = CommonComponentDefinitions &
    WithTooltipDefinitions &
    QuickBarDefinitions & {
      className: "Label";
      align?: "Left" | "Right" | "Center" | null;
      clickable?: true | null;
      isTemplate?: false;
      markdown?: true;
      computed?: true | null;
      roll?: string | null;
      text?: string;
    };

  declare type NumberInputDefinitions = CommonComponentDefinitions &
    WithDefaultValueDefinitions &
    WithTooltipDefinitions & {
      className: "NumberInput";
      min?: number | null;
      max?: number | null;
      align?: "Left" | "Right" | "Center" | null;
      computed?: true | null;
      computedValue?: string | null;
    };

  declare type TextInputDefinitions = CommonComponentDefinitions &
    WithDefaultValueDefinitions &
    WithTooltipDefinitions & {
      className: "TextInput";
      placeholder?: string;
      computed?: true | null;
    };

  declare type TextareaDefinitions = CommonComponentDefinitions &
    WithDefaultValueDefinitions &
    WithTooltipDefinitions & {
      className: "Textarea";
      placeholder?: string;
      computed?: true | null;
    };

  declare type CheckboxDefinitions = CommonComponentDefinitions & {
    className: "Checkbox";
    label?: string;
  };

  declare type ChoiceDefinitions = CommonComponentDefinitions & {
    className: "Choice";
    label?: LetsRole.ColumnId | null;
    tableId?: LetsRole.TableID | null;
    optional?: true | null;
    expanded?: true | null;
    multiple?: true | null;
    expandedClass?: string | null;
  };

  declare type RepeaterDefinitions = CommonComponentDefinitions & {
    className: "Repeater";
    viewId: string | null;
    readViewId: string | null;
  };

  declare type UnknownComponentDefinitions = CommonComponentDefinitions & {
    className: "_Unknown_" | "_CmpFromSheet_";
  };

  declare type EntryDefinitions = CommonComponentDefinitions & {
    className: "RepeaterElement";
  };
}
