# LRE
Let's Role Enhanced
⚠ Please note that version between 6.17 and 6.22 had a bug with repeaters due to a fix a bug with repeater in crafts. The 6.23 works well and fix the bug in crafts.

## How to use LRE ?

Put the content of this file https://raw.githubusercontent.com/guiled/LRE/main/lre.js at the beginning of your script.
(Note: you can reduce the code by clicking on the `>` next to the first line `//region LRE 2.0`)

Your script was like 
```js
init = function (sheet) {
    // something
};
````

In order to enable LRE you only have to add `lre()`. You should have something like this
```js
init = lre(function (sheet) {
    // something
}));
```
By calling `lre()` your sheet and script will have some new features. Please read the wiki https://github.com/guiled/LRE/wiki for more details

## What's in it for me ?
LRE's goal is to facilitate Let's Rôle system coding of some common works that need to do scripts. It was firstly made to make repeaters easier to handle, and prevent value changes to be ignored by the servers (there's a rate limit of `component.value('anything')` calls). Last but not least, it avoids the inconvenience of some small bugs that can make script coding harder.

- no more value change blocked
- specific easy to use custom events for Repeaters 
- LRE bypass a bug with repeaters in crafts

## Systems that use LRE
- [ALIEN RPG (unofficial)](https://lets-role.com/system/alien-rpg-unofficial-2001)
- [shadowrun 6](https://lets-role.com/system/shadowrun-6-8150)
- [Cyberpunk Red](https://lets-role.com/system/cyberpunk-red-10661)
- Sigillum Divina Caelest
- [KULT ⬦ Divinité Perdue ⬦](https://lets-role.com/system/kult-divinite-perdue--15139)
- [NOC](https://lets-role.com/system/noc-18097)