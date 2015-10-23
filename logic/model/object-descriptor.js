var Montage = require("montage").Montage,
    PropertyDescriptor = require("logic/model/property-descriptor").PropertyDescriptor,
    RelationshipDescriptor = require("logic/model/relationship-descriptor").RelationshipDescriptor;

/**
 * Describes a type of object.
 *
 * Because of
 * [an issue with JSDoc]{@linkplain https://github.com/jsdoc3/jsdoc/issues/1049}
 * the `prototype` property of this class may not appear in the JSDoc generated
 * documentation for this class. This property does exist, however. It is of
 * type `Object` and is a reference to the prototype to use for objects
 * described by instances of this class.
 *
 * @class
 * @extends external:Montage
 */
var ObjectDescriptor = exports.ObjectDescriptor = Montage.specialize(/** @lends ObjectDescriptor# */{

    /***************************************************************************
     * Public prototype properties (instance variables).
     *
     * Private properties are defined and/or documented where they are used.
     */

    /**
     * The name of the type of object described by this descriptor.
     *
     * @type {string}
     */
    name: {
        value: undefined
    },

    /**
     * The prototype to use for objects of this type.
     *
     * @type {Object}
     */
    prototype: {
        value: new Montage()
    },

    /**
     * Descriptors of the properties of objects of this type, by property name.
     *
     * The returned object should not be modified and
     * [addProperty]{@link ObjectDescriptor#addProperty} or
     * [removeProperty]{@link ObjectDescriptor#removeProperty} should be used
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

    /***************************************************************************
     * Property management methods.
     */

    /**
     * Add or replace a property descriptor of this object descriptor.
     *
     * @method
     */
    addProperty: {
        value: function (name, descriptor) {
            this.properties[name] = descriptor;
        }
    },

    /**
     * Remove a property descriptor of this object descriptor.
     *
     * @method
     */
    removeProperty: {
        value: function (name) {
            delete this.properties[name];
        }
    },

    /**
     * Convenience method to define multiple relationships without having to
     * manually create [RelationshipDescriptors]{@link RelationshipDescriptor}
     * for them.
     *
     * @private
     * @method
     * @argument {Object} definitions - An object whose property names are the
     *                                  names of the relationships to add and
     *                                  whose property values are objects with
     *                                  values for the
     *                                  [destinationType]{@link RelationshipDescriptor#destinationType},
     *                                  [targetProperties]{@link RelationshipDescriptor#targetProperties},
     *                                  and
     *                                  [criteriaExpressions]{@link RelationshipDescriptor#criteriaExpressions}
     *                                  properties of the
     *                                  [RelationshipDescriptors]{@link RelationshipDescriptor}
     *                                  to create for each relationship.
     *                                  If any destinationType is null the
     *                                  corresponding relationship will be
     *                                  created from this type to itself.
     */
    _addRelationships: {
        value: function (definitions) {
            var name;
            for (name in (definitions || {})) {
                this._addRelationship(name, definitions[name]);
            }
        }
    },

    /**
     * Convenience method to define a single relationship without having to
     * manually create a {@link RelationshipDescriptor} for it.
     *
     * @private
     * @method
     * @argument {string} name       - The name of the relationship
     * @argument {Object} definition - An object with values for the
     *                                 [destinationType]{@link RelationshipDescriptor#destinationType},
     *                                 [targetProperties]{@link RelationshipDescriptor#targetProperties},
     *                                 and
     *                                 [criteriaExpressions]{@link RelationshipDescriptor#criteriaExpressions}
     *                                 properties of the
     *                                 {@link RelationshipDescriptor} to create.
     *                                 If destinationType is null a relationship
     *                                 will be created from this type to itself.
     */
    _addRelationship: {
        value: function (name, definition) {
            var relationship = new RelationshipDescriptor();
            relationship.destinationType = definition.destinationType || this;
            relationship.targetProperties = definition.targetProperties || [];
            relationship.criteriaExpressions = definition.criteriaExpressions || {};
            this.addProperty(name, relationship);
        }
    },

    /**
     * Convenience method to define non-relationship properties without having
     * to manually create [PropertyDescriptors]{@link PropertyDescriptor} for
     * each of them.
     *
     * @private
     * @method
     */
    _addNonRelationshipProperties: {
        value: function (names) {
            var i, n;
            for (i = 0, n = names ? names.length : 0; i < n; ++i) {
                this.addProperty(names, new PropertyDescriptor());
            }
        }
    }

}, {

    /***************************************************************************
     * Constructor methods (class methods).
     */

    /**
     * Convenience method to generate a getter function that will create and
     * then cache the object descriptor corresponding to a constructor. The
     * object descriptors will be created with non-relationship properties taken
     * from the properties of the constructor's prototype and with the
     * relationships specified.
     *
     * @memberof ObjectDescriptor
     * @method
     * @argument {Object} exports       - A Montage Require exports object
     *                                    defining the constructor. Typically
     *                                    this is `exports`.
     * @argument {string} name          - The name with which the constructor is
     *                                    defined in the exports, which will be
     *                                    used as the name of the type.
     * @argument {Object} relationships - An object whose property names are the
     *                                    names of the relationships to add and
     *                                    whose property values are objects with
     *                                    values for the
     *                                    [destinationType]{@link RelationshipDescriptor#destinationType},
     *                                    [targetProperties]{@link RelationshipDescriptor#targetProperties},
     *                                    and
     *                                    [criteriaExpressions]{@link RelationshipDescriptor#criteriaExpressions}
     *                                    properties of the
     *                                    [RelationshipDescriptors]{@link RelationshipDescriptor}
     *                                    to create for each relationship.
     *                                    If any destinationType is null the
     *                                    corresponding relationship will be
     *                                    created from this type to itself.
     */
    getterFor: {
        value: function (exports, name, relationships) {
            return function () {
                // Note: We have to check this.hasOwnProperty("_type"), not just
                // this._type, because if this is a subclass of another class
                // this._type will return the parent class' type.
                if (!this.hasOwnProperty("_type")) {
                    this._type = new ObjectDescriptor();
                    this._type.name = name;
                    this._type.prototype = exports[name].prototype;
                    this._type._addNonRelationshipProperties(Object.keys(exports[name]));
                    this._type._addRelationships(relationships);
                }
                return this._type;
            }
        }
    }

});
