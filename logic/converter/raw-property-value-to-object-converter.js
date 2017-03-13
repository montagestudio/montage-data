var Converter = require("montage/core/converter/converter").Converter,
    DataQuery = require("logic/model/data-query").DataQuery;
/**
 * @class RawPropertyValueToObjectConverter
 * @classdesc Converts a property value of raw data to the referenced object.
 * @extends Converter
 */
exports.RawPropertyValueToObjectConverter = Converter.specialize( /** @lends RawPropertyValueToObjectConverter# */ {

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

    cardinality: {
        value: null
    },

    foreignDescriptor: {
        value: null
    },

    /**
     * The pattern to use when parsing the value during conversion or reversion.
     * @type {?string}
     */
    foreignProperty: {
        value: null
    },

    service: {
        value: undefined
    },

    /**
     * Converts the specified value to a moment object.
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
                    criteria = {};
                criteria[self.foreignProperty] = self.expression(v);
                return self.service.rootService.fetchData(DataQuery.withTypeAndCriteria(type, criteria));
            });
        }
    },

    /**
     * Reverts a moment to the string output specified by the pattern property.
     * @function
     * @param {moment} v The value to revert.
     * @returns {string} v
     */
    revert: {
        value: function (v) {
        }
    }

});

