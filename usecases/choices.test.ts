import { LRE } from "../src/lre";
import { ServerMock } from "../src/mock/letsrole/server.mock";
import { LreTables } from "../src/tables/tables";
import {
  initLetsRole,
  terminateLetsRole,
} from "../src/mock/letsrole/letsrole.mock";
import { Sheet } from "../src/sheet";
import { DataBatcher } from "../src/sheet/databatcher";
import { SheetProxy } from "../src/proxy/sheet";
import { ViewMock } from "../src/mock/letsrole/view.mock";
import { Choice } from "../src/component/choice";
import { DirectDataProvider } from "../src/dataprovider";

let server: ServerMock;
let sheetMock: ViewMock;
let sheet: Sheet;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "class",
            className: "Choice",
            tableId: "classes",
            label: "name",
          },
          {
            id: "skills",
            className: "Choice",
            tableId: "skills",
            label: "name",
            multiple: true,
          },
          {
            id: "selectedSkills",
            className: "Choice",
            tableId: "skills",
            label: "name",
            multiple: true,
          },
          {
            id: "selectedTransformedSkills",
            className: "Choice",
            tableId: "skills",
            label: "name",
            multiple: true,
          },
        ],
      },
    ],
    tables: {
      classes: [
        { id: "warrior", name: "Warrior" },
        { id: "rogue", name: "Rogue" },
        { id: "mage", name: "Mage" },
        { id: "bard", name: "bard" },
      ],
      skills: [
        { id: "sword", name: "Sword", class: "warrior", otherName: "Blade" },
        { id: "axe", name: "Axe", class: "warrior", otherName: "Hatchet" },
        {
          id: "2-hand sword",
          name: "Two-hand sword",
          class: "warrior",
          otherName: "Great sword",
        },
        { id: "dagger", name: "Dagger", class: "rogue", otherName: "Knife" },
        { id: "bow", name: "Bow", class: "rogue", otherName: "Longbow" },
        {
          id: "fireball",
          name: "Fireball",
          class: "mage",
          otherName: "Flame orb",
        },
        {
          id: "invisibility",
          name: "Invisibility",
          class: "mage",
          otherName: "Stealth cloak",
        },
        { id: "charm", name: "Charm", class: "bard", otherName: "Allure" },
        { id: "song", name: "Song", class: "bard", otherName: "Melody" },
      ],
    },
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  Tables = new LreTables(Tables, context);
  sheetMock = server.openView("main", "123");
  const rawSheet: SheetProxy = new SheetProxy(context, sheetMock);
  sheet = new Sheet(rawSheet, new DataBatcher(context, rawSheet), context);
  lre.sheets.add(sheet);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Set choices with table", () => {
  test("Dynamic set choices based on an other component", () => {
    sheetMock.componentChangedManually("class", "warrior");

    const skills = Tables.get("skills")!;

    const selectedClass = sheet.get("class") as Choice;

    const choiceSkills = sheet.get("skills") as Choice;

    choiceSkills.setChoices(
      skills.select("name").where("class", selectedClass),
    );

    expect(choiceSkills.getChoices()).toStrictEqual({
      sword: "Sword",
      axe: "Axe",
      "2-hand sword": "Two-hand sword",
    });

    sheetMock.componentChangedManually("class", "mage");

    expect(choiceSkills.getChoices()).toStrictEqual({
      fireball: "Fireball",
      invisibility: "Invisibility",
    });
  });

  test("Dynamic set choices based on a transformed provider", () => {
    sheetMock.componentChangedManually("class", "warrior");

    const skills = Tables.get("skills")!;

    const selectedClass = sheet.get("class") as Choice;

    const choiceSkills = sheet.get("skills") as Choice;

    choiceSkills.setChoices(
      skills.select("name").where("class", selectedClass),
    );

    selectedClass.value("warrior");

    choiceSkills.value(["sword", "2-hand sword"]);

    const selectedSkills = sheet.get("selectedSkills") as Choice;

    selectedSkills.setChoices(choiceSkills.checked());

    expect(selectedSkills.getChoices()).toStrictEqual({
      sword: "Sword",
      "2-hand sword": "Two-hand sword",
    });

    const selectedTransformedSkills = sheet.get(
      "selectedTransformedSkills",
    ) as Choice;

    const transformed = choiceSkills
      .checked()
      .transform("otherName") as DirectDataProvider;

    selectedTransformedSkills.setChoices(transformed);

    expect(selectedTransformedSkills.getChoices()).toStrictEqual({
      sword: "Blade",
      "2-hand sword": "Great sword",
    });

    choiceSkills.value(["sword", "2-hand sword", "axe"]);

    expect(selectedSkills.getChoices()).toStrictEqual({
      sword: "Sword",
      "2-hand sword": "Two-hand sword",
      axe: "Axe",
    });
    expect(selectedTransformedSkills.getChoices()).toStrictEqual({
      sword: "Blade",
      "2-hand sword": "Great sword",
      axe: "Hatchet",
    });
  });
});
