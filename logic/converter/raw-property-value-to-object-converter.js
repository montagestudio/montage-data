var Converter = require("montage/core/converter/converter").Converter,
    Criteria = require("montage/core/criteria").Criteria,
    DataQuery = require("logic/model/data-query").DataQuery,
    Montage = require("montage").Montage,
    parse = require("frb/parse"),
    compile = require("frb/compile-evaluator");
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
            if(!value) {
                value = deserializer.getProperty("convertExpression")
            }
            if (value) {
                this.convertExpression = value;
            }
            value = deserializer.getProperty("cardinality");
            if (value) {
                this.cardinality = value;
            }
            value = deserializer.getProperty("foreignDescriptor");
            if (value) {
                this.foreignDescriptor = value;
            }

            value = deserializer.getProperty("service");
            if (value) {
                this.service = value;
            }

            value = deserializer.getProperty("serviceIdentifier");
            if (value) {
                this.serviceIdentifier = value;
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
    expression: {
        value: null
    },

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

    _convertSyntax: {
        value: undefined
    },
    convertSyntax: {
        get: function() {
            return this._convertSyntax || (this._convertSyntax = parse(this.convertExpression));
        }
    },

    __compiledConvertExpression: {
        value: undefined
    },
    _compiledConvertExpression: {
        get: function() {
            return this.__compiledConvertExpression || (this.__compiledConvertExpression = compile(parse(this.convertExpression)));
        }
    },

    evaluateConvertExpression: {
        value: function(value) {
            return this._compiledConvertExpression(value);
        }
    },

    /**
     * The service to use to make requests.
     */
    service: {
        get: function () {
            return this._service;
        },
        set: function (value) {
            this._service = value;
        }
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
                //We shouldn't have to go back to a module-id string since we have the objectDescriptor
                var type = [objectDescriptor.module.id, objectDescriptor.name].join("/"),
                    //dataExpression = self.foreignProperty,
                    parameters,
                    criteria;

                criteria = new Criteria().initWithSyntax(self.convertSyntax, v);
                if (self.serviceIdentifier) {
                    criteria.parameters.serviceIdentifier = self.serviceIdentifier
                }
                return self.service.fetchData(DataQuery.withTypeAndCriteria(type, criteria));
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
            //The objet in the scope either has the relationship, in which case
            //we need to get the value from there, or it doesn't and then
            //we should leverage the object's snapshot
            // console.log("V (", v, ")");
        }
    }

});

