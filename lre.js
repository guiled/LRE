//region LRE 1.0
// Custom functions
function isObject(object) {
    return object != null && typeof object === 'object';
}

function strlen(str) {
    return str.split('').length;
};

// Main container
function lre(_arg) {
    const sheets = {};
    const editingEntryText = 'Done';
    const repeaterIdSeparator = '.'

    /**
     * Here a list of LRE limitation description
     */
    const limitations = {
        noChoice: 'this component has no choice available for LRE. If this Choice component is filled with a table, we recommend to use script to fill it (see choiceComponent.populate()) instead of built-in "Table/ List Label" parameters',
        badText: 'this repeater entry has a text similar to ' + editingEntryText + '. That will cause some problem with edit event.',
    };

    function getLreSheet(sheet) {
        const name = sheet.name();
        if (!sheets[name]) {
            lreLog('Init sheet ' + name);
            sheets[name] = new lreSheet(sheet);
        }
        return sheets[name];
    }

    const isRepeaterLikeValue = function (value) {
        return (typeof value === 'object' && value !== null && !(value instanceof Array) && !(value instanceof Function));
    };

    const initComponent = function (rawComponent, lreContainer) {
        let realId = '';
        if (lreContainer.type() === 'entry') {
            realId = lreContainer.realId() + repeaterIdSeparator + rawComponent.index() + repeaterIdSeparator;
        } else if (lreContainer.type() === 'repeater') {
            realId = lreContainer.realId() + repeaterIdSeparator;
        }
        realId += rawComponent.id();
        let cmp = new lreComponent(lreContainer.sheet(), rawComponent, realId);
        cmp.parent(lreContainer);
        cmp = Object.assign(cmp, new EventOwner(cmp));
        if (lreContainer.type() === 'entry') {
            cmp.entry(lreContainer);
            cmp.repeater(lreContainer.repeater());
        }
        if (lreContainer.type() === 'repeater') {
            cmp = Object.assign(cmp, new lreRepeaterEntry());
            cmp.repeater(lreContainer);
        } else if (isRepeaterLikeValue(rawComponent.value())) {
            // it is a repeater
            cmp = Object.assign(cmp, new lreRepeater);
        }
        cmp.initiate();
        return cmp;
    };

    const lreLog = function (_str) {
        log('[LRE] ' + _str);
    }

    /** * * * * * * * * * * * * * * * * * * * * * *
     *              ComponentContainer            *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const ComponentContainer = function (_args) {
        const components = {};
        let sheet = _args[0];

        /**
         * @param {string} _id
         * @param {lreComponent} _lreComponent
         */
        this.set = function (realId, _lreComponent) {
            components[realId] = _lreComponent;
        };

        this.get = function (realId) {
            if (!this.inCache(realId)) {
                return null;
            }
            return components[realId]
        };

        this.inCache = function (realId) {
            return components.hasOwnProperty(realId);
        };
    }

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  EventOwner                *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const EventOwner = function (args) {
        const component = args[0];
        const existingRawEvents = ['click', 'update', 'mouseenter', 'mouseleave', 'keyup'];
        const events = {};
        const eventStates = {};
        const synonyms = {
            //'change': 'update'
        }

        const runEvents = function (component, eventName) {
            return function (_rawTarget, args) {
                if (!eventStates[eventName]) return;
                if (arguments.length < 2) {
                    args = [];
                }
                if (!events[eventName]) {
                    return;
                }
                let argsWithComponent = [component].concat(args);
                each(events[eventName], function (fcn) {
                    fcn.apply(component, argsWithComponent);
                });
            };
        };

        this.on = function (event, handler) {
            if (synonyms.hasOwnProperty(event)) {
                event = synonyms[event];
            }
            if (!events.hasOwnProperty(event)) {
                events[event] = [];
                if (existingRawEvents.includes(event)) {
                    component.raw().on(event, runEvents(component, event))
                }
            }
            eventStates[event] = true;
            events[event].push(handler);
        };

        this.disableEvent = function (event) {
            eventStates[event] = false;
        };

        this.enableEvent = function (event) {
            eventStates[event] = true;
        }

        this.off = function (event, handler) {
            if (handler !== undefined) {
                const idx = events[event].indexOf(handler);
                if (handler !== -1) {
                    events[event].splice(idx, 1);
                }
            } else {
                events[event] = []
            }
        };

        this.trigger = function (eventName) {
            return runEvents(component, eventName)(component.raw(), Array.prototype.slice.call(arguments, 1));
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                 LreComponent               *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreComponent = function (_args) {
        const sheet = _args[0];
        const component = _args[1];
        let realId = _args.length >= 3 ? _args[2] : component.id();
        this._realId = realId;
        this._type = 'component';
        let initiated = false;
        let parent;
        let lreEntry;
        let lreRepeater;

        const _data = {};

        this.addClass = component.addClass;
        this.find = function (id) {
            const tabId = id.split(repeaterIdSeparator);
            tabId.pop();
            const realId = tabId.join(repeaterIdSeparator) + (tabId.length > 0 ? repeaterIdSeparator : '') + id;
            return this.sheet().get(realId)
        };
        this.hide = component.hide;
        this.id = component.id;
        this.index = component.index;
        this.name = component.name;
        this.realId = function () {
            return realId;
        };
        this.show = component.show;
        this.parent = function (lreParent) {
            if (arguments.length > 0) {
                parent = lreParent;
            }
            return parent;
        };
        this.hide = component.hide;
        this.show = component.show;
        this.removeClass = component.removeClass;
        this.value = component.value;
        this.rawValue = component.rawValue;
        this.virtualValue = component.virtualValue;
        this.text = component.text;
        this.visible = component.visible;
        this.sheet = function () {
            return sheet;
        };
        this.setChoices = component.setChoices;

        this.raw = function () {
            return component;
        }

        this.data = function (name, value) {
            if (arguments.length === 1) {
                return _data[name];
            }
            _data[name] = value;
            return this;
        }
        this.toggle = function () {
            if (component.visible()) {
                return this.hide();
            }
            return this.show();
        }
        this.initiate = function () {
            this.setInitiated(true);
        };
        this.setInitiated = function (_initiated) {
            initiated = _initiated;
        };
        this.isInitiated = function () {
            return initiated;
        };
        this.type = function (type) {
            if (arguments.length > 0) {
                this._type = type;
            }
            return this._type;
        };
        this.entry = function (newLreEntry) {
            if (arguments.length > 0) {
                lreEntry = newLreEntry;
            }
            return lreEntry;
        };
        this.repeater = function (newLreRepeater) {
            if (arguments.length > 0) {
                lreRepeater = newLreRepeater;
            }
            return lreRepeater;
        };

    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreChoice                 *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreChoice = function () {
        let tableSource;
        let refresh;
        let choices = {};


        const refreshFromChoices = function () {
            return choices;
        };

        const loadFromTableIds = function (tableName) {
            tableSource = { table: tableName, col: 'id', rows: {} }
            choices = {};
            Tables.get(tableName).each(function (row) {
                choices[row.id] = row.id;
                tableSource.rows[row.id] = row;
            })
            return choices;
        };

        const loadFromTable = function (tableName, lbl) {
            tableSource = { table: tableName, col: lbl, rows: {} }
            choices = {};
            Tables.get(tableName).each(function (row) {
                choices[row.id] = row[lbl];
                tableSource.rows[row.id] = row;
            });
            return choices;
        }

        this.getChoices = function () {
            if (!choices || Object.keys(choices).length === 0) {
                lreLog(this.id() + ' : ' + limitations.noChoice);
            }
            return choices;
        };

        this.populate = function (tableOrCb, lbl) {
            if (typeof tableOrCb === 'string') {
                if (arguments.length === 1) {
                    this.choices = loadFromTableIds(tableOrCb);
                    refresh = refreshFromChoices;
                } else if (arguments.length === 2) {
                    this.choices = loadFromTable(tableOrCb, lbl);
                    refresh = refreshFromChoices;
                }
            } else {
                refresh = function () {
                    choices = tableOrCb();
                    return choices;
                };
            }
            this.repopulate();
        };

        this.repopulate = function () {
            this.setChoices(refresh());
        }

        this.label = function () {
            return choices[this.value()];
        };

        this.row = function () {
            if (tableSource && tableSource.rows) {
                let val = this.value();
                return tableSource.rows[val];
            }
        };

        this.initiate = function () {
            this.type('choice');
            this.setInitiated(true);
        }

    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *               LreMultiChoice               *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreMultiChoice = function () {
        let nbMax;
        let valuesForMax;

        const checkMax = function () {
            if (this.value().length > nbMax && nbMax > 0) {
                this.trigger('limit');
                this.value(valuesForMax.slice(0, nbMax));
                return;
            }
            valuesForMax = this.value();
        };

        this.initiate = function () {
            valuesForMax = this.raw().value();
            this.type('multichoice');
            this.setInitiated(true);
        };

        this.maxChoiceNb = function (nb) {
            if (arguments.length === 0) {
                return nbMax
            }
            nbMax = nb;
            if (nb > 0) {
                this.on('update', checkMax);
            } else {
                this.off('update', checkMax);
            }
        };

        // value is overloaded because value changing need to set choices again to be viewed
        this.value = function (values) {
            if (arguments.length === 0) {
                return this.raw().value();
            } else {
                this.raw().value(values);
                this.repopulate();
            }
        };

        this.clear = function () {
            this.value([]);
        };
        this.selectNone = this.clear;
        this.unselectAll = this.clear;

        this.selectAll = function () {
            let values = Object.keys(this.getChoices());
            if (nbMax > 0) {
                values = values.slice(0, nbMax);
            }
            this.value(values);
        };

        this.invert = function () {
            let all = Object.keys(this.getChoices());
            let val = this.value();
            this.value(all.filter(function (v) {
                return !val.includes(v);
            }));
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *               LreRepeaterEntry             *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreRepeaterEntry = function () {
        this.initiate = function () {
            this.type('entry');
            this.setInitiated(true);
        };

        this.find = function (id) {
            return this.sheet().get(this.realId() + repeaterIdSeparator + id);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                 LreRepeater                *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreRepeater = function () {
        let entries = {};
        let texts = {};

        function objectsEqual(object1, object2) {
            const keys1 = Object.keys(object1);
            const keys2 = Object.keys(object2);

            if (keys1.length !== keys2.length) {
                return false;
            }
            for (i = 0; i < keys1.length; i++) {
                let key = keys1[i];
                const val1 = object1[key];
                const val2 = object2[key];
                const areObjects = isObject(val1) && isObject(val2);
                if ((areObjects && !deepEqual(val1, val2)) || (!areObjects && val1 !== val2)) {
                    return false;
                }
            };

            return true;
        }

        const clickHandler = function (component) {
            log('Click handler');
            const newValues = component.value();
            each(newValues, function (entryData, entryId) {
                if (!entries.hasOwnProperty(entryId)) {
                    let cmp = component.find(entryId);
                    cmp.data('entryId', entryId);
                    if (!cmp.data('initiated')) {
                        cmp.data('initiated', true);
                        component.trigger('init', cmp, entryId, entryData);
                    }
                } else if (component.raw().find(entryId).text() !== texts[entryId]) {
                    let cmp = component.find(entryId);
                    component.trigger('edit', cmp, entryId, entryData);
                }
            });
            log('save current state')
            saveCurrentState(component);
        };

        const deepClone = function (val) {
            if (typeof val === 'object' || typeof val === 'array') {
                let result = Array.isArray(val) ? [] : {};
                each(val, function (v, k) {
                    result[k] = deepClone(v);
                });
                return result;
            } else {
                return val;
            }
        };

        const saveCurrentState = function (component) {
            entries = deepClone(component.value());
            each(component.value(), function (data, entryId) {
                texts[entryId] = component.raw().find(entryId).text();
                if (texts[entryId] === editingEntryText) {
                    lreLog(component.realId() + repeaterIdSeparator + entryId + limitations.badText)
                }
            })
        };

        const updateHandler = function (component) {
            const newValues = component.value();
            each(entries, function (entryData, entryId) {
                if (!newValues.hasOwnProperty(entryId)) {
                    component.trigger('delete', entryId, entryData);
                } else if (!objectsEqual(entryData, newValues[entryId])) {
                    let cmp = component.find(entryId);
                    component.trigger('change', cmp, entryId, newValues[entryId], entryData);
                }
            });
            saveCurrentState(component);
        };

        this.find = function (id) {
            return this.sheet().get(this.realId() + repeaterIdSeparator + id);
        };

        this.initiate = function () {
            lreLog('Initiate Repeater ' + this.realId());
            this.type('repeater');
            saveCurrentState(this);
            this.on('click', clickHandler);
            this.on('update', updateHandler);
            this.setInitiated(true);
        };

        this.each = function () {
            let callback, cmpId;
            if (typeof arguments[0] === 'function') {
                callback = arguments[0];
                cmpId = '';
            } else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
                callback = arguments[1];
                cmpId = repeaterIdSeparator + arguments[0];
            }
            each(this.value(), (function (entryData, entryId) {
                callback(this.find(entryId + cmpId), entryData, entryId);
            }).bind(this));
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                   LreSheet                 *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreSheet = function (_args) {
        const sheet = _args[0];
        const components = new ComponentContainer(this);

        this.getVariable = sheet.getVariable;
        this.setData = sheet.setData;
        this.getData = sheet.getData;
        this.prompt = sheet.prompt;
        this.id = sheet.id;
        this.getSheetId = sheet.getSheetId;
        this.name = sheet.name;

        this.get = function (id) {
            let strId, cmp;
            if (typeof id === 'string' || id instanceof String) {
                strId = id;
            } else if (!isNan(id)) {
                strId = '' + id;
            } else {
                return null;
            }
            if (!components.inCache(strId)) {
                let rawCmp, container;
                let tabId = strId.split(repeaterIdSeparator);
                if (tabId.length === 1) {
                    container = this;
                    rawCmp = this.raw().get(strId);
                    if (!rawCmp) return null;
                } else {
                    let finalId = tabId.pop();
                    container = this.get(tabId.join(repeaterIdSeparator));
                    rawCmp = container.raw().find(finalId);
                    if (!container || !rawCmp) return null;
                }
                cmp = initComponent(rawCmp, container);
                cmp.realId();
                components.set(cmp.realId(), cmp);
            } else {
                cmp = components.get(strId);
            }
            return cmp;
        };

        this.find = this.get;

        const getComponent = function (sheet, id) {
            if (id instanceof String || typeof id === 'string') {
                return sheet.get(id);
            } else {
                return id;
            }
        };

        this.initChoice = function (id) {
            Object.assign(getComponent(this, id), new lreChoice);

            return cmp;
        };

        this.initMultiChoice = function (id) {
            let cmp = getComponent(this, id)
            if (!Array.isArray(cmp.value())) {
                lreLog('Unable to initialize multichoice : ' + id + ' is not a Choice component');
                return;
            }
            Object.assign(cmp, new lreChoice);
            Object.assign(cmp, new lreMultiChoice);

            return cmp;
        };

        this.raw = function () {
            return sheet;
        };

        this.sheet = function () {
            return this;
        };

        this.type = function () {
            return 'sheet';
        }
    };

    if (typeof _arg === 'function') {
        return function (_sheet) {
            lreLog('INIT on ' + _sheet.id() + '(' + _sheet.name() + ')');
            _arg.call(this, getLreSheet(_sheet));
        }
    }
}
//endregion
