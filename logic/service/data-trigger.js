var Montage = require("montage").Montage,
    WeakMap = require("collections/weak-map");

/**
 * Intercepts property getter and setter calls to trigger appropriate Montage
 * Data actions.
 *
 * DataTriggers are simple JavaScript Objects subclasses rather than Montage
 * subclasses to be as lightweight as possible: It's useful for them to be
 * lightweight because one trigger will be created for each property of each
 * model class, and on the other hand it's no loss for them to not be Montage
 * subclasses because they would not use any of the Montage class functionality.
 *
 * @private
 * @class
 * @extends Object
 */
exports.DataTrigger = function () {};

exports.DataTrigger.prototype = Object.create({}, /** @lends DataTrigger.prototype */{

    /**
     * The constructor function for all trigger instances.
     *
     * @type {Function}
     */
    constructor: {
        configurable: true,
        writable: true,
        value: exports.DataTrigger
    },

    /**
     * The service whose actions will be triggerred by this trigger.
     *
     * Typically a number of triggers share the same service, so to save memory
     * this property is defined in a single DataTrigger instance for each
     * service and all triggers that share that service then share that instance
     * as their prototype. This avoids the need for each of those triggers to
     * define this property themselves.
     *
     * See [_getTriggerPrototype()]{@link DataTrigger._getTriggerPrototype} for
     * the implementation of this behavior.
     *
     * @private
     * @type {Service}
     */
    _service: {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined
    },

    /**
     * The prototype of the objects whose property is managed by this trigger.
     *
     * Like [_service]{@link DataTrigger._service}, to save memory this property
     * is shared by all triggers that share the same service. All triggers
     * that share the same service must therefore also share the same object
     * prototype.
     *
     * @private
     * @type {Object}
     */
    _objectPrototype: {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined
    },

    /**
     * The name of the property managed by this trigger.
     *
     * @private
     * @type {string}
     */
    _propertyName: {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined
    },

    /**
     * The name of the private property corresponding to the public property
     * managed by this trigger.
     *
     * The private property name is the
     * [public property name]{@link DataTrigger#_propertyName} prefixed with an
     * underscore. It is generated lazilly the first time it is needed and then
     * cached to minimize the time and memory allocations involved in the
     * intercepts of property getter and setter calls.
     *
     * @private
     * @type {string}
     */
    _privatePropertyName: {
        configurable: true,
        get: function () {
            if (!this.__privatePropertyName && this._propertyName) {
                this.__privatePropertyName = "_" + this._propertyName;
            }
            return this.__privatePropertyName;
        }
    },

    /**
     * For each object whose property is managed by this trigger, this map holds
     * a promise that will be resolved when the property's value is obtained (if
     * the value is currently being obtained), or a resolved promise (if the
     * property's value was previously obtained or set), or nothing (if the
     * property's value hasn't been requested or set yet).
     *
     * This allows this trigger's getter call intercepts to return immmediately
     * when an object's managed property value is already known or is in the
     * process of being obtained. It also allows those intercepts to return a
     * single promise for multiple requests for the same value.
     *
     * @type {Object<string, external:Promise>}
     */
    _dataPromises: {
        configurable: true,
        enumerable: true,
        get: function () {
            if (!this.__dataPromises) {
                this.__dataPromises = new WeakMap();
            }
            return this.__dataPromises;
        }
    },

    /**
     * For each object whose property is managed by this trigger and for which
     * the value of that property is currently being obtained, this map holds
     * a resolution function that will resolve the corresponding promise in the
     * [data promises map]{@link DataTrigger#_dataPromises}.
     *
     * This allows this trigger to know when the property it manages is being
     * obtained, and if necessary to mark that value as already obtained.
     *
     * @type {Object<string, function>}
     */
    _dataResolves: {
        configurable: true,
        enumerable: true,
        get: function () {
            if (!this.__dataResolves) {
                this.__dataResolves = new WeakMap();
            }
            return this.__dataResolves;
        }
    },

    /**
     * @method
     * @argument {Object} object
     * @returns {Object}
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
            prototype = Object.getPrototypeOf(this._objectPrototype);
            while (prototype) {
                descriptor = Object.getOwnPropertyDescriptor(prototype, this._propertyName);
                getter = descriptor && descriptor.get;
                prototype = !getter && Object.getPrototypeOf(prototype);
            }
            // Return the property's current value.
            return getter ? getter.call(object) : object[this._privatePropertyName];
        }
     },

    /**
     * Note that if a trigger's property value is set after that values is
     * requested but before it is obtained from the trigger's service the
     * property's value will only temporarily be set to the specified value:
     * When the service finishes obtaining the value for the property the
     * property's value will be reset to that obtained value.
     *
     * @method
     * @argument {Object} object
     * @argument {} value
     */
     setPropertyValue: {
        configurable: true,
        writable: true,
        value: function (object, value) {
            var resolve, prototype, descriptor, getter, setter, writable;
            // Mark this trigger's property value as fetched. This way if the
            // setter called below requests that value it will get the value the
            // property had before it was set, and it will get it immediately.
            resolve = this._setPropertyDataResolved(object);
            // Search the prototype chain for a setter for this trigger's
            // property, starting just after the trigger prototype that caused
            // this method to be called.
            prototype = Object.getPrototypeOf(this._objectPrototype);
            while (prototype) {
                descriptor = Object.getOwnPropertyDescriptor(prototype, this._propertyName);
                getter = descriptor && descriptor.get;
                setter = getter && descriptor.set;
                writable = !descriptor || setter || descriptor.writable;
                prototype = writable && !setter && Object.getPrototypeOf(prototype);
            }
            // Set this trigger's property to the desired value, but only if
            // that property is writable.
            if (setter) {
                setter.call(object, value);
            } else if (writable) {
                object[this._privatePropertyName] = value;
            }
            // Resolve any pending promise for this trigger's property value.
            if (resolve) {
                resolve(null);
            }
        }
     },

    /**
     * @method
     * @argument {Object} object
     * @returns {external:Promise}
     */
    getPropertyData: {
        value: function (object) {
            // Request a fetch of this trigger's property data, but only if
            // necessary: Only if that data isn't already in the process of
            // being obtained and if it wasn't previously obtained or set. To
            // unconditionally request a fetch of this property data, use
            // [updatePropertyData()]{@link DataTrigger#updatePropertyData}.
            return this._dataPromises.get(object) || this.updatePropertyData(object);
        }
    },

    /**
     * @method
     * @argument {Object} object
     * @returns {external:Promise}
     */
    updatePropertyData: {
        value: function (object) {
            var self = this;
            // If this trigger's property data isn't in the process of being
            // obtained, request the most up to date value of that data from
            // this trigger's service.
            if (!this._dataResolves.has(object)) {
                this._dataPromises.set(object, new Promise(function (resolve) {
                    self._dataResolves.set(object, resolve);
                    self._service.getPropertyData(object, self._propertyName).then(function () {
                        self._setPropertyDataResolved(object);
                        resolve(null);
                        return null;
                    });
                }));
            }
            // Return the existing or just created promise for this data.
            return this._dataPromises.get(object);
        }
    },

    /**
     * @private
     * @method
     * @argument {Object} object
     */
    _setPropertyDataResolved: {
        value: function (object) {
            var resolve = this._dataResolves.get(object);
            this._dataPromises.set(object, this._service.nullPromise);
            this._dataResolves.delete(object);
            return resolve;
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
                trigger._propertyName = name;
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
     * prototype it's working for, all triggers of a service share a prototype
     * that contains those references.
     *
     * @private
     * @method
     * @argument {DataService} service
     * @returns {DataTrigger}
     */
    _getTriggerPrototype: {
        value: function (service, prototype) {
            var trigger = this._triggerPrototypes && this._triggerPrototypes.get(service);
            if (!trigger) {
                trigger = new this();
                trigger._service = service;
                trigger._objectPrototype = prototype;
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
