//region LRE 6.1
// Custom functions
function isObject(object) {
    return object != null && typeof object === 'object';
}

function strlen(str) {
    return str.split('').length;
};

function time(fcn) {
    const start = Date.now();
    fcn();
    log('Time : ' + (Date.now() - start) + 'ms')
};

const lreProfiling = {};

function profilingStart(name) {
    if (!lreProfiling.hasOwnProperty(name)) {
        lreProfiling[name] = 0;
    }
    lreProfiling[name] -= Date.now();
};

function profilingEnd(name) {
    lreProfiling[name] += Date.now();
};

function isNaN(val) {
    return Number.isNaN(Number(val));
};

function firstInit(sheet) {
    return false;
};

function deepEqual(x, y) {
    if (x === y) {
        return true;
    }
    else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
        if (Object.keys(x).length != Object.keys(y).length)
            return false;

        for (var prop in x) {
            if (y.hasOwnProperty(prop)) {
                if (!deepEqual(x[prop], y[prop]))
                    return false;
            }
            else
                return false;
        }

        return true;
    }
    else
        return false;
};

function deepClone(val) {
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

// Can be remove when JSON.stringify() is available
function stringify(obj, indent) {
    if (arguments.length === 1) {
        indent = '';
    }
    let indent_ = indent + '  ';
    let recursive = function (obj) {
        return stringify(obj, indent_);
    }
    if (typeof obj !== 'object' || obj === null || obj instanceof Array) {
        switch (typeof obj) {
            case 'function':
                return '"function(){}"';
            case 'string':
                return '"' + obj.replace(/\\/g, '\\\\').replace('"', '\\"') + '"';
            case 'number':
            case 'boolean':
                return '' + obj;
            case 'function':
                return 'null';
            case 'object':
                if (obj instanceof Date) return '"' + obj.toISOString() + '"';
                if (obj instanceof Array) return "[\n" + obj.map(recursive).join(",\n") + "\n" + indent + "]";
                if (obj === null) return 'null';
            default:
                return recursive(obj);
        }
    }

    return "{\n" + Object.keys(obj).map(function (k) {
        return indent_ + '"' + k + '": ' + recursive(obj[k]);
    }).join(",\n") + "\n" + indent + "}";
};

let LRE_AUTONUM = false;
// Main container
let lreIntiated = false;
function lre(_arg) {

    const initLre = function () {
        overloadLog(log);
        overloadTables(Tables);
    };

    const sheets = {};
    const editingEntryText = 'Done';
    const repeaterIdSeparator = '.'
    const asyncCacheDelay = 20;
    const asyncDataSetDelay = 50;
    const asyncDataSetAgainDelay = 20;
    const maxDataSet = 20;

    /**
     * Here a list of LRE limitation description
     */
    const limitations = {
        noChoice: 'this component has no choice available for LRE. If this Choice component is filled with a table, we recommend to use script to fill it (see choiceComponent.populate()) instead of built-in "Table/ List Label" parameters',
        badText: 'this repeater entry has a text similar to ' + editingEntryText + '. That will cause some problem with edit event.',
    };

    const overloadLog = function (_log) {
        const save = _log;
        log = function () {
            each(arguments, function (v) {
                save(v);
            });
        };
    }

    function getLreSheet(sheet, reset) {
        const name = sheet.name();
        const id = sheet.getSheetId();
        if (!id) {
            lreLog('Init sheet ' + name);
            return new lreSheet(sheet);
        }
        if (!sheets[id] || reset) {
            lreLog('Init sheet ' + name + ' (' + id + ')');
            sheets[id] = new lreSheet(sheet);
        }
        return sheets[id];
    }

    const isRepeater = function (rawCmp) {
        if (!rawCmp || !rawCmp.id()) return false;
        let val;
        try {
            try {
                val = rawCmp.value();
            } catch (e) {
                return false;
            }
        } catch (e) {
        }
        let result = false;
        let valueSet = false;
        if (typeof val === 'object' && val !== null) return true;
        if ((typeof val === 'undefined' || val === null) && rawCmp.text().replace(/\s+/g, '').trim() === 'Add...') {
            try {
                try {
                    // Try catch for following line only works inside a try catch
                    const newId = '42LRE';
                    const newValue = {}
                    newValue[newId] = { a: 1 };
                    valueSet = true;
                    rawCmp.value(newValue);
                    const entry = rawCmp.find(newId);
                    // Only repeaters can have a component from an array value
                    result = entry && entry.id && entry.id() === newId;
                    rawCmp.value(null);
                } catch (e) {
                    // Only repeaters may throw an Exception here
                    result = true;
                }
            } catch (e) {
                result = true;
            }
        }
        if (result) {
            rawCmp.value({});      // Init data for repeaters
        } else if (valueSet) {
            rawCmp.value(typeof val !== 'undefined' ? val : null);
        }
        return result;
    };

    const initComponent = function (rawComponent, lreContainer) {
        let realId = '';
        if (lreContainer.lreType() === 'entry' || lreContainer.lreType() === 'repeater') {
            realId = lreContainer.realId() + repeaterIdSeparator;
        }
        realId += rawComponent.id();
        let cmp = new lreComponent(lreContainer.sheet(), rawComponent, realId);
        cmp.parent(lreContainer);
        if (lreContainer.lreType() === 'entry') {
            cmp.entry(lreContainer);
            cmp.repeater(lreContainer.repeater());
        }
        if (lreContainer.lreType() === 'repeater') {
            cmp = Object.assign(cmp, new lreRepeaterEntry());
            cmp.repeater(lreContainer);
            //} else if (isRepeater(rawComponent)) {
            // it is a repeater
            //        cmp = Object.assign(cmp, new lreRepeater);
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
            return components[realId];
        };

        this.children = function (realId) {
            let realIds = [];
            for (k in components) {
                if (k.indexOf(realId + repeaterIdSeparator) === 0) {
                    realIds.push(k);
                }
            }
            return realIds;
        };

        this.unset = function (realId) {
            delete components[realId];
        };

        this.inCache = function (realId) {
            // Why * at 0 ? Because it is quite slow to test realId[strlen(realId)] as realId.length doesn't work
            if (realId.charAt(0) === '*') {
                for (k in components) {
                    if (k.indexOf(realId.substr(1) + repeaterIdSeparator) === 0) {
                        return components[k];
                    }
                }
            }
            return components.hasOwnProperty(realId) ? components[realId] : false;
        };
    }

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  EventOwner                *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const EventOwner = function (args) {
        const existingRawEvents = ['click', 'update', 'mouseenter', 'mouseleave', 'keyup'];
        const events = {};
        const eventStates = {};
        const synonyms = {
            //'change': 'update'
        }
        const canceledEvents = [];

        const eventIsEnabled = function (eventName) {
            return !eventStates.hasOwnProperty(eventName) || eventStates[eventName] || !canceledEvents.includes(eventName);
        };

        const runEvents = function (component, eventName, delegated) {
            return function (rawTarget, args) {
                if (!eventIsEnabled(eventName)) return;
                if (arguments.length < 2) {
                    args = [];
                }
                if (!events.hasOwnProperty(eventName) || !events[eventName] || events[eventName].length === 0) {
                    return;
                }
                let argsWithComponent = [];
                if (delegated && rawTarget.index()) {
                    argsWithComponent.push(component.find(rawTarget.index() + repeaterIdSeparator + rawTarget.id()));
                } else if (delegated) {
                    argsWithComponent.push(component.find(rawTarget.id()));
                } else {
                    argsWithComponent.push(component);
                }
                argsWithComponent = argsWithComponent.concat(args);
                let results = [];
                events[eventName].some(function (fcn) {
                    if (!eventIsEnabled(eventName)) {
                        return true;
                    }
                    results.push(fcn.apply(component, argsWithComponent));
                    return false;
                });
                uncancelEvent(eventName);
                return results;
            };
        };

        this.on = function (event, subComponent, handler) {
            let delegated = false;
            let eventName = event;
            if (arguments.length === 3) {
                eventName = event + repeaterIdSeparator + subComponent;
                delegated = true;
            } else if (arguments.length === 2) {
                handler = subComponent;
            }
            if (synonyms.hasOwnProperty(event)) {
                event = synonyms[event];
            }
            if (!events.hasOwnProperty(eventName)) {
                events[eventName] = [];
                if (existingRawEvents.includes(event)) {
                    if (delegated) {
                        // there is a bug in Let's role that prevent adding delegated event on same instance
                        this.sheet().raw().get(this.realId()).on(event, subComponent, runEvents(this, eventName, true))
                    } else {
                        this.raw().on(event, runEvents(this, eventName, false))
                    }
                }
            }
            if (!events[eventName].includes(handler)) {
                events[eventName].push(handler);
            }
            eventStates[eventName] = true;
        };

        // Cancel the next callbacks of an evet
        // Cancel happens only "once" per trigger
        this.cancelEvent = function (event) {
            if (!canceledEvents.includes(event)) {
                canceledEvents.push(event);
            }
        };

        uncancelEvent = function (event) {
            const pos = canceledEvents.indexOf(event);
            if (pos !== -1) {
                canceledEvents.splice(pos, 1);
            }
        }

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
            return runEvents(this, eventName, false)(this.raw(), Array.prototype.slice.call(arguments, 1));
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                 DataHolder                 *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const DataHolder = function (_args) {
        const sheet = _args[0];
        const realId = _args[1];
        const _data = {};
        let _persistent;

        this.hasData = function (name) {
            loadPersistent();
            return _data.hasOwnProperty(name) || _persistent.hasOwnProperty(name);
        }

        const getData = function (name) {
            loadPersistent();
            if (_data.hasOwnProperty(name)) {
                return _data[name];
            } else if (_persistent.hasOwnProperty(name)) {
                return _persistent[name];
            } else {
                return;
            }
        };

        const setData = function (name, value) {
            _data[name] = value;
            deletePersistent(name);
        };

        const deleteData = function (name) {
            if (_data.hasOwnProperty(name)) {
                delete _data[name];
            }
        }

        const loadPersistent = function (force) {
            if (typeof _persistent === 'undefined' || (arguments.length > 0 && typeof force !== 'undefined' && force)) {
                _persistent = sheet.persistingCmpData(realId);
            }
            return _persistent;
        }

        const savePersistent = function () {
            sheet.persistingCmpData(realId, _persistent);
        };

        const setPersistent = function (name, value) {
            loadPersistent();
            _persistent[name] = value;
            deleteData(name);
            savePersistent();
        };

        const deletePersistent = function (name) {
            loadPersistent();
            if (_persistent.hasOwnProperty(name)) {
                delete _persistent[name];
                savePersistent();
            }
        }

        this.data = function (name, value, persistent) {
            if (arguments.length === 1) {
                return getData.call(this, name);
            }
            _data[name] = value;
            if (arguments.length === 3 && persistent) {
                setPersistent.call(this, name, value);
            } else {
                setData.call(this, name, value);
            }
            return this;
        }

        this.deleteData = function (name, persistent) {
            if (arguments.length === 2 && persistent) {
                loadPersistent();
                deletePersistent.call(this, name);
            } else {
                deleteData.call(this, name);
            }
            return this;
        }
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

        Object.assign(this, new EventOwner);
        Object.assign(this, new DataHolder(sheet, realId));

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
        this.value = function () {
            if (arguments.length > 0) {
                let data = {};
                data[this.realId()] = arguments[0];
                sheet.setData(data);
            } else {
                let val = sheet.getPendingData(this.realId());
                if (typeof val === 'undefined') {
                    try {  // component.value() may failed
                        val = component.value();
                    } catch (e) { }
                }
                if (LRE_AUTONUM && !isNaN(val)) {
                    return Number(val)
                }
                return val;
            }
        };
        this.rawValue = function () {
            const val = component.rawValue();
            if (LRE_AUTONUM && !isNaN(val)) {
                return Number(val)
            }
            return val;
        }
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
        this.lreType = function (type) {
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
        this.exists = function () {
            // in let's role, return in a try{} doesn't exit from function block, so use a variable instead
            let result = true;
            try {
                sheet.get(realId).addClass('__lre_dummy');
                sheet.get(realId).removeClass('__lre_dummy');
            } catch (e) {
                result = false;
            }
            return result;
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreChoice                 *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const choiceCommon = {
        // For choices, if a delegated event is used ('on' called with 3 parameters)
        // The first arg is eventName
        // This second is the "value" to attach the event
        // The third is the callback
        getEventArgs: function (args) {
            let newArgs = [];
            if (args.length === 3) {
                newArgs = [
                    args[0] + '[' + args[1] + ']',
                    args[2],
                ];
            } else {
                for (i = 0; i < args.length; i++) {
                    newArgs[i] = args[i];
                }
            }
            return newArgs;
        },
        overloadEvents: function (container) {
            container.on = this.on;
            container.off = this.off;
            this.on = (function (event, subComponent, handler) {
                container.on.apply(this, choiceCommon.getEventArgs(arguments));
            }).bind(this);
            this.off = (function (event, subComponent, handler) {
                container.off.apply(this, choiceCommon.getEventArgs(arguments));
            }).bind(this);
        },
        setChoicesFromDataProvider: function (data) {
            const newChoices = {};
            const newChoiceData = {};
            let somethingHasChanged = false;
            if (data) {
                each(data, function (d) {
                    if (d && (!newChoices.hasOwnProperty(d.id) || newChoices[d.id] !== d.val)) {
                        newChoices[d.id] = d.val;
                        newChoiceData[d.id] = d.data;
                        somethingHasChanged = true;
                    }
                });
            }
            this.setChoices(newChoices);
            each(newChoiceData, (function (newData, id) {
                this.setChoiceData(id, newData);
            }).bind(this));
            if (somethingHasChanged && this.hasOwnProperty('triggerDataChange')) {
                this.triggerDataChange();
            }
        },
    };

    const lreChoice = function () {
        let tableSource;
        let choices = {};
        let choiceData = {}
        let currentValue = null;
        const eventOverload = {};

        const refreshFromChoices = function () {
            this.setChoices(choices);
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

        this.setChoices = function (newChoices) {
            choices = newChoices;
            this.raw().setChoices(choices);
            this.trigger('update', this);
        };

        this.getChoices = function () {
            if (!choices || Object.keys(choices).length === 0) {
                lreLog(this.id() + ' : ' + limitations.noChoice);
            }
            return choices;
        };

        this.getChoiceData = function () {
            if (arguments.length === 0) {
                return choiceData;
            }
            return choiceData.hasOwnProperty(arguments[0]) ? choiceData[arguments[0]] : null;
        }

        this.setChoiceData = function (k, data) {
            choiceData[k] = data;
        };

        this.populate = function (tableOrCb, lbl) {
            if (typeof tableOrCb === 'string') {
                if (arguments.length === 1) {
                    this.choices = loadFromTableIds(tableOrCb);
                    this.refresh = refreshFromChoices.bind(this);
                } else if (arguments.length === 2) {
                    this.choices = loadFromTable(tableOrCb, lbl);
                    this.refresh = refreshFromChoices.bind(this);
                }
            } else {
                this.refresh = (function () {
                    choices = tableOrCb();
                    this.setChoices(choices);
                    return choices;
                }).bind(this);
            }
            this.repopulate();
        };

        this.repopulate = function () {
            this.refresh();
        }

        this.label = function () {
            if (arguments.length === 0) {
                return choices[this.value()];
            } else if (choices.hasOwnProperty(arguments[0])) {
                return choices[arguments[0]];
            }
            return null;
        };

        this.valueData = function () {
            if (choiceData) {
                let val = this.value();
                return this.getChoiceData(val);
            }
        };

        this.row = function () {
            if (tableSource && tableSource.rows) {
                let val = this.value();
                return tableSource.rows[val];
            }
        };

        this.refresh = function () {
            this.raw().setChoices(choices);
        };

        const checkChanges = function (cmp) {
            const newValue = cmp.value();
            if (newValue !== currentValue) {
                this.trigger('select[' + newValue + ']');
                this.trigger('select', newValue);
                this.trigger('unselect[' + currentValue + ']');
                this.trigger('unselect', currentValue);
            }
            this.trigger('click[' + newValue + ']');
            currentValue = newValue;
        };

        this.initiate = function () {
            choiceCommon.overloadEvents.call(this, eventOverload);
            currentValue = this.value();
            this.lreType('choice');
            Object.assign(this, new lreDataReceiver(choiceCommon.setChoicesFromDataProvider.bind(this)));
            this.on('update', checkChanges.bind(this));
            this.setInitiated(true);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *               LreMultiChoice               *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreMultiChoice = function () {
        let checkMaxEnabled = false;
        let nbMax;
        const defaultCalculator = function () {
            return 1;
        };
        let sumCalculator = defaultCalculator
        let valuesForMax;
        const eventOverload = {};
        let currentValue = [];

        Object.assign(this, new lreChoice);

        const addObjectProperties = function (a, b) {
            const result = a;
            each(b, function (v, k) {
                if (!result.hasOwnProperty(k)) {
                    result[k] = 0;
                }
                result[k] += 1.0 * v;
            });
            return result;
        };

        const objectExceedComparison = function (a, b) {
            let exceeded = false;
            Object.keys(a).some(function (k) {
                if (b.hasOwnProperty(k) && b[k] > a[k]) {
                    exceeded = true;
                    return true;
                }
            })
            return exceeded;
        };

        const checkMax = function () {
            let result = 0;
            let data = this.getChoiceData();
            const choices = this.getChoices();
            const newValue = this.value();
            each(newValue, function (id) {
                let val = sumCalculator(choices[id], id, (data.hasOwnProperty(id) ? data[id] : undefined), result);
                if (isObject(val)) {
                    if (!isObject(result)) result = {};
                    result = addObjectProperties(result, val);
                } else {
                    result += 1.0 * val;
                }
            });
            let maxValue = nbMax;
            if (typeof nbMax === 'function') {
                maxValue = nbMax();
            }
            let exceeded = false;
            if (isObject(maxValue)) {
                exceeded = objectExceedComparison(maxValue, result);
            } else {
                exceeded = (result > maxValue && maxValue > 0);
            }
            if (exceeded && newValue.length > valuesForMax.length) {
                this.trigger('limit');
                this.disableEvent('update');
                this.value(valuesForMax.slice());
                this.enableEvent('update');
                this.cancelEvent('update');
                return;
            }
            valuesForMax = newValue;
        };

        // trigger eventName and eventName[val]
        // Event callback parameters are : component, changedValue, changedLabel, changedData
        const handleSelectEvent = function (eventName, values) {
            if (values.length > 0) {
                const args = [eventName];
                if (values.length === 1) {
                    args.push(values[0]);
                    args.push(this.label(values[0]));
                    args.push(this.getChoiceData(values[0]))
                } else {
                    const label = {};
                    const data = {};
                    const choiceData = this.getChoiceData();
                    args.push(values);
                    values.forEach((function (v) {
                        label[v] = this.label(v);
                        data[v] = choiceData[v];
                    }).bind(this));
                    args.push(data);
                }
                this.trigger.apply(this, args);
            }
            each(values, (function (val) {
                this.trigger(eventName + '[' + val + ']');
            }).bind(this));
        };

        const checkChanges = function (cmp) {
            const newValue = cmp.value();
            const selected = newValue.filter(function (x) {
                return !currentValue.includes(x);
            });
            const unselected = currentValue.filter(function (x) {
                return !newValue.includes(x);
            });
            handleSelectEvent.call(this, 'select', selected);
            handleSelectEvent.call(this, 'unselect', unselected);
            currentValue = newValue.slice();
        };

        this.initiate = function () {
            choiceCommon.overloadEvents.call(this, eventOverload);
            valuesForMax = this.raw().value();
            this.lreType('multichoice');
            Object.assign(this, new lreDataReceiver(choiceCommon.setChoicesFromDataProvider.bind(this)));
            Object.assign(this, new lreDataCollection(this, DataCollection.getDataMapper(getDataValue.bind(this)).bind(this)));
            this.on('update', checkMax);
            this.on('update', this.triggerDataChange);
            this.on('update', checkChanges.bind(this));
            this.setInitiated(true);
        };

        const getDataValue = function () {
            const result = {};
            const choiceData = this.getChoiceData();
            each(this.getChoices(), function (v, k) {
                result[k] = {
                    id: k,
                    val: v,
                    data: choiceData[k],
                };
            });
            return result;
        };

        this.maxChoiceNb = function (nb, calculator) {
            if (arguments.length === 0) {
                return nbMax
            }
            sumCalculator = arguments.length > 1 ? calculator : defaultCalculator;
            nbMax = nb;
            checkMaxEnabled = (nb > 0 || typeof nb === 'object' || typeof nb === 'function');
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

        this.checked = function () {
            return this.filter((function (d, k) {
                return this.value().includes(k);
            }).bind(this));
        };

        this.unchecked = function () {
            return this.filter((function (d, k) {
                return !this.value().includes(k);
            }).bind(this));
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *               LreRepeaterEntry             *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreRepeaterEntry = function () {
        this.initiate = function () {
            this.lreType('entry');
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
        };

        const textSimplification = function (txt) {
            return txt.replace(/\s+/g, ' ').trim();
        };

        const clickHandler = function (component) {
            const newValues = component.value();
            each(newValues, function (entryData, entryId) {
                let cmp = component.find(entryId);
                if (!entries.hasOwnProperty(entryId)) {
                    cmp.data('entryId', entryId);
                    if (!cmp.data('initiated')) {
                        cmp.data('initiated', true);
                        cmp.data('saved', false);
                        cmp.data('children', component.sheet().knownChildren(cmp));
                        // Save the data beforce potential changes in init event
                        const valueSave = deepClone(entryData);
                        component.trigger('init', cmp, entryId, entryData);
                        applyValuesToEntry(component, entryId, valueSave);
                    }
                } else if (textSimplification(cmp.text()) !== texts[entryId]
                    && (!cmp.hasData('saved') || cmp.data('saved'))) {
                    let cmp = component.find(entryId);
                    cmp.data('saved', false);
                    cmp.data('children', component.sheet().knownChildren(cmp));
                    component.trigger('edit', cmp, entryId, entryData);
                }
            });
        };

        const saveValues = function (component, value) {
            if (arguments.length === 1) {
                value = component.value();
            }
            entries = deepClone(value);
            each(value, function (data, entryId) {
                texts[entryId] = textSimplification(component.raw().find(entryId).text());
                if (texts[entryId] === editingEntryText) {
                    lreLog(component.realId() + repeaterIdSeparator + entryId + limitations.badText)
                }
            })
        };

        const initStates = function (component) {
            component.off('mouseenter', initStates);
            saveValues(component);
        };

        const applyValuesToEntry = function (repeater, entryId, data) {
            const entry = repeater.find(entryId);
            if (!entry.exists()) {
                return;
            }
            const values = repeater.value();
            if (!values.hasOwnProperty(entryId)) {
                values[entryId] = {};
            }
            each(data, function (val, id) {
                values[entryId][id] = val;
                const child = entry.find(id);
                // The child may not exists as the edit view is being closed by click on "Done"
                if (child.exists()) {
                    child.value(val);
                }
            });
        };

        const overloadObject = function (dest, data) {
            each(data, function (obj) {
                Object.assign(dest, obj);
            });
            return dest;
        };

        const updateHandler = function (component) {
            const newValues = component.value();
            let somethingHasChanged = false;
            each(entries, function (entryData, entryId) {
                if (!newValues.hasOwnProperty(entryId)) {
                    component.trigger('delete', entryId, entryData);
                    component.sheet().forget(component.realId() + repeaterIdSeparator + entryId);
                    somethingHasChanged = true;
                } else {
                    let cmp = component.find(entryId);
                    let newData = {};
                    if (!objectsEqual(entryData, newValues[entryId])) {
                        let cmp = component.find(entryId);
                        const results = component.trigger('change', cmp, entryId, newValues[entryId], entryData);
                        overloadObject(newData, results);
                        somethingHasChanged = true;
                    }
                    if (cmp.hasData('saved') && !cmp.data('saved')) {
                        cmp.data('saved', true);
                        const results = component.trigger('save', cmp, entryId, newValues[entryId], entryData);
                        overloadObject(newData, results);
                    }
                    applyValuesToEntry(component, entryId, newData);
                    if (cmp.hasData('children')) {
                        const oldChildren = cmp.data('children');
                        if (typeof oldChildren !== 'array') {
                            oldChildren = [];
                        }
                        const addedChildren = component.sheet().knownChildren(cmp);
                        each(addedChildren, function (realId) {
                            if (!oldChildren.includes(realId)) {
                                component.sheet().forget(realId);
                            }
                        });
                    }
                }
            });
            // New entries
            each(newValues, function (entryData, entryId) {
                if (!entries.hasOwnProperty(entryId)) {
                    let newData = {};
                    let cmp = component.find(entryId);
                    cmp.data('saved', true);
                    const results = component.trigger('save', cmp, entryId, entryData, {});
                    overloadObject(newData, results);
                    applyValuesToEntry(component, entryId, newData);
                    somethingHasChanged = true;
                }
            })
            if (somethingHasChanged) {
                component.trigger('dataChange', component);
            }
            saveValues(component);
        };

        this.find = function (id) {
            return this.sheet().get(this.realId() + repeaterIdSeparator + id);
        };

        this.initiate = function () {
            lreLog('Initiate Repeater ' + this.realId());
            this.lreType('repeater');
            // This following code because saveValues doesn't work well with repeater in tabs
            // Because repeaters don't have their real texts when in a tab that is not yet displayed
            //saveValues(this);
            if (typeof this.value() !== 'object' || this.value() === null) {
                this.value({});
            }
            this.on('mouseenter', initStates);
            this.on('click', clickHandler);
            this.on('update', updateHandler);
            Object.assign(this, new lreDataCollection(this, DataCollection.getDataMapper(getDataValue.bind(this)).bind(this)));
            this.setInitiated(true);
        };

        const getDataValue = function () {
            const result = {};
            each(this.value(), function (v, k) {
                result[k] = {
                    id: k,
                    val: v,
                    data: v
                };
            });
            return result;
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
            let val = this.value();
            if (val === null || (typeof val !== 'array' && typeof val !== 'object')) return;
            each(val, (function (entryData, entryId) {
                callback(this.find(entryId + cmpId), entryData, entryId);
            }).bind(this));
        };

        this.map = function (cb) {
            let val = this.value();
            let result = {};
            each(val, function (entryData, entryId) {
                result[entryId] = cb(entryData, entryId);
            });
            return result;
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreIcon                   *
     ** * * * * * * * * * * * * * * * * * * * * * */
     const lreIcon = function () {
        let currentTogglingValue = null;
        let togglingValues = [];
        let togglingData = {};
        let cmpValue = null;

        const setTogglingValue = function (val) {
            if (!val || !togglingData[val]) {
                return;
            }
            if (currentTogglingValue && togglingData[currentTogglingValue] && togglingData[currentTogglingValue].hasOwnProperty('classes')) {
                each(togglingData[currentTogglingValue].classes, this.removeClass);
            }
            if (togglingData[val].hasOwnProperty('icon')) {
                cmpValue(togglingData[val].icon);
            } else if (typeof togglingData[val] === 'string') {
                cmpValue(togglingData[val]);
            }
            if (togglingData[val].hasOwnProperty('classes')) {
                each(togglingData[val].classes, this.addClass);
            }
            currentTogglingValue = val;
        };

        const iconValue = function () {
            if (!togglingValues) {
                return this.value.call(this, arguments);
            }
            if (arguments.length === 0) {
                return currentTogglingValue;
            } else {
                setTogglingValue.call(this, arguments[0]);
            }
        };

        const handleClick = function () {
            const index = togglingValues.findIndex(function (e) {
                return currentTogglingValue === e;
            });
            if (typeof index === 'undefined') {
                index = -1;
            }
            index++;
            if (index >= togglingValues.length) {
                index = 0;
            }
            setTogglingValue.call(this, togglingValues[index]);
        };

        this.toggling = function (data) {
            togglingData = data;
            togglingValues = Object.keys(data);
            const rawValue = this.raw().value();
            const newVal = togglingValues.find(function (k) {
                return k === rawValue;
            });
            if (typeof newVal !== 'undefined') {
                setTogglingValue.call(this, newVal);
            }

            this.on('click', handleClick);
        };

        this.untoggling = function () {
            this.off('click', handleClick);
        };

        this.initiate = function () {
            this.lreType('icon');
            cmpValue = this.value.bind(this);
            this.value = iconValue.bind(this);
            this.setInitiated(true);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                DataReceiver                *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreDataReceiver = function (_args) {
        let dataOrigin;
        let dataMapping = function (item, key, data) {
            return {
                id: key,
                val: item,
                data: data,
            };
        };
        const dataMappingKeepData = function (_mapper) {
            if (typeof _mapper === 'function') {
                return function (item, key, data) {
                    return Object.assign({
                        id: key,
                        val: item,
                        data: data,
                    }, _mapper(item, key, data));
                };
            } else if (typeof _mapper === 'string') {
                return function (item, key, data) {
                    return {
                        id: key,
                        val: data[_mapper],
                        data: data,
                    };
                };
            } else {
                log('[LRE] Invalid data mapper. Must be a string or a function. ' + (typeof _mapper) + ' given.')
            }
        };
        let dataSetter = _args[0];

        const populate = function (source) {
            source.mapData(dataMapping, dataSetter);
        };

        this.populateFrom = function (collection, mapping, dependencies) {
            if (dataOrigin) {
                dataOrigin.off('dataChange', populate);
            }
            dataOrigin = collection;
            if (arguments.length > 1) {
                dataMapping = dataMappingKeepData(mapping);
            }
            dataOrigin.on('dataChange', populate);
            if (dependencies && dependencies.forEach) {
                dependencies.forEach(function (cmp) {
                    cmp.on('update', refresh);
                });
            }
            this.refresh = refresh;
            this.refresh();
        };

        const refresh = function () {
            populate(dataOrigin);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                DataCollection              *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const DataCollection = {
        STOP: '__lreMustStop__',
        STOP_RESULT: {},  // as of it is impossible to initialise with { [STOP]: true }, this object will be initialised just after
        onlyResult: function (resultVal) {
            return resultVal.result;
        },
        getDataMapper: function (valueGetter) {
            return function (args) {
                const cb = args.cb;
                const result = [];
                const useFilter = (args.hasOwnProperty('filter'));
                const values = valueGetter();
                let hasBeenStopped = false;
                Object.keys(values).some(function (id) {
                    let value = values[id];
                    if (value.hasOwnProperty(DataCollection.STOP) && value[DataCollection.STOP]) {
                        hasBeenStopped = true;
                        return true;
                    }
                    if (!useFilter || args.filter(value.val, id, value.data)) {
                        let res = cb(value.val, id, value.data)
                        result.push({
                            id: id,
                            val: value.val,
                            data: value.data,
                            result: res,
                        });
                        if (res && res.hasOwnProperty(DataCollection.STOP) && res[DataCollection.STOP]) {
                            hasBeenStopped = true;
                            return true;
                        }
                    }
                })
                if (!hasBeenStopped && args.hasOwnProperty('sorter') && args.sorter) {
                    result.sort(args.sorter);
                }
                return result.map(DataCollection.onlyResult);
            };
        },
    }
    DataCollection.STOP_RESULT[DataCollection.STOP] = true;

    const lreDataCollection = function (_args) {
        const dataSource = _args[0];
        const dataMapper = _args[1];

        const mapper = function (transform) {
            if (!dataMapper) return;
            return dataMapper({ cb: transform });
        }

        const toRow = function (valObject) {
            if (valObject && valObject.data) {
                const result = Object.assign({}, valObject);
                Object.keys(valObject.data).forEach(function (v) {
                    if (!result.hasOwnProperty(v)) {   // prevent accidental overwrite
                        result[v] = valObject.data[v];
                    }
                });
                return result;
            }
            return valObject;
        }

        this.mapData = function (transform, setter) {
            if (!dataMapper) return;
            setter(mapper(transform));
        };

        const getFilteredDataMapper = function (filter) {
            return function (args) {
                const newArgs = Object.assign({}, args, { filter: filter });
                return dataMapper(newArgs);
            };
        };

        const valSorter = function (a, b) {
            return a.val < b.val ? -1 : (a.val > b.val ? 1 : 0);
        }

        const columnSorter = function (column) {
            return function (a, b) {
                let aval, bval;
                if (a && isObject(a.data) && b && isObject(b.data)) {
                    aval = a.data[column];
                    bval = b.data[column];
                } else if (a && isObject(a.val) && b && isObject(b.val)) {
                    aval = a.val[column];
                    bval = b.val[column];
                }
                return aval < bval ? -1 : (aval > bval ? 1 : 0);
            }
        };

        const getSortedDataMapper = function (sorter) {
            if (arguments.length === 0 || typeof sorter === 'undefinde' || !sorter) {
                sorter = valSorter;
            } else if (typeof sorter === 'string') {
                sorter = columnSorter(sorter)
            }
            return function (args) {
                const newArgs = Object.assign({}, args, { sorter: sorter });
                return dataMapper(newArgs);
            };
        };

        this.filter = function (filter) {
            return new lreDerivedDataCollection(dataSource, getFilteredDataMapper(filter));
        };

        this.sort = function (sorter) {
            let sortedDataMapper;
            if (arguments.length === 0) {
                sortedDataMapper = getSortedDataMapper();
            } else {
                sortedDataMapper = getSortedDataMapper(sorter);
            }
            return new lreDerivedDataCollection(dataSource, sortedDataMapper);
        };

        this.sortBy = function (sortedValueExtractor) {
            return new lreDerivedDataCollection(dataSource, getSortedDataMapper(function (a, b) {
                const valA = sortedValueExtractor(a.val, a.id, a.data);
                const valB = sortedValueExtractor(b.val, a.id, a.data);
                return valA < valB ? -1 : (valA > valB ? 1 : 0);
            }));
        };

        this.triggerDataChange = function () {
            this.trigger('dataChange');
        };

        this.search = function (searcher) {
            const result = mapper(function (item, key, data) {
                if (searcher(item, key, data)) {
                    return toRow({
                        id: key,
                        val: item,
                        data: data,
                    });
                }
            });
            return result.filter(Boolean);
        };

        this.toArray = function () {
            return mapper(function (item, key, data) {
                return toRow({
                    id: key,
                    val: item,
                    data: data,
                });
            });
        };

        this.count = function () {
            let cnt = 0;

            mapper(function (item, key, data) {
                cnt++;
            });

            return cnt;
        };

        const getValueGetter = function (args) {
            let valueGetter = function (item, key, data) {
                return item;
            };
            if (args.length > 0) {
                if (typeof args[0] === 'string') {
                    valueGetter = function (item, key, data) {
                        return data[args[0]];
                    };
                } else if (typeof args[0] === 'function') {
                    valueGetter = args[0];
                }
            }
            return valueGetter;
        };

        const findByComparison = function (valueGetter, comparator) {
            let foundObject, foundValue = null;

            mapper(function (item, key, data) {
                const val = valueGetter(item, key, data);
                if (foundValue === null || comparator(val, foundValue)) {
                    foundValue = val;
                    foundObject = {
                        id: key,
                        val: item,
                        data: data,
                    };
                }
            });

            return toRow(foundObject);
        }

        this.min = function (_column) {
            return findByComparison(getValueGetter(arguments), function (a, b) {
                return (a < b);
            });
        };

        this.max = function (_column) {
            return findByComparison(getValueGetter(arguments), function (a, b) {
                return (a > b);
            });
        };

        this.countDistinct = function (_column) {
            const values = {};
            const getValue = getValueGetter(arguments);

            mapper(function (item, key, data) {
                values[getValue(item, key, data)] = 1;
            });

            return Object.keys(values).length;
        };

        this.sum = function (_column) {
            let sum = 0;
            const getValue = getValueGetter(arguments);

            mapper(function (item, key, data) {
                let val = getValue(item, key, data);
                if (!isNaN(val)) {
                    sum += 1 * val;
                }
            });

            return sum;
        };

        this.getBy = function (_column, value) {
            const getValue = getValueGetter(arguments);
            const foundObject = null;
            mapper(function (item, key, data) {
                let val = getValue(item, key, data);
                if (val === value) {
                    foundObject = {
                        id: key,
                        val: item,
                        data: data,
                    };
                    return DataCollection.STOP_RESULT;
                }
            });
            return toRow(foundObject);
        };
    };

    const lreDerivedDataCollection = function (_args) {
        const dataSource = _args[0];
        const dataMapper = _args[1];
        const _this = this;

        this.raw = dataSource.raw;

        Object.assign(this, new EventOwner);
        Object.assign(this, new lreDataCollection(dataSource, dataMapper))

        dataSource.on('dataChange', function (source) {
            _this.triggerDataChange();
        });
    }

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                   LreTable                 *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const overloadTables = function (_Tables) {
        const tableList = {};
        Tables = {
            get: function (_id, preload) {
                if (arguments.length < 2) {
                    preload = false;
                }
                if (!tableList.hasOwnProperty(_id)) {
                    tableList[_id] = new lreTable(_Tables.get(_id), _id, preload);
                }
                if (preload && !tableList[_id].loaded()) {
                    tableList[_id].load();
                }
                return tableList[_id];
            }
        };
    };

    const lreTable = function (_args) {
        const rawTable = _args[0];
        const id = _args[1];
        const preload = _args[2];
        const ids = [];
        const rows = {};
        let loaded = false;

        // transformData is called at every "data get"
        // in order to allow LRE_AUTONUM changes on runtime
        const transformData = function (row) {
            if (!LRE_AUTONUM) return row;
            const result = {};
            for (k in row) {
                result[k] = isNaN(row[k]) ? row[k] : Number(row[k]);
            }
            return result;
        };

        this.get = function (id) {
            // id can be number so we force it as string because LR only accepts string 
            return transformData(loaded ? rows[id] : rawTable.get('' + id));
        };

        this.random = rawTable.random;

        this.id = function () {
            return id;
        };

        this.each = function (cb) {
            this.load();
            ids.every(function (id) {
                const result = cb(transformData(rows[id]));
                return (result === undefined || result != false);
            });
        };

        this.loaded = function () {
            return loaded;
        }

        this.load = function () {
            if (loaded) {
                return;
            }
            rawTable.each(function (row) {
                ids.push(row.id);
                rows[row.id] = row;
            })
            loaded = true;
        };

        const getDataValue = function () {
            this.load();
            const result = {};
            ids.forEach(function (id) {
                result[id] = {
                    id: id,
                    val: transformData(rows[id]),
                    data: transformData(rows[id]),
                };
            });
            return result;
        };

        if (preload === true) {
            this.load();
        } else {
            wait(200, this.load)
        }

        Object.assign(this, new EventOwner);
        Object.assign(this, new lreDataCollection(this, DataCollection.getDataMapper(getDataValue.bind(this)).bind(this)));

    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                   LreSheet                 *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreSheet = function (_args) {
        const sheet = _args[0];
        const toRemember = [];
        const toDelete = [];
        const components = new ComponentContainer(this);

        Object.assign(this, new DataHolder(sheet, sheet.id()))

        this.getVariable = sheet.getVariable;

        let isDataSetPending = false;
        let pendingDataToSet = [];
        let pendingDataToSetIndex = {};
        let pendingDataProcessed;


        const groupedDataSet = function () {
            const dataToSend = {};
            let added = 0;
            let analysed = 0;
            while (added < maxDataSet && pendingDataToSet.length > 0) {
                let data = pendingDataToSet.shift();
                delete pendingDataToSetIndex[data.k];
                if (typeof data.v !== 'undefined' && !Number.isNaN(data.v)) {
                    dataToSend[data.k] = data.v;
                    added++;
                }
                analysed++;
            }
            isDataSetPending = (pendingDataToSet.length > 0);
            if (isDataSetPending) {
                for (k in pendingDataToSetIndex) {
                    if (pendingDataToSetIndex[k] >= analysed) {
                        pendingDataToSetIndex[k] -= analysed;
                    }
                }
                wait(asyncDataSetAgainDelay, groupedDataSet);
            }
            sheet.setData(dataToSend);
            if (!isDataSetPending && pendingDataProcessed) {
                try {
                    pendingDataProcessed();
                } catch (e) {
                    lreLog('Error occured in pendingDataProcessed : ' + e.toString())
                }
            }
        };

        this.setData = function (data) {
            each(data, function (v, k) {
                if (pendingDataToSetIndex.hasOwnProperty(k) && typeof pendingDataToSet[pendingDataToSetIndex[k]] !== 'undefined') {
                    pendingDataToSet[pendingDataToSetIndex[k]].v = v;
                } else {
                    pendingDataToSetIndex[k] = pendingDataToSet.length;
                    pendingDataToSet.push({ k: k, v: v });
                }
            });
            if (!isDataSetPending && pendingDataToSet.length > 0) {
                isDataSetPending = true;
                wait(asyncDataSetDelay, groupedDataSet);
            }
        };

        this.getPendingData = function (id) {
            if (pendingDataToSetIndex.hasOwnProperty(id)) {
                return pendingDataToSet[pendingDataToSetIndex[id]].v;
            }
            return;
        };

        this.onPendingDataProcessed = function (cb) {
            pendingDataProcessed = cb;
        };

        this.getData = sheet.getData;
        this.prompt = sheet.prompt;
        this.id = sheet.id;
        this.realId = sheet.id;
        this.getSheetId = sheet.getSheetId;
        this.getSheetType = sheet.getSheetType
        this.name = sheet.name;

        this.get = function (id) {
            let strId, cmp;
            if (typeof id === 'string' || id instanceof String) {
                strId = id;
            } else if (!isNaN(id)) {
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
            let cmp = getComponent(this, id);
            Object.assign(cmp, new lreChoice);
            cmp.initiate();
            return cmp;
        };

        this.initIcon = function (id) {
            let cmp = getComponent(this, id);
            Object.assign(cmp, new lreIcon);
            cmp.initiate();
            return cmp;
        };

        this.initMultiChoice = function (id) {
            let cmp = getComponent(this, id);
            if (!Array.isArray(cmp.value())) {
                lreLog('Unable to initialize multichoice : ' + id + ' is not a Choice component');
                return;
            }
            Object.assign(cmp, new lreMultiChoice);
            cmp.initiate();
            return cmp;
        };

        this.initRepeater = function (id) {
            let cmp = getComponent(this, id);
            Object.assign(cmp, new lreRepeater);
            cmp.initiate();
            return cmp;
        };

        this.raw = function () {
            return sheet;
        };

        this.sheet = function () {
            return this;
        };

        this.lreType = function () {
            return 'sheet';
        }

        const rememberOneFromQueue = function () {
            wait(asyncCacheDelay, (function () {
                if (toRemember.length === 0) return;
                let realId = toRemember.shift();
                this.get(realId);
                if (toRemember.length > 0) {
                    rememberOneFromQueue.call(this);
                }
            }).bind(this));
        };

        this.remember = function (realId) {
            if (!components.inCache(realId) && !toRemember.includes(realId)) {
                toRemember.push(realId);
                let posToDelete = toDelete.indexOf(realId);
                if (posToDelete !== -1) {
                    toDelete.splice(posToDelete, 1);
                }
                rememberOneFromQueue.call(this);
            }
        };

        const forgetOneFromQueue = function () {
            wait(asyncCacheDelay, (function () {
                if (toDelete.length === 0) return;
                // Find if there is one sub component in cache
                let cmp = components.inCache('*' + toDelete[0]);
                if (cmp) {
                    components.unset(cmp.realId());
                } else {
                    components.unset(toDelete.shift());
                }
                if (toDelete.length > 0) {
                    forgetOneFromQueue.call(this);
                }
            }).bind(this));
        };

        this.forget = function (realId) {
            if (components.inCache(realId) && !toDelete.includes(realId)) {
                toDelete.push(realId);
                let posToRemember = toRemember.indexOf(realId);
                if (posToRemember !== -1) {
                    toRemember.splice(posToRemember, 1);
                }
                forgetOneFromQueue.call(this);
            }
        };

        this.knownChildren = function (cmp) {
            return components.children(cmp.realId());
        };

        const loadPersistingData = function (rawSheet) {
            const data = rawSheet.getData();
            let result = {
                initialised: false,
                cmpData: {},
            };
            if (data.hasOwnProperty(rawSheet.id())) {
                Object.assign(result, data[rawSheet.id()]);
            }
            return result;
        };
        let persistingData = loadPersistingData(sheet);

        this.persistingData = function () {
            const dataName = arguments[0];
            if (arguments.length > 1) {
                persistingData[dataName] = arguments[1];
                const newData = {};
                newData[this.id()] = persistingData;
                this.setData(newData);
            }
            if (!persistingData.hasOwnProperty(dataName)) {
                return null;
            }
            return persistingData[dataName];
        }

        this.deletePersistingData = function (dataName) {
            if (persistingData.hasOwnProperty(dataName)) {
                delete persistingData[dataName];
                const newData = {};
                newData[this.id()] = persistingData;
                this.setData(newData);
            }
        };

        this.persistingCmpData = function () {
            const dataName = arguments[0];
            if (arguments.length > 1) {
                persistingData.cmpData[dataName] = arguments[1];
                const newData = {};
                newData[this.id()] = persistingData;
                this.setData(newData);
            } else if (!persistingData.cmpData.hasOwnProperty(dataName)) {
                return {};
            }
            return persistingData.cmpData[dataName];
        }
    };

    if (!lreIntiated) {
        initLre();
        lreIntiated = true;
    }

    if (typeof _arg === 'function') {
        return function (_sheet) {
            const id = _sheet.id()
            const sheetId = _sheet.getSheetId();
            lreLog('INIT on ' + id + '(' + _sheet.name() + (sheetId ? ' #' + sheetId : '') + ')');
            // The wait may allow a faster display
            wait(0, function () {
                let data = _sheet.getData();
                let sheet = getLreSheet(_sheet, true);
                if (!sheet.persistingData('initialised') && typeof firstInit !== 'undefined') {
                    sheet.persistingData('initialised', firstInit(sheet));
                }
                _arg.call(this, sheet);
            })
        }
    }
}
// LRE
//endregion