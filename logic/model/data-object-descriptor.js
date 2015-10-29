var ObjectDescriptor = require("logic/model/object-descriptor").ObjectDescriptor,
    PropertyDescriptor = require("logic/model/property-descriptor").PropertyDescriptor;

/**
 * Extends an object descriptor with the additional information needed by
 * Montage Data.
 *
 * @class
 * @extends ObjectDescriptor
 */
exports.DataObjectDescriptor = ObjectDescriptor.specialize(/** @lends DataObjectDescriptor.prototype */ {

    /**
     * @type {Array.<string>}
     */
    identifiers: {
        value: []
    },

    /**
     * @type {Object.<string, DataPropertyDescriptor>}
     */
    properties: {
        get: function () {
            return Object.getOwnPropertyDescriptor(ObjectDescriptor.prototype, "properties").get.call(this);
        }
    },

    /**
     * @method
     * @argument {string} name
     * @argument {DataPropertyDescriptor} descriptor
     */
    setProperty: {
        value: function (name, descriptor) {
            ObjectDescriptor.prototype.setProperty.call(this, name, descriptor);
        }
    },

    _addRelations: {
        value: function (relations) {
            var names, i, n;
            names = Object.keys(relations);
            for (i = 0, n = names.length; i < n; i += 1) {
                this._addRelationship(names[i], relations[names[i]]);
            }
        }
    },

    _addRelationship: {
        value: function (name, relation) {
            // TODO: Add derived properties, relationship criteria,
            // relationship targets, and shared fetch information.
            if (this.properties[name]) {
                this.properties[name].isRelationship = true;
            } else {
                this.setProperty(name, this.makePropertyDescriptor(true));
            }
        }
    },

    makePropertyDescriptor: {
        value: function (isRelationship) {
            var descriptor = new PropertyDescriptor();
            if (isRelationship) {
                descriptor.isRelationship = true;
            }
            return descriptor;
        }
    }

}, /** @lends DataObjectDescriptor */ {

    getterFor: {
        value: function (exports, name, types, identifiers, relations) {
            // Note: The returned getter function has to check
            // this.hasOwnProperty("_type"), not just this._type, because if
            // the class using the getter is a subclass of another class using
            // a similar getter this._type will return the value of the the
            // parent class type even in the child class' getter.
            var self = this,
                parsed = self._parseGetterForArguments(arguments),
                getter = ObjectDescriptor.getterFor.call(self, parsed.exports, parsed.name, parsed.types);
            return function () {
                if (!this.hasOwnProperty("_type")) {
                    this._type = getter.call(this);
                    this._type.identifiers = parsed.identifiers;
                    this._type._addRelations(parsed.relations);
                }
                return this._type;
            }
        }
    },

    _parseGetterForArguments: {
        value: function (arguments) {
            var types, identifiers, offset, i, n;
            // The type object is the third argument if it's a non-array
            // non-string object and if it's not the last argument.
            types = arguments.length > 3 && this._isObject(arguments[2]) && arguments[2];
            offset = types ? 0 : -1;
            // The identifiers array is the fourth argument if that's an array,
            // or an array containing the fourth argument and all following ones
            // that are strings if there are any, or an empty array.
            identifiers = Array.isArray(arguments[3 + offset]) && arguments[3 + offset];
            for (i = 3 + offset, n = arguments.length; !identifiers; i += 1) {
                if (i === n || typeof arguments[i] !== "string") {
                    identifiers = Array.prototype.slice.call(arguments, 3 + offset, i);
                    offset = i - 4;
                }
            }
            // The remaining argument values come from the remaining arguments.
            return {
                exports: arguments[0],
                name: arguments[1],
                types: types || undefined,
                identifiers: identifiers,
                relations: arguments[4 + offset] || {}
            };
        }
    },

    _isObject: {
        value: function (value) {
            return value &&
                   typeof value === "object" &&
                   !Array.isArray(value) &&
                   !(value instanceof String) &&
                   !(value instanceof Number) &&
                   !(value instanceof Boolean);
        }
    }

});
