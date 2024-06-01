//region LRE 6.22
// Custom functions
function isObject(object) {
    return object != null && typeof object === 'object';
}

function strlen(str) {
    return str ? str.split('').length : 0;
};

function mt_rand(min, max) {
    const rnd = Math.random();

    return min + Math.floor(rnd * (max - min + 1));
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

function arrayDiff(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return [];
    return a.filter(function (i) {
        return !b.includes(i);
    });
}

function arrayMergeUnique(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return [];
    return a.concat(b.filter(function (v) { return !a.includes(v) }));
}

function deepEqual(x, y) {
    if (x === y) {
        return true;
    }
    else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
        if (Object.keys(x).length != Object.keys(y).length) {
            return false;
        }

        for (var prop in x) {
            if (y.hasOwnProperty(prop)) {
                if (!deepEqual(x[prop], y[prop])) {
                    return false;
                }
            } else {
                return false;
            }
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

function deepMerge(target) {
    var sources = Array.from.call(null, arguments).slice(1);
    if (!sources.length) return target;
    var source = sources.shift();
    if (isObject(target) && isObject(source)) {
        var _loop = function _loop(key2) {
            if (isObject(source[key2])) {
                if (!target[key2]) target = Object.assign({}, target, (function () {
                    var o = {};
                    o[key2] = {};
                    return o;
                })());
                target[key2] = deepMerge(target[key2], source[key2]);
            } else {
                target = Object.assign({}, target, (function () {
                    var o = {};
                    o[key2] = source[key2];
                    return o;
                })());
            }
        };
        for (var key in source) _loop(key);
    }
    return deepMerge.apply(null, [target].concat(sources));
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
    if (typeof obj !== 'object' || obj === null || obj instanceof Array || Array.isArray(obj)) {
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
            case 'undefined':
                return 'undefined';
            case 'object':
                if (obj instanceof Date) return '"' + obj.toISOString() + '"';
                if (obj instanceof Array || Array.isArray(obj)) return "[\n" + indent_ + obj.map(recursive).join(",\n" + indent_) + "\n" + indent + "]";
                if (obj === null) return 'null';
            default:
                return recursive(obj);
        }
    }

    return "{\n" + Object.keys(obj).map(function (k) {
        return indent_ + '"' + k + '": ' + recursive(obj[k]);
    }).join(",\n") + "\n" + indent + "}";
};

// convert a number to a string of letters
function intToAlpha(n) {
    let s = '';
    const K = 26;
    const charBase = [65, 97];
    while (n >= K * 2) {
        const m = ~~(n / (K * 2));
        const r = n - m * K * 2;
        s = String.fromCharCode(charBase[~~(r / K)] + r % K) + s;
        n = m;
    }
    s = String.fromCharCode(charBase[~~(n / K)] + n % K) + s;
    return s;
};

// convert a string of letters to a number
function alphaToNum(s) {
    let n = 0;
    let c;
    let K = 1;
    let length = s.split('').length;
    for (let i = 0; i < length; i++) {
        c = s.charCodeAt(length - 1 - i);
        n += (c - ((c & 96) === 96 ? 97 - 26 : 65)) * K;
        K = K * 52;
    }
    return n;
};

function initChoicesWithEmpty(defaultLabel) {
    const choices = {};
    choices[''] = arguments.length > 0 ? defaultLabel : '';
    return choices;
};

let LRE_AUTONUM = false;
// Main container
let lreInitiated = false;
let LRE_GROUPED_VALUE_CHANGE = true;
function lre(_arg) {
    let errExclFirstLine, errExclLastLine;
    try { let a = null; a() } catch (e) { errExclFirstLine = e.trace[0].loc.start.line };

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

    const lreLog = function (_str) {
        log('[LRE] ' + _str);
    }

    function handleError(e, additionals) {
        const trace = e && e.trace ? e.trace : [];
        const last = trace.find(function (t) {
            return t && t.loc && t.loc.start && (t.loc.start.line < errExclFirstLine || t.loc.start.line > errExclLastLine);
        });
        let start = 0, end = 0;
        if (last && last.loc && last.loc.start && last.loc.end) {
            start = last.loc.start.line;
            end = last.loc.end.line;
        }
        let sMessage = 'Error found ';
        if (start !== end) {
            sMessage += 'between lines ' + start + ' and ' + end;
        } else {
            sMessage += 'at line ' + start;
        }
        sMessage += ' => ' + e.name + ': ' + e.message;
        lreLog(sMessage);
        if (arguments.length > 1) {
            lreLog('Additional informations : ' + additionals);
        }
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
    const existingRawEvents = ['click', 'update', 'mouseenter', 'mouseleave', 'keyup', 'change'];
    const EventOwner = function (args) {
        const events = {};
        const synonyms = {
            //'change': 'update'
        }
        const canceledEvents = [];
        let lastUpdateEventValue;

        const eventIsEnabled = function (eventName) {
            return events.hasOwnProperty(eventName) && events[eventName].state && !canceledEvents.includes(eventName);
        };

        const containingRepeater = function (rawCmp) {
            let current = rawCmp.parent().find(rawCmp.id()).parent();
            let i = 0;
            let found = false;
            while (current && !found && i < 100) {
                // current is the entry containing rawCmp, current's parent is the repeater
                found = (current.id() === rawCmp.index());
                current = current.parent();
                i++;
            }
            return current;
        };

        const runEvents = function (component, eventName, manuallyTriggered) {
            if (arguments.length < 3) {
                manuallyTriggered = false;
            }
            return function (rawTarget, args) {
                if (!eventIsEnabled(eventName)) return;
                if (arguments.length < 2) {
                    args = [];
                }
                if (!events.hasOwnProperty(eventName) || !events[eventName] || !Array.isArray(events[eventName].handlers) || events[eventName].handlers.length === 0) {
                    return;
                }
                const event = events[eventName];
                let argsWithComponent = [];
                let cmp = null;
                if (event.delegated && rawTarget.index()) {
                    cmp = component.find(rawTarget.index() + repeaterIdSeparator + rawTarget.id());
                } else if (event.delegated) {
                    cmp = component.find(rawTarget.id());
                } else {
                    cmp = component;
                }
                let currentValue = undefined;
                try {
                    if (rawTarget.value) {
                        currentValue = rawTarget.value();
                    }
                } catch (e) {
                }
                if (eventName === 'update' && !manuallyTriggered && (currentValue === lastUpdateEventValue)) {
                    return false;
                }
                lastUpdateEventValue = deepClone(currentValue);
                argsWithComponent.push(cmp);
                argsWithComponent = argsWithComponent.concat(args);
                let results = [];
                event.handlers.some(function (fcn) {
                    if (!eventIsEnabled(eventName)) {
                        return true;
                    }

                    try {
                        results.push(fcn.apply(component, argsWithComponent));
                    } catch (e) {
                        handleError(e, 'event ' + eventName + ' on ' + rawTarget.id());
                    }

                    return false;
                });
                uncancelEvent(eventName);
                return results;
            };
        };

        this.once = function (event, subComponent, handler) {
            if (arguments.length === 2) {
                const onceHandler = (function () {
                    this.off(event, subComponent);
                }).bind(this);
                this.on(event, subComponent);
                this.on(event, onceHandler);
            } else {
                const onceHandler = (function () {
                    this.off(event, subComponent, handler);
                }).bind(this);
                this.on(event, subComponent, handler);
                this.on(event, subComponent, onceHandler);
            }
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
            if (!events.hasOwnProperty(eventName) || events[eventName].handlers.length === 0) {
                events[eventName] = {
                    name: eventName,
                    event: event,
                    delegated: delegated,
                    subComponent: delegated ? subComponent : null,
                    state: true,
                    handlers: [],
                    rawHandler: runEvents(this, eventName),
                };
                if (existingRawEvents.includes(event)) {
                    if (delegated) {
                        // there is a bug in Let's role that prevent adding delegated event on same instance
                        this.sheet().raw().get(this.realId()).on(event, subComponent, events[eventName].rawHandler);
                    } else {
                        this.raw().on(event, events[eventName].rawHandler);
                    }
                }
            }
            if (!events[eventName].handlers.includes(handler)) {
                events[eventName].handlers.push(handler);
                this.trigger('eventhandleradded', event, subComponent, handler);
            }
        };

        // Cancel the next callbacks of an event
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
            if (!events[event]) {
                this.on(event, function () {});
            }
            events[event].state = false;
        };
 
        this.enableEvent = function (event) {
            if (!events[event]) {
                this.on(event, function () {});
            }
            events[event].state = true;
        }

        this.off = function (eventName, handler) {
            if (!events.hasOwnProperty(eventName)) {
                return;
            }
            const event = events[eventName];
            if (handler !== undefined) {
                const idx = event.handlers.indexOf(handler);
                if (handler !== -1) {
                    event.handlers.splice(idx, 1);
                }
            } else {
                event.handlers = []
            }
            if (event.handlers.length === 0) {
                this.raw().off(eventName);

            }
        };

        this.trigger = function (eventName) {
            return runEvents(this, eventName, true)(this.raw(), Array.prototype.slice.call(arguments, 1));
        };

        this.transferEvents = function (rawCmp) {
            each(events, (function (event) {
                if (!event.delegated) {  // delegated event are automaticaly transfered
                    rawCmp.on(event.event, event.rawHandler);
                }
            }).bind(this));
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
        let component = _args[1];
        let realId = _args.length >= 3 ? _args[2] : component.id();
        this._realId = realId;
        this._type = 'component';
        let initiated = false;
        let parent;
        let lreEntry;
        let lreRepeater;
        let mustSaveClasses = false;
        let classChanges = {}; // object of key=className and value=0 deleted =1 added

        Object.assign(this, new EventOwner);
        Object.assign(this, new DataHolder(sheet, realId));

        this.addClass = function (className) {
            classChanges[className] = 1;
            if (mustSaveClasses) {
                saveClassChanges();
            }
            component.addClass(className);

            return this;
        }

        this.getClasses = component.getClasses;
        this.hasClass = component.hasClass;
        this.toggleClass = component.toggleClass;

        this.find = function (completeId) {
            const tabId = completeId.split(repeaterIdSeparator);
            const id = tabId.pop();
            const sRealId = tabId.join(repeaterIdSeparator) + (tabId.length > 0 ? repeaterIdSeparator : '') + id;
            return this.sheet().get(sRealId)
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
        this.setToolTip = component.setToolTip;
        this.removeClass = function (className) {
            classChanges[className] = 1;
            if (mustSaveClasses) {
                saveClassChanges();
            }
            component.removeClass(className);

            return this;
        }
        this.value = function () {
            if (arguments.length > 0) {
                const oldValue = this.value();
                if (LRE_GROUPED_VALUE_CHANGE) {
                    let data = {};
                    data[this.realId()] = arguments[0];
                    sheet.setData(data);
                } else {
                    component.value(arguments[0]);
                }
                if (oldValue !== arguments[0]) {
                    // This line doesn't work with repeater, choice…
                    //if (typeof arguments[0] !== "object"
                    //    && component.text() === component.value()
                    //    && !['repeater', 'choice', 'multichoice'].include(this._type !== 'repeater')) this.text(arguments[0]);
                    this.trigger('update');
                }
            } else {
                let val = sheet.getPendingData(this.realId());
                if (typeof val === 'undefined') {
                    try {  // component.value() may failed
                        val = component.value();
                    } catch (e) { }
                } else if (this._type === 'repeater') {
                    // a repeater with a pending value set, we must set it immediately when we need it because it has impact on existing elements
                    //sheet.sendPendingDataFor(this.realId());
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
        this.refreshRaw = function () {
            const newRaw = sheet.raw().get(realId);
            this.transferEvents(newRaw)
            component = newRaw;
            return this;
        };
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
            return sheet.componentExists(realId);
        };

        this.knownChildren = function () {
            return sheet.knownChildren(this);
        };
        const saveClassChanges = function () {
            classChanges = sheet.persistingCmpClasses(realId, classChanges);
        };

        this.autoSaveClasses = function () {
            mustSaveClasses = true;
            saveClassChanges();
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
                    if (d && typeof d.id !== 'undefined' && (!newChoices.hasOwnProperty(d.id) || newChoices[d.id] !== d.val)) {
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

    const lreChoice = function (_args) {
        let tableSource;
        let choiceData = {}
        let currentValue = null;
        const eventOverload = {};
        let getChoices, setChoices;
        (function () {
            let choices = {};
            getChoices = _args[0] || function () {
                return choices;
            }
            setChoices = _args[1] || function (newChoices) {
                choices = newChoices;
            }
        })();

        const refreshFromChoices = function () {
            this.setChoices(getChoices());
        };

        const loadFromTableIds = function (tableName) {
            tableSource = { table: tableName, col: 'id', rows: {} }
            const tmpChoices = {};
            Tables.get(tableName).each(function (row) {
                tmpChoices[row.id] = row.id;
                tableSource.rows[row.id] = row;
            })
            setChoices(tmpChoices);
            return tmpChoices;
        };

        const loadFromTable = function (tableName, lbl) {
            tableSource = { table: tableName, col: lbl, rows: {} }
            const tmpChoices = {};
            Tables.get(tableName).each(function (row) {
                tmpChoices[row.id] = row[lbl];
                tableSource.rows[row.id] = row;
            });
            setChoices(tmpChoices);
            return tmpChoices;
        }

        this.setChoices = function (newChoices) {
            if (newChoices.hasOwnProperty(undefined)) {
                lreLog('Try to set an undefined value to choice ' + this.id());
            }
            const currentValue = this.value();
            if (newChoices && !newChoices.hasOwnProperty(currentValue)) {
                const currentChoices = getChoices();
                const availableValues = Object.keys(currentChoices);
                const newValues = Object.keys(newChoices);
                if (availableValues.length && newValues.length && !newValues.includes(currentValue)) {
                    const tmpChoices = {};
                    tmpChoices[currentValue] = currentChoices[currentValue];
                    tmpChoices[newValues[0]] = newChoices[newValues[0]];
                    this.raw().setChoices(tmpChoices);
                    this.value(newValues[0]);
                }
            }
            setChoices(newChoices);
            try {
                this.raw().setChoices(newChoices);
            } catch (e) {

            }
            this.trigger('update', this);
        };

        this.getChoices = function () {
            const currentChoices = getChoices();
            if (!currentChoices || Object.keys(currentChoices).length === 0) {
                lreLog(this.id() + ' : ' + limitations.noChoice);
            }
            return currentChoices;
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

        this.populate = function (tableOrCb, lbl, optional) {
            let opt = false
            if (arguments.length >= 3) {
                opt = optional;
            }
            if (typeof tableOrCb === 'string') {
                const newChoices = opt ? initChoicesWithEmpty('') : {};
                if (arguments.length === 1) {
                    setChoices(Object.assign(newChoices, loadFromTableIds(tableOrCb)));
                    this.refresh = refreshFromChoices.bind(this);
                } else if (arguments.length >= 2) {
                    setChoices(Object.assign(newChoices, loadFromTable(tableOrCb, lbl)));
                    this.refresh = refreshFromChoices.bind(this);
                }
            } else {
                this.refresh = (function () {
                    const tmpChoices = tableOrCb();
                    setChoices(tmpChoices);
                    this.setChoices(tmpChoices);
                    return tmpChoices;
                }).bind(this);
            }
            this.repopulate();
        };

        this.repopulate = function () {
            this.refresh();
        }

        this.label = function () {
            return this.text();
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
            this.raw().setChoices(getChoices());
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
            lreLog('Initiate Choice ' + this.realId());
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
    const lreMultiChoice = function (_args) {
        const OVER = 1, UNDER = -1;
        let nbMax, nbMin;
        const defaultCalculator = function () {
            return 1;
        };
        let sumCalculatorMax = defaultCalculator, sumCalculatorMin = defaultCalculator
        let valuesForMinMax;
        const eventOverload = {};
        let currentValue = [];
        let getChoices, setChoices;
        (function () {
            let choices = {};
            getChoices = function () {
                return choices;
            }
            setChoices = function (newChoices) {
                choices = newChoices;
            }
        })();

        Object.assign(this, new lreChoice(getChoices, setChoices));

        const sanitizeValue = function (val) {
            if (val !== null && typeof val !== "undefined" && !Array.isArray(val)) {
                return [val];
            }
            return val;
        }

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

        const objectExceedComparison = function (a, b, overunder) {
            let exceeded = false;
            Object.keys(a).some(function (k) {
                if (b.hasOwnProperty(k) && overunder * b[k] > overunder * a[k]) {
                    exceeded = true;
                    return true;
                }
            })
            return exceeded;
        };

        const calculate = function (choices, data, id, calculator, result) {
            let val = calculator(choices[id], id, (data.hasOwnProperty(id) ? data[id] : undefined), result);
            if (isObject(val)) {
                if (!isObject(result)) result = {};
                result = addObjectProperties(result, val);
            } else {
                result += 1.0 * val;
            }

            return result;
        }

        const testExceeded = function (limit, result, newValues, prevValues, overunder) {
            if (overunder * newValues < overunder * prevValues.length) {
                return false;
            } else if (isObject(limit)) {
                return objectExceedComparison(limit, result, overunder);
            } else {
                return limit > 0 && overunder * result > overunder * limit;
            }
        }

        const checkMinMax = function () {
            let resultMin = 0, resultMax = 0;
            let data = this.getChoiceData();
            const choices = getChoices();
            const newValue = this.value();

            each(newValue, function (id) {
                resultMin = calculate(choices, data, id, sumCalculatorMin, resultMin);
                resultMax = calculate(choices, data, id, sumCalculatorMax, resultMax);
            });
            let maxValue = typeof nbMax === 'function' ? nbMax() : nbMax;
            let minValue = typeof nbMin === 'function' ? nbMin() : nbMin;

            if (testExceeded(maxValue, resultMax, newValue, valuesForMinMax, OVER)
                || testExceeded(minValue, resultMin, newValue, valuesForMinMax, UNDER)) {
                this.trigger('limit');
                this.disableEvent('update');
                this.value(valuesForMinMax.slice());
                this.enableEvent('update');
                this.cancelEvent('update');
                return;
            }
            valuesForMinMax = newValue.slice();
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


        this.setChoices = function (newChoices) {
            if (newChoices.hasOwnProperty(undefined)) {
                lreLog('Try to set an undefined value')
            }
            const values = this.value();
            const currentValues = this.value();
            const newValues = currentValues.filter(function (val) {
                return newChoices.hasOwnProperty(val);
            });
            setChoices(newChoices);
            this.raw().setChoices(newChoices);
            if (arrayDiff(values, newValues).length !== 0 || arrayDiff(newValues, values).length !== 0) {
                this.value(newValues);
                this.trigger('update', this);
            }
        };

        this.initiate = function () {
            lreLog('Initiate Choice ' + this.realId());
            choiceCommon.overloadEvents.call(this, eventOverload);
            valuesForMinMax = this.raw().value();
            this.lreType('multichoice');
            Object.assign(this, new lreDataReceiver(choiceCommon.setChoicesFromDataProvider.bind(this)));
            Object.assign(this, new lreDataCollection(this, DataCollection.getDataMapper(getDataValue.bind(this)).bind(this)));
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
            this.on('update', checkMinMax);
            sumCalculatorMax = arguments.length > 1 ? calculator : defaultCalculator;
            nbMax = nb;
        };

        this.minChoiceNb = function (nb, calculator) {
            if (arguments.length === 0) {
                return nbMin
            }
            this.on('update', checkMinMax);
            minSumCalculatorMin = arguments.length > 1 ? calculator : defaultCalculator;
            nbMin = nb;
        };

        // value is overloaded because value changing need to set choices again to be viewed
        this.value = function (values) {
            if (arguments.length === 0) {
                return sanitizeValue(this.raw().value());
            } else {
                this.raw().value(sanitizeValue(values));
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

        this.find = function (id, silent) {
            if (arguments.length < 2) {
                silent = false;
            }
            return this.sheet().get(this.realId() + repeaterIdSeparator + id, silent);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                 LreRepeater                *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreRepeater = function () {
        let entries = {};

        // protect repeater : overwrite repeater "text" will break it (unable to setData on it)
        this.text = function () {
            return this.raw().text();
        }

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

        const clickHandler = function (component) {
            const newValues = component.value();
            each(newValues, function (entryData, entryId) {
                let entry = component.find(entryId);
                if (!entries.hasOwnProperty(entryId)) {
                    if (!entry.data('initiated')) {
                        entry.data('initiated', true);
                        entry.data('saved', false);
                        entry.data('children', component.sheet().knownChildren(entry));
                        // Save the data beforce potential changes in init event
                        const valueSave = deepClone(entryData);
                        component.trigger('init', entry, entryId, entryData);
                        component.trigger('initedit', entry, entryId, entryData);
                        applyValuesToEntry(component, entryId, valueSave);
                    }
                } else if (entry.hasClass('editing')
                    && (!entry.hasData('saved') || entry.data('saved'))) {
                    entry.data('saved', false);
                    entry.data('children', component.sheet().knownChildren(entry));
                    // Refresh all raw component of each entry children
                    entry.knownChildren().forEach(function (realId) {
                        const child = entry.sheet().get(realId, true);
                        if (child && child.exists()) {
                            child.refreshRaw();
                        }
                    });
                    component.trigger('edit', entry, entryId, entryData);
                    component.trigger('initedit', entry, entryId, entryData);
                }
            });
        };

        const saveValues = function (component, value) {
            if (arguments.length === 1) {
                value = component.value();
            }
            entries = deepClone(value);
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
                        const results = component.trigger('entrychange', cmp, entryId, newValues[entryId], entryData);
                        overloadObject(newData, results);
                        somethingHasChanged = true;
                    }
                    // Refresh all raw component of each entry children
                    cmp.knownChildren().forEach(function (realId) {
                        const child = cmp.sheet().get(realId);
                        if (child && child.exists()) {
                            child.refreshRaw();
                        }
                    });
                    if (cmp.hasData('saved') && !cmp.data('saved')) {
                        cmp.data('saved', true);
                        let results = component.trigger('save', cmp, entryId, newValues[entryId], entryData);
                        overloadObject(newData, results);
                    }
                    if (!cmp.hasClass('lre_initread') || !deepEqual(newValues, entryData)) {
                        results = component.trigger('initread', cmp, entryId, newValues[entryId], entryData);
                        overloadObject(newData, results);
                        cmp.addClass('lre_initread');
                    }
                    applyValuesToEntry(component, entryId, newData);
                    if (cmp.hasData('children')) {
                        const oldChildren = cmp.data('children');
                        if (typeof oldChildren !== 'array') {
                            oldChildren = [];
                        }
                        const addedChildren = component.sheet().knownChildren(cmp);
                        each(oldChildren, function (realId) {
                            if (!addedChildren.includes(realId)) {
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
                    let results = component.trigger('save', cmp, entryId, entryData, {});
                    overloadObject(newData, results);
                    results = component.trigger('initread', cmp, entryId, entryData, {});
                    overloadObject(newData, results);
                    const resultNew = component.trigger('new', cmp, entryId, entryData, {});
                    overloadObject(newData, resultNew);
                    applyValuesToEntry(component, entryId, newData);
                    somethingHasChanged = true;
                }
            });
            if (somethingHasChanged) {
                component.trigger('dataChange', component);
            }
            saveValues(component);
        };

        this.readOnly = function (readOnly) {
            if (arguments.length === 0 || readOnly) {
                this.addClass('no-add').addClass('no-edit');
            } else {
                this.removeClass('no-add').removeClass('no-edit');
            }
        }

        this.find = function (id, silent) {
            if (arguments.length < 2) {
                silent = false;
            }
            // Apply new repeater values if pending, in order to have up to date entries
            this.sheet().sendPendingDataFor(this.realId());
            return this.sheet().get(this.realId() + repeaterIdSeparator + id, silent);
        };

        this.initiate = function () {
            lreLog('Initiate Repeater ' + this.realId());
            this.on('eventhandleradded', runInitReadEvent.bind(this));
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

        const runInitReadEvent = function (cmp, event, subComponent, callback) {
            if (event === 'initread') {
                const val = this.value();
                for (entryId in val) {
                    const entry = this.find(entryId);
                    if (!entry.hasClass('editing')) {
                        callback.call(this, this, this.find(entryId), entryId, val[entryId]);
                    }
                }
            }
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

        this.setSorter = function (cmp, column) {
            if (typeof cmp === "string") {
              cmp = this.sheet().get(cmp);
            }
            cmp.addClass("clickable");
            cmp.on("click", function (cmp) {
              const order = (cmp.data("order") || "desc") === "desc" ? "asc" : "desc";
              cmp.data("order", order, true);
              let inf = -1, sup = 1;
              if (order === "desc") {
                inf = 1;
                sup = -1;
              }
              const vals = this.value();
              const keys = Object.keys(vals);
              if (keys.length === 0) {
                return;
              }
              const getVal = (function (key) {
                if (vals[key] && vals[key].hasOwnProperty(column)) {
                  return vals[key][column];
                } else {
                  const col = this.find(key + '.' + column, true);
                  if (col && col.id() && col.exists()) {
                    return col.value();
                  }
                }
                return '';
              }).bind(this);
              let sorter = function (key1, key2) {
                let val1 = getVal(key1);
                let val2 = getVal(key2);

                return val1 < val2 ? inf : (val1 > val2 ? sup : 0);
              };
              const newVals = {};
              keys.sort(sorter).forEach(function (k) {
                newVals[k] = vals[k];
              });
              this.value(newVals);
            }.bind(this))
          };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreToggling               *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreToggling = function (_args) {
        const VALUE_DATA_ID = 'togglingValue';
        const cmp = _args[0];
        let currentTogglingValue = null;
        let togglingValues = [];
        let togglingData = {};
        let cmpResfreshRaw = cmp.refreshRaw.bind(cmp);
        let cmpValue = cmp.value.bind(cmp);
        let saveTogglingData;
        let handleClick;

        const manageAddedRemoved = function (oldData, newData, prop, addCB, delCB) {
            const oldArray = oldData.hasOwnProperty(prop) ? oldData[prop] : [];
            const newArray = newData.hasOwnProperty(prop) ? newData[prop] : [];
            arrayDiff(oldArray, newArray).forEach(delCB);
            arrayDiff(newArray, oldArray).forEach(addCB);
        };

        const changeTogglingData = function (oldData, newData) {
            wait(0, function () {
                const sheet = this.sheet();
                const showflex = function (id) {
                    sheet.get(id).addClass('d-flex').removeClass('d-none');
                };
                const hideflex = function (id) {
                    sheet.get(id).addClass('d-none').removeClass('d-flex');
                }
                const show = function (id) {
                    sheet.get(id).removeClass('d-none');
                };
                const hide = function (id) {
                    sheet.get(id).addClass('d-none');
                }
                manageAddedRemoved(oldData, newData, 'classes', this.addClass, this.removeClass);
                manageAddedRemoved(oldData, newData, 'showflex', showflex, hideflex);
                manageAddedRemoved(oldData, newData, 'hideflex', hideflex, showflex);
                manageAddedRemoved(oldData, newData, 'show', show, hide);
                manageAddedRemoved(oldData, newData, 'hide', hide, show);
            }.bind(this));
        };

        const setTogglingValue = function (val, force) {
            if (!val || !togglingData[val]) {
                return;
            }
            force = arguments.length >= 2 ? force : false;
            const oldData = {
                classes: [], show: [], hide: [], showflex: [], hideflex: [],
            };
            if (!force) {
                togglingValues.filter(function (v) {
                    return ((currentTogglingValue === null && v !== val) || v === currentTogglingValue);
                }).forEach((function (v) {
                    for (k in oldData) {
                        oldData[k] = arrayMergeUnique(oldData[k], togglingData[v][k]);
                    }
                }).bind(this));
            }

            changeTogglingData.call(this, oldData, togglingData[val]);
            currentTogglingValue = val;
            saveTogglingData && this.data(VALUE_DATA_ID, val, true);
            if (togglingData[val].hasOwnProperty('icon')) {
                cmpValue(togglingData[val].icon);
            } else if (typeof togglingData[val] === 'string') {
                cmpValue(togglingData[val]);
            } else {
                // update event is triggered by changing icon value, but is not triggered if only style change, etc.
                // So we trigger update event manually if icon value is not changed but the toggle value changed
                this.trigger('update', this);
            }
        };

        const iconValue = function () {
            if (!togglingValues || togglingValues.length === 0) {
                if (arguments.length === 0 && this.hasData(VALUE_DATA_ID)) {
                    // for getting the togglingValue before the component toggling initialization
                    return this.data(VALUE_DATA_ID);
                }
                return cmpValue.apply(this, arguments);
            }
            if (arguments.length === 0) {
                return currentTogglingValue;
            } else {
                setTogglingValue.call(this, arguments[0]);
            }
        };

        const handleToggleClick = function () {
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

        this.toggling = function (data, defaultValue, save) {
            togglingData = data;
            if (togglingValues.length === 0) {
                // Add click handler only if component is not yet toggling
                handleClick = handleToggleClick.bind(this);
                this.on('click', handleClick);
            }
            togglingValues = Object.keys(data);
            if (togglingValues.length === 0) {
                return;
            }
            if (arguments.length < 3) {
                save = true;
            }
            if (arguments.length < 2) {
                defaultValue = togglingValues[0];
            }
            saveTogglingData = save;
            const savedValue = saveTogglingData ? this.data(VALUE_DATA_ID) : null;
            if (savedValue && togglingValues.includes(savedValue)) {
                setTogglingValue.call(this, savedValue);
            } else if (togglingValues.includes(defaultValue)) {
                setTogglingValue.call(this, defaultValue);
            } else {
                const rawValue = this.raw().value();
                const newVal = togglingValues.find(function (k) {
                    return k === rawValue;
                });
                if (typeof newVal !== 'undefined') {
                    setTogglingValue.call(this, defaultValue);
                }
            }
        };

        this.untoggling = function () {
            if (togglingValues.length > 0) {
                this.value = cmpValue.bind(this);
                this.refreshRaw = cmpResfreshRaw.bind(this);
            }
            togglingData = {};
            togglingValues = [];
            this.off('click', handleClick);
            this.deleteData(VALUE_DATA_ID, true);
        };

        const refreshRaw = function () {
            cmpResfreshRaw();
            if (togglingValues) {
                setTogglingValue.call(this, currentTogglingValue, true);
            }
            return this;
        };

        this.value = iconValue.bind(cmp);
        this.refreshRaw = refreshRaw.bind(cmp);
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreIcon                   *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreIcon = function () {
        this.initiate = function () {
            this.lreType('icon');
            Object.assign(this, new lreToggling(this));
            this.setInitiated(true);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreLabel                  *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreLabel = function () {
        this.initiate = function () {
            this.lreType('label');
            Object.assign(this, new lreToggling(this));
            this.setInitiated(true);
        };
    };

    /** * * * * * * * * * * * * * * * * * * * * * *
     *                  LreCheckbox               *
     ** * * * * * * * * * * * * * * * * * * * * * */
    const lreCheckbox = function () {
        let valueWhenDisabled = null;
        let disabled = false;
        this.initiate = function () {
            this.lreType('checkbox');
            this.setInitiated(true);
        };

        const disableMethod = function (cmp) {
            cmp.value(valueWhenDisabled);
        }

        this.disable = function () {
            this.addClass("opacity-25");
            disabled = true;
            valueWhenDisabled = this.value();
            this.on("click", disableMethod);
            this.disableEvent('update');
        };

        this.enable = function () {
            this.removeClass("opacity-25");
            disabled = false;
            valueWhenDisabled = null;
            this.off("click", disableMethod);
            this.enableEvent('update');
        }

        this.isDisabled = function () {
            return disabled;
        }

        this.isEnabled = function () {
            return !disabled;
        }
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
            if (arguments.length < 3) {
                dependencies = [];
            }
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
        STOP_RESULT: {},  // as of it is impossible to initialize with { [STOP]: true }, this object will be initialized just after
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
                let aVal, bVal;
                if (a && isObject(a.data) && b && isObject(b.data)) {
                    aVal = a.data[column];
                    bVal = b.data[column];
                } else if (a && isObject(a.val) && b && isObject(b.val)) {
                    aVal = a.val[column];
                    bVal = b.val[column];
                }
                return aVal < bVal ? -1 : (aVal > bVal ? 1 : 0);
            }
        };

        const getSortedDataMapper = function (sorter) {
            if (arguments.length === 0 || typeof sorter === 'undefined' || !sorter) {
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
        const silentFind = sheet.get(sheet.id()).find;
        const toRemember = [];
        const toDelete = [];
        const components = new ComponentContainer(this);
        const sheetAlphaId = intToAlpha(sheet.getSheetId());

        Object.assign(this, new DataHolder(this, sheet.id()))
        Object.assign(this, new EventOwner);

        this.getVariable = sheet.getVariable;

        let isDataSetPending = false;
        let pendingDataToSet = [];
        let pendingDataToSetIndex = {};
        let pendingDataProcessed;


        const groupedDataSet = function (dataToSend) {
            if (arguments.length === 0) {
                dataToSend = {};
            }
            let added = Object.keys(dataToSend).length;
            let analysed = 0;
            while (added < maxDataSet && pendingDataToSet.length > 0) {
                let data = pendingDataToSet.shift();
                delete pendingDataToSetIndex[data.k];
                if (typeof data.v !== 'undefined' && !Number.isNaN(data.v)) {
                    const ids = data.k.split(repeaterIdSeparator);
                    if (ids.length === 1) {
                        dataToSend[ids[0]] = data.v;
                        added++;
                    } else {
                        const currentData = sheet.getData()[ids[0]] || {};
                        const newData = dataToSend[ids[0]] || deepClone(currentData);
                        if (!newData.hasOwnProperty(ids[1])) {
                            newData[ids[1]] = {};
                        }
                        if (ids.length === 3) {
                            newData[ids[1]][ids[2]] = data.v;
                        } else {
                            newData[ids[1]] = data.v
                        }
                        if (!deepEqual(newData, currentData)) {
                            added++;
                            dataToSend[ids[0]] = newData;
                        }
                    }
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
                if (arguments.length === 0) {
                    wait(asyncDataSetAgainDelay, groupedDataSet);
                }
            }
            sheet.setData(dataToSend);
            if (!isDataSetPending && pendingDataProcessed) {
                try {
                    pendingDataProcessed();
                } catch (e) {
                    lreLog('Error occurred in pendingDataProcessed : ' + e.toString())
                }
            }
        };

        this.setData = function (data) {
            if (LRE_GROUPED_VALUE_CHANGE) {
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
            } else {
                sheet.setData(data);
            }
        };

        this.getPendingData = function (id) {
            if (pendingDataToSetIndex.hasOwnProperty(id)) {
                return pendingDataToSet[pendingDataToSetIndex[id]].v;
            }
            return;
        };

        const removePendingData = function (id) {
            if (pendingDataToSetIndex.hasOwnProperty(id)) {
                const pos = pendingDataToSetIndex[id];
                delete pendingDataToSetIndex[id];
                pendingDataToSet.splice(pos, 1);
                for (k in pendingDataToSetIndex) {
                    if (pendingDataToSetIndex[k] >= pos) {
                        pendingDataToSetIndex[k]--;
                    }
                }
            }
            return;
        };

        this.sendPendingDataFor = function (id) {
            if (pendingDataToSetIndex.hasOwnProperty(id)) {
                const val = pendingDataToSet[pendingDataToSetIndex[id]].v;
                removePendingData(id);
                const data = {};
                data[id] = val;
                groupedDataSet(data);
            }
        }

        this.onPendingDataProcessed = function (cb) {
            pendingDataProcessed = cb;
        };

        this.getData = sheet.getData;
        this.prompt = sheet.prompt;
        this.id = sheet.id;
        this.realId = sheet.id;
        this.properName = sheet.properName;
        this.getSheetId = sheet.getSheetId;
        this.getSheetAlphaId = function () {
            return sheetAlphaId;
        };
        this.getSheetType = sheet.getSheetType
        this.name = sheet.name;

        const initComponent = function (rawComponent, lreContainer) {
            let realId = '';
            if (lreContainer.lreType() === 'entry' || lreContainer.lreType() === 'repeater') {
                realId = lreContainer.realId() + repeaterIdSeparator;
            }
            realId += rawComponent.id();
            let classes = [];

            try {
                classes = rawComponent.getClasses();
            } catch (e) { }

            let cmp = new lreComponent(lreContainer.sheet(), rawComponent, realId);
            if (classes.includes('repeater')) {
                Object.assign(cmp, new lreRepeater());
            } else if (classes.includes('choice')) {
                if (classes.includes('multiple')) {
                    Object.assign(cmp, new lreMultiChoice);
                } else {
                    Object.assign(cmp, new lreChoice);
                }
            } else if (classes.includes('icon')) {
                Object.assign(cmp, new lreIcon);
            } else if (classes.includes('label')) {
                Object.assign(cmp, new lreLabel);
            } else if (classes.includes('checkbox')) {
                Object.assign(cmp, new lreCheckbox);
            }
            cmp.parent(lreContainer);
            if (lreContainer.lreType() === 'entry') {
                cmp.entry(lreContainer);
                cmp.repeater(lreContainer.repeater());
            }
            if (lreContainer.lreType() === 'repeater') {
                cmp = Object.assign(cmp, new lreRepeaterEntry());
                cmp.repeater(lreContainer);
            }
            cmp.initiate();
            return cmp;
        };

        this.get = function (id, silent) {
            if (arguments.length < 2) {
                silent = false;
            }
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
                    if (!rawCmp) {
                        !silent && lreLog('Sheet.get returns null object for ' + strId);
                    } else if (!rawCmp.id()) {
                        !silent && lreLog('Unable to find ' + strId);
                        return rawCmp;
                    }
                } else {
                    let finalId = tabId.pop();
                    let containerId = tabId.join(repeaterIdSeparator);
                    container = this.get(containerId);
                    if (!container) {
                        !silent && lreLog('Sheet.get returns null container for ' + containerId);
                        return null;
                    }
                    rawCmp = container.raw().find(finalId);
                    if (!rawCmp) {
                        !silent && lreLog('Sheet.get returns null object for ' + strId);
                        return null;
                    } else if (!rawCmp.id()) {
                        !silent && lreLog('Unable to find ' + strId);
                        return rawCmp;
                    }
                }
                cmp = initComponent(rawCmp, container);
                components.set(cmp.realId(), cmp);
            } else {
                cmp = components.get(strId);
            }
            return cmp;
        };
        this.initRepeater = this.get;
        this.initChoice = this.get;
        this.initMultiChoice = this.get;
        this.initIcon = this.get;

        this.componentExists = function (realId) {
            const parts = realId.split(repeaterIdSeparator);
            const cmp = silentFind(parts[0])
            if (!cmp || !cmp.id()) {
                return false;
            }
            if (parts.length > 1) {
                const val = sheet.getData()[parts[0]];
                if (!val || !val.hasOwnProperty(parts[1])) {
                    return false;
                }
                if (parts.length > 2) {
                    let tmp = silentFind(realId);
                    if (!tmp || !tmp.id()) {
                        return false;
                    }
                    tmp = sheet.get(realId);
                    let result = true;
                    try {
                        tmp.addClass('__lre_dummy')
                        tmp.removeClass('__lre_dummy')
                    } catch (e) {
                        result = false
                    }
                    if (!result) {
                        return false;
                    }
                }
            }
            return true;
        };

        this.find = this.get;

        this.raw = function () {
            return sheet;
        };

        this.refreshRaw = function () {
            const newRaw = sheet.raw().get(realId);
            this.transferEvents(newRaw)
            component = newRaw;

            return this;
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
                cmpClasses: {},
            };
            if (data.hasOwnProperty(rawSheet.id())) {
                Object.assign(result, data[rawSheet.id()]);
            }
            return result;
        };
        let persistingData = loadPersistingData(sheet);

        const cleanCmpData = function () {
            const realIdToChecked = [].concat(Object.keys(persistingData.cmpData), Object.keys(persistingData.cmpClasses));
            const realIdToForget = [];
            const analyzeRealId = (function () {
                const checking = realIdToChecked.splice(0, 20);
                checking.forEach((function (realId) {
                    const parts = realId.split(repeaterIdSeparator);
                    const length = parts.length;
                    const base = parts.pop();
                    if (length === 1 && !this.componentExists(base)) {
                        // forget data for non-existing components
                        realIdToForget.push(realId);
                    } else if (length === 3 && !this.componentExists(parts.join(repeaterIdSeparator))) {
                        // forget data for components in non-existing repeater entries
                        realIdToForget.push(realId);
                    }
                }).bind(this));
                if (realIdToChecked.length > 0) {
                    wait(200, analyzeRealId);
                } else {
                    realIdToForget.forEach(function (realId) {
                        delete persistingData.cmpData[realId];
                        delete persistingData.cmpClasses[realId];
                    });
                    savePersistingData();
                }
            }).bind(this);
            wait(200, analyzeRealId);
        };
        cleanCmpData.call(this);

        const savePersistingData = (function () {
            const newData = {};
            newData[this.id()] = persistingData;
            this.setData(newData);
        }).bind(this);

        this.persistingData = function () {
            const dataName = arguments[0];
            if (arguments.length > 1) {
                persistingData[dataName] = arguments[1];
                savePersistingData();
            }
            if (!persistingData.hasOwnProperty(dataName)) {
                return null;
            }
            return persistingData[dataName];
        }

        this.deletePersistingData = function (dataName) {
            if (persistingData.hasOwnProperty(dataName)) {
                delete persistingData[dataName];
                savePersistingData();
            }
        };

        this.persistingCmpData = function () {
            const componentId = arguments[0];
            if (arguments.length > 1) {
                persistingData.cmpData[componentId] = arguments[1];
                const newData = {};
                newData[this.id()] = persistingData;
                this.setData(newData);
            } else if (!persistingData.cmpData.hasOwnProperty(componentId)) {
                return {};
            }
            return persistingData.cmpData[componentId];
        }

        this.persistingCmpClasses = function () {
            const componentId = arguments[0];
            if (arguments.length > 1) {
                persistingData.cmpClasses[componentId] = arguments[1];
                const newData = {};
                newData[this.id()] = persistingData;
                this.setData(newData);
            } else if (!persistingData.cmpClasses.hasOwnProperty(componentId)) {
                return {};
            }
            return persistingData.cmpClasses[componentId];
        };
    };

    if (!lreInitiated) {
        initLre();
        lreInitiated = true;
    }

    try { let a = null; a() } catch (e) { errExclLastLine = e.trace[0].loc.start.line };
    if (typeof _arg === 'function') {
        return function (_sheet) {
            const id = _sheet.id();
            const sheetId = _sheet.getSheetId();
            lreLog('INIT on ' + id + '(' + _sheet.name() + (sheetId ? ' #' + sheetId : '') + ')');
            // The wait may allow a faster display
            wait(0, function () {
                let data = _sheet.getData();
                let sheet = getLreSheet(_sheet, true);
                if (!sheet.persistingData('initialized') && typeof firstInit !== 'undefined') {
                    sheet.persistingData('initialized', firstInit(sheet));
                }
                try {
                    _arg.call(this, sheet);
                } catch (e) {
                    handleError(e);
                }
            })
        }
    }
}
// LRE
//endregion
