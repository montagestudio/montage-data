var Montage = require("montage").Montage,
    WeakMap = require("collections/weak-map");

/**
 * Intercepts property getters and setters to trigger appropriate Montage Data
 * actions.
 *
 * DataTriggers are simple JavaScript Objects subclasses rather than Montage
 * subclasses because triggers would not use the Montage functionality but need
 * to be a lightweight as possibly because a trigger will be created for each
 * property of each model class.
 *
 * @private
 * @class
 * @extends Object
 */
exports.DataTrigger = function () {};

exports.DataTrigger.prototype = Object.create({}, /** @lends DataTrigger.prototype */{

    /**
     * Defined in the DataTrigger prototype, not in DataTrigger instances.
     *
     * @type {Function}
     */
    constructor: {
        configurable: true,
        writable: true,
        value: exports.DataTrigger
    },

    /**
     * Defined in one DataTrigger instance per service (see
     * [_getTriggerPrototype()]{@link DataTrigger._getTriggerPrototype}),
     * not in each DataTrigger instance.
     *
     * @type {Service}
     */
    service: {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
    },

    /**
     * @type {Object}
     */
    prototype: {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
    },

    /**
     * @type {string}
     */
    name: {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
    },

    /**
     * @private
     * @type {string}
     */
    _prefixedName: {
        configurable: true,
        get: function () {
            if (!this.__prefixedName && this.name) {
                this.__prefixedName = "_" + this.name;
            }
            return this.__prefixedName;
        }
    },

    /**
     * @type {Object<string, external:Promise>}
     */
    _promises: {
        enumerable: true,
        configurable: true,
        get: function () {
            if (!this.__promises) {
                this.__promises = new WeakMap();
            }
            return this.__promises;
        }
    },

    /**
     * @method
     * @argument {Object} object
     */
    getPropertyValue: {
        configurable: true,
        writable: true,
        value: function (object) {
            var prototype, descriptor, getter;
            // Start an asynchronous fetch of the property's value if necessary.
            this.getPropertyData(object);
            // Search the prototype chain for a getter for this property,
            // starting just after the prototype that called this method.
            prototype = Object.getPrototypeOf(this.prototype);
            while (prototype) {
                descriptor = Object.getOwnPropertyDescriptor(prototype, this.name);
                getter = descriptor && descriptor.get;
                prototype = !getter && Object.getPrototypeOf(prototype);
            }
            // Return the property's current value.
            return getter ? getter.call(object) : object[this._prefixedName];
        }
     },

    /**
     * @method
     * @argument {Object} object
     * @argument {} value
     */
     setPropertyValue: {
        configurable: true,
        writable: true,
        value: function (object, value) {
            var prototype, descriptor, getter, setter, writable;
            // Mark this value as fetched.
            this._promises.set(object, this.service.nullPromise);
            // Search the prototype chain for a setter for this property,
            // starting just after the prototype that called this method.
            prototype = Object.getPrototypeOf(this.prototype);
            while (prototype) {
                descriptor = Object.getOwnPropertyDescriptor(prototype, this.name);
                getter = descriptor && descriptor.get;
                setter = getter && descriptor.set;
                writable = !descriptor || setter || descriptor.writable;
                prototype = writable && !setter && Object.getPrototypeOf(prototype);
            }
            // Set the property's value if it is writable.
            if (setter) {
                setter.call(object, value);
            } else if (writable) {
                object[this._prefixedName] = value;
            }
        }
     },

    getPropertyData: {
        value: function (object) {
            return this._promises.get(object) || this.updatePropertyData(object);
        }
    },

    updatePropertyData: {
        // To ensure getPropertyData() is re-entrant this method creates and
        // records a placeholder promise locally before doing anything else.
        // Then if the service.getPropertyData() external call made in this
        // method causes getPropertyData() to be called again that method will
        // immediately find the previously created placeholder promise are
        // return it without calling this method, avoiding any risk of an
        // infinite call loop.
        value: function (object) {
            var self = this,
                placeholder = {};
            placeholder.promise = new Promise(function (resolve) {
                placeholder.resolve = resolve;
            });
            this._promises.set(object, placeholder.promise);
            return this.service.getPropertyData(object, this.name).then(function () {
                self._promises.set(object, self.service.nullPromise);
                placeholder.resolve(null);
                return null;
            });
        }
    }

});

Object.defineProperties(exports.DataTrigger, /** @lends DataTrigger */{

    /**
     * @method
     * @argument {DataService} service
     * @argument {Object} prototype
     * @returns {Object.<string, DataTrigger>}
     */
    addTriggers: {
        value: function (service, prototype) {
            var triggers, trigger, name;
            triggers = {};
            for (name in service.type.properties) {
                trigger = this.addTrigger(service, prototype, name);
                if (trigger) {
                    triggers[name] = trigger;
                }
            }
            return triggers;
        }
     },

    /**
     * @method
     * @argument {DataService} service
     * @argument {Object} prototype
     * @argument {string} name
     * @returns {?DataTrigger}
     */
    addTrigger: {
        value: function (service, prototype, name) {
            var trigger;
            if (service.type.properties[name] && service.type.properties[name].isRelationship) {
                trigger = Object.create(this._getTriggerPrototype(service, prototype));
                trigger.name = name;
                Montage.defineProperty(prototype, name, {
                    get: function () {
                        return trigger.getPropertyValue(this);
                    },
                    set: function (value) {
                        trigger.setPropertyValue(this, value);
                    }
                });
            }
            return trigger;
        }
    },

    /**
     * To avoid having each trigger contain a reference to the service and
     * prototype it's working for, we make all triggers of a service share a
     * prototype that contains those references.
     *
     * @private
     * @method
     * @argument {DataService} service
     */
    _getTriggerPrototype: {
        value: function (service, prototype) {
            var trigger = this._triggerPrototypes && this._triggerPrototypes.get(service);
            if (!trigger) {
                trigger = new this();
                trigger.service = service;
                trigger.prototype = prototype;
                this._triggerPrototypes = this._triggerPrototypes || new WeakMap();
                this._triggerPrototypes.set(service, trigger);
            }
            return trigger;
        }
    },

    /**
     * @method
     * @argument {Object.<string, DataTrigger>} triggers
     * @argument {Object} prototype
     */
    removeTriggers: {
        value: function (triggers, prototype) {
            var name;
            for (name in triggers) {
                this.removeTrigger(triggers[name], prototype, name);
            }
        }
    },

    /**
     * @method
     * @argument {DataTrigger} trigger
     * @argument {Object} prototype
     */
    removeTrigger: {
        value: function (trigger, prototype) {
            if (trigger) {
                delete prototype[trigger.name];
            }
        }
    }

});
