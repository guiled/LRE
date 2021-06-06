# LRE
Let's Role Enhanced

## How to use LRE ?

Put the content of this file https://raw.githubusercontent.com/guiled/LRE/main/lre.js at the beginning of your script.
(Note: you can reduce the code by clicking on the `>` next to the first line `//region LRE 2.0`)

Your edit was like 
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
