# LRE

Let's Role Enhanced is a script for Let's Role System builder (SB) that can be added to a new or an existing system in order to easily code a system.

While it keeps all the original behaviour of the System Builder, LRE adds many new features on sheets and component, and provides a new way to think system scripting.

## How to use it ?

It takes only 30 sec and 3 steps to manually include LRE in your project.

- Step 1 : Download this file https://github.com/guiled/LRE/releases/latest/download/lre.js
- Step 2 : copy and paste its content at the beginning of your system script. (Note: you can reduce the code by clicking on the `>` next to the first line `//region LRE 7.0.0`)
- Step 3 : embed your init function into `lre.init()`. And it's done !

## Details on installation in your system

In order to run properly, your current script can have a code like

```js
init = function (sheet) {
  // something
};
```

In order to enable LRE you only have to add `lre.init()`. You should have something like this

```js
init = lre.init(function (sheet) {
    // something
}));
```

By calling `lre.init()` your sheet and script will have some new features. Please read the wiki https://github.com/guiled/LRE/wiki for more details

## What's in it for me ?

LRE's goal is to facilitate Let's Rôle system coding of some common works that need to do scripts. It was firstly made to make repeaters easier to handle, and prevent value changes to be ignored by the servers (there's a rate limit of `component.value('anything')` calls). Last but not least, it avoids the inconvenience of some small bugs that can make script coding harder.

- no more value change blocked (sync problems are highly avoided)
- no more `parseInt()` or number conversions everywhere in your code
- texts can be automatically translated
- get rid of all the `update` events
- like with computed values, write how a field is computed instead of writing what a field changes in a sheet
- Know where an error is in your code
- specific easy to use custom events for Repeaters
- LRE avoids a bug with repeaters in crafts
- It fixes a bug with multiple choice value changes by script
- A component can have many event handlers for one event type.

## Systems that use LRE

- [Vampire The Masquerade, 5 Ed.](https://lets-role.com/system/vampire-the-masquerade-5-ed-5234)
- [ALIEN RPG (unofficial)](https://lets-role.com/system/alien-rpg-unofficial-2001)
- [shadowrun 6](https://lets-role.com/system/shadowrun-6-8150)
- [Cyberpunk Red](https://lets-role.com/system/cyberpunk-red-10661)
- Sigillum Divina Caelest
- [KULT ⬦ Divinité Perdue ⬦](https://lets-role.com/system/kult-divinite-perdue--15139)
- [NOC](https://lets-role.com/system/noc-18097)
- [Shadowdark](https://lets-role.com/system/shadowdark-18729)
- [Knight](https://lets-role.com/system/knight-970)
- [Black Sword Hack - Ultimate Chaos Edition](https://lets-role.com/system/black-sword-hack-ultimate-chaos-edition-18269)
- [Berlin XVIII (PBTA)](https://lets-role.com/system/berlin-xviii-pbta-21777)
- [Fallen](https://lets-role.com/system/fallen-21323)
- [Vaesen](https://lets-role.com/system/vaesen-21606)
