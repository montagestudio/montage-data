var Montage = require("montage").Montage,
    PropertyDescriptor = require("logic/model/property-descriptor").PropertyDescriptor;

/**
 * Describes a type of object.
 *
 * @class
 * @extends external:Montage
 */
exports.ObjectDescriptor = Montage.specialize(/** @lends ObjectDescriptor.prototype */ {

    /**
     * The name of the type of object described by this descriptor.
     *
     * @type {string}
     */
    name: {
        value: undefined
    },

    /**
     * The prototype of objects of this type.
     *
     * @type {function}
     */
    prototype: {
        value: Montage.prototype
    },

    /**
     * Descriptors of the properties of objects of this type, by property name.
     *
     * The returned object should not be modified and
     * [setProperty()]{@link ObjectDescriptor#setProperty} or
     * [deleteProperty()]{@link ObjectDescriptor#deleteProperty} should be used
     * instead to modify the properties.
     *
     * @type {Object.<string, PropertyDescriptor>}
     */
    properties: {
        get: function () {
            if (!this._properties) {
                this._properties = {};
            }
            return this._properties;
        }
    },

    /**
     * Add or replace a property descriptor.
     *
     * @method
     * @argument {string} name                   - The name of the property.
     * @argument {PropertyDescriptor} descriptor - Describes the property.
     */
    setProperty: {
        value: function (name, descriptor) {
            this.properties[name] = descriptor;
        }
    },

    /**
     * Remove a property descriptor.
     *
     * @method
     * @argument {string} name - The name of the property whose descriptor
     *                           should be removed.
     */
    deleteProperty: {
        value: function (name) {
            delete this.properties[name];
        }
    },

    _setPropertiesFromTypes: {
        value: function (types) {
            var i;
            for (i in types) {
                descriptor = this.makePropertyDescriptor();
                this.setProperty(i, descriptor);
            }
        }
    },

    _setPropertiesFromPrototype: {
        value: function (prototype) {
            var names, descriptor, i, n;
            for (; prototype !== Montage.prototype; prototype = Object.getPrototypeOf(prototype)) {
                names = Object.getOwnPropertyNames(prototype);
                for (i = 0, n = names.length; i < n; i += 1) {
                    if (!this.properties[names[i]]) {
                        descriptor = this.makePropertyDescriptor();
                        this.setProperty(names[i], descriptor);
                    }
                }
            }
        }
    },

    makePropertyDescriptor: {
        value: function () {
            return new PropertyDescriptor();
        }
    }

}, /** @lends ObjectDescriptor */ {

    /**
     * Convenience method to generate a getter function that will create and
     * cache an object descriptor.
     *
     * @memberof ObjectDescriptor
     * @method
     * @argument {Object} exports                - A Montage Require exports
     *                                             object defining the
     *                                             constructor for the described
     *                                             object. Usually this is
     *                                             `exports`.
     * @argument {string} name                   - The name with which the
     *                                             constructor can be looked up
     *                                             in the exports. This will
     *                                             also be used as the name of
     *                                             the type defined by this
     *                                             object descriptor.
     * @argument {?Object<string, string>} types - The types of each of the
     *                                             object's propertie. If
     *                                             omitted the property
     *                                             information will be derived
     *                                             from the properties of the
     *                                             construtor's prototype.
     */
    getterFor: {
        value: function (exports, name, types) {
            // Note: The returned getter function has to check
            // this.hasOwnProperty("_type"), not just this._type, because if
            // the class using the getter is a subclass of another class using
            // a similar getter this._type will return the value of the the
            // parent class type even in the child class' getter.
            var self = this;
            return function () {
                if (!this.hasOwnProperty("_type")) {
                    this._type = new self();
                    this._type.name = name;
                    this._type.prototype = exports[name].prototype;
                    if (types) {
                        this._type._setPropertiesFromTypes(types);
                    } else {
                        this._type._setPropertiesFromPrototype(this._type.prototype);
                    }
                }
                return this._type;
            }
        }
    }

});
