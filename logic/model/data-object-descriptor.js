var ObjectDescriptor = require("logic/model/object-descriptor").ObjectDescriptor,
    DataPropertyDescriptor = require("logic/model/data-property-descriptor").DataPropertyDescriptor;

/**
 * Extends an object descriptor with the additional object information needed by
 * Montage Data.
 *
 * @class
 * @extends ObjectDescriptor
 */
exports.DataObjectDescriptor = ObjectDescriptor.specialize(/** @lends DataObjectDescriptor.prototype */ {

    /**
     * The names of the properties containing the identifier for this type of
     * data object.
     *
     * @type {Array.<string>}
     */
    identifierNames: {
        value: []
    },

    /**
     * Descriptors of the properties of data objects of this type, by property
     * name.
     *
     * The returned map should not be modified.
     * [setPropertyDescriptor()]{@link DataObjectDescriptor#setPropertyDescriptor}
     * and
     * [deletePropertyDescriptor()]{@link ObjectDescriptor#deletePropertyDescriptor}
     * should be used instead to modify the property descriptors.
     *
     * @type {Object.<string, DataPropertyDescriptor>}
     */
    propertyDescriptors: {
        get: function () {
            // This returns the same value as the superclass property of the
            // same name, only the JSDoc type is different.
            return Object.getOwnPropertyDescriptor(ObjectDescriptor.prototype, "propertyDescriptors").get.call(this);
        }
    },

    /**
     * Add or replace a property descriptor.
     *
     * @method
     * @argument {string} name                       - The name of the property.
     * @argument {DataPropertyDescriptor} descriptor - Describes the property.
     */
    setPropertyDescriptor: {
        // This does the same thing as the superclass method of the same name,
        // only the JSDoc type is different.
        value: function (name, descriptor) {
            ObjectDescriptor.prototype.setPropertyDescriptor.call(this, name, descriptor);
        }
    },

    /**
     * Create a property descriptor.
     *
     * This overrides the
     * [superclass implementation]{@link PropertyDescriptor#makePropertyDescriptor}
     * to create a {@link DataPropertyDescriptor} instead of a
     * {@link PropertyDescriptor} instance.
     *
     * @method
     * @returns {DataPropertyDescriptor} - The created property descriptor.
     */
    makePropertyDescriptor: {
        value: function () {
            return new DataPropertyDescriptor();
        }
    },

    /**
     * @private
     * @method
     */
    _addRelationships: {
        value: function (relationships) {
            var names, i, n;
            names = Object.keys(relationships);
            for (i = 0, n = names.length; i < n; i += 1) {
                this._addRelationship(names[i], relationships[names[i]]);
            }
        }
    },

    /**
     * @private
     * @method
     */
    _addRelationship: {
        value: function (name, relationship) {
            // TODO: Add derived properties, relationship criteria,
            // relationship targets, and shared fetch information.
            if (!this.propertyDescriptors[name]) {
                this.setPropertyDescriptor(name, this.makePropertyDescriptor());
            }
            this.propertyDescriptors[name].isRelationship = true;
            this.propertyDescriptors[name].isGlobal = relationship.isGlobal ? true : false;
        }
    }

}, /** @lends DataObjectDescriptor */ {

    /**
     * Used for [data services]{@link DataService} that manage all types of data
     * object.
     *
     * @type {ObjectDescriptor}
     */
    ALL_TYPES: {
        get: function () {
            if (!exports.DataObjectDescriptor._ALL_TYPES) {
                exports.DataObjectDescriptor._ALL_TYPES = new exports.DataObjectDescriptor();
            }
            return exports.DataObjectDescriptor._ALL_TYPES;
        }
    },

    /**
     * Generates a getter function that will create and cache a data object
     * descriptor.
     *
     * @method
     * @argument {Object} exports                        - A Montage Require
     *                                                     exports object
     *                                                     defining the
     *                                                     constructor for the
     *                                                     object to describe.
     *                                                     Usually this is
     *                                                     `exports`.
     * @argument {string} constructorName                - The name with which
     *                                                     that constructor can
     *                                                     be looked up in the
     *                                                     exports. This will
     *                                                     also be used as the
     *                                                     name of the type
     *                                                     defined by the
     *                                                     created object
     *                                                     descriptor.
     * @argument {?Object<string, string>} propertyTypes - The types of each of
     *                                                     the object's
     *                                                     properties, by
     *                                                     property name. If
     *                                                     this is omitted the
     *                                                     property information
     *                                                     will be derived from
     *                                                     the properties of the
     *                                                     prototype of the
     *                                                     described object.
     */
    getterFor: {
        value: function (exports, constructorName, propertyTypes, identifierNames, relationships) {
            // The returned getter function has to check
            // `this.hasOwnProperty("_type")`, not just `this._type`, because if
            // the class using the getter is a subclass of another class using a
            // similar getter `this._type` will return the value of the the
            // superclass type instead of the desired subclass type.
            var self = this,
                parsed = self._parseGetterForArguments(arguments),
                getter = ObjectDescriptor.getterFor.call(self, parsed.exports, parsed.name, parsed.types);
            return function () {
                if (!this.hasOwnProperty("_TYPE")) {
                    this._TYPE = getter.call(this);
                    this._TYPE.identifierNames = parsed.identifiers;
                    this._TYPE._addRelationships(parsed.relationships);
                }
                return this._TYPE;
            }
        }
    },

    /**
     * @private
     * @method
     */
    _parseGetterForArguments: {
        value: function (arguments) {
            var types, identifiers, offset, i, n;
            // The types map is the third argument if it's a non-array
            // non-string non-numeric non-boolean object and if it's not the
            // last argument.
            types = arguments.length > 3 && this._isObject(arguments[2]) && arguments[2];
            offset = types ? 0 : -1;
            // The identifier names array is the fourth argument if that's an array,
            // or an array containing the fourth argument and all following ones
            // that are strings if there are any, or an empty array.
            identifiers = Array.isArray(arguments[offset + 3]) && arguments[offset + 3];
            for (i = offset + 3, n = arguments.length; !identifiers; i += 1) {
                if (i === n || typeof arguments[i] !== "string") {
                    identifiers = Array.prototype.slice.call(arguments, offset + 3, i);
                    offset = i - 4;
                }
            }
            // The remaining argument values come from the remaining arguments.
            return {
                exports: arguments[0],
                name: arguments[1],
                types: types || undefined,
                identifiers: identifiers,
                relationships: arguments[offset + 4] || {}
            };
        }
    },

    /**
     * @private
     * @method
     */
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
