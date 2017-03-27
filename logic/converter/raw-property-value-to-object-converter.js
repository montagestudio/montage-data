var Converter = require("montage/core/converter/converter").Converter,
    Criteria = require("montage/core/criteria").Criteria,
    DataQuery = require("logic/model/data-query").DataQuery;
/**
 * @class RawPropertyValueToObjectConverter
 * @classdesc Converts a property value of raw data to the referenced object.
 * @extends Converter
 */
exports.RawPropertyValueToObjectConverter = Converter.specialize( /** @lends RawPropertyValueToObjectConverter# */ {

    /*********************************************************************
     * Serialization
     */

    serializeSelf: {
        value: function () {
            // TODO: Implement
        }
    },

    deserializeSelf: {
        value: function (deserializer) {
            var value = deserializer.getProperty("foreignProperty");
            if (value) {
                this.foreignProperty = value;
            }
            value = deserializer.getProperty("cardinality");
            if (value) {
                this.cardinality = value;
            }
            value = deserializer.getProperty("foreignDescriptor");
            if (value) {
                this.foreignDescriptor = value;
            }
        }
    },

    /*********************************************************************
     * Initialization
     */

    /**
     * @param {string} foreignProperty the property of the destination to query on.
     * @param {number} cardinality defines if this is a to one or to many relationship.
     * @return itself
     */
    initWithForeignPropertyAndCardinality: {
        value: function (foreignProperty, cardinality) {
            this.foreignProperty = foreignProperty;
            this.cardinality = cardinality;
            return this;
        }
    },

    /*********************************************************************
     * Properties
     */

    /**
     * The cardinality defines if this is a to one or to many relationship
     * @type {number}
     * */
    cardinality: {
        value: null
    },

    /**
     * The descriptor of the destination object.  If one is not provided
     * the value descriptor of the property descriptor that defines the
     * relationship will be used.
     * @type {?ObjectDescriptorReference}
     * */
    foreignDescriptor: {
        value: null
    },

    /**
     * The property name on the destination object.
     * @type {string}
     */
    foreignProperty: {
        value: null
    },

    /**
     * The service to use to make requests.
     */
    service: {
        value: undefined
    },

    /*********************************************************************
     * Public API
     */

    /**
     * Converts the fault for the relationship to an actual object.
     * @function
     * @param {Property} v The value to format.
     * @returns {Promise} A promise for the referenced object.  The promise is
     * fulfilled after the object is successfully fetched.
     */
    convert: {
        value: function (v) {
            var self = this;
            return this.foreignDescriptor.then(function (objectDescriptor) {
                var type = [objectDescriptor.module.id, objectDescriptor.name].join("/"),
                    dataExpression = self.foreignProperty + " = $value",
                    criteria = new Criteria().initWithExpression(dataExpression, {
                        value: self.expression(v)
                    });
                return self.service.rootService.fetchData(DataQuery.withTypeAndCriteria(type, criteria));
            });
        }
    },

    /**
     * Reverts the relationship back to raw data.
     * @function
     * @param {Scope} v The value to revert.
     * @returns {string} v
     */
    revert: {
        value: function (v) {
            console.log("V (", v, ")");
        }
    }

});

