var PropertyDescriptor = require("logic/model/property-descriptor").PropertyDescriptor;

/**
 * Describes a relationship between a property of objects of a certain type and
 * related objects or other related data.
 *
 * @class
 * @extends external:Montage
 */
exports.RelationshipDescriptor = PropertyDescriptor.specialize(/** @lends RelationshipDescriptor# */{

    /**
     * @type {boolean}
     */
    isRelationship: {
        value: true
    },

    /**
     * The type of the objects that will be returned by this relationship.
     *
     * @type {ObjectDescriptor}
     */
    destinationType: {
        value: undefined
    },

    /**
     * The names of any origin properties whose values will be set to the
     * objects fetched by this relationships. Relationships set values in two
     * ways: 1) They set or update properties of the objects they fetch;
     * and 2) They can set or update properties of the object that owns the
     * relationship. This array contains the names of the later properties.
     *
     * @type {string[]}
     */
    targetProperties: {
        get: function () {
            if (!this._targetProperties) {
                this._targetProperties = [];
            }
            return this._targetProperties;
        },
        set: function (properties) {
            this._targetProperties = properties;
        }
    },

    /**
     * The criteria that define the objects fetched by this relationship. These
     * criteria are expressed in terms of the names of the criteria to set on
     * the fetch selector, and for each of these names an
     * [FRB expression]{@link external:FrbExpression} defining how the
     * corresponding criteria value will be obtained. These expressions will be
     * evaluated within the scope of the objects that own the relationship.
     *
     * @type {Object.<string, external:FrbExpression>}
     */
    criteriaExpressions: {
        get: function () {
            if (!this._criteriaExpressions) {
                this._criteriaExpressions = {};
            }
            return this._criteriaExpressions;
        },
        set: function (expressions) {
            this._criteriaExpressions = expressions;
        }
    }

});
