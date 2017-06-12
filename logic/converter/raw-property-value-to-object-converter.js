var Converter = require("montage/core/converter/converter").Converter,
    Criteria = require("montage/core/criteria").Criteria,
    DataQuery = require("logic/model/data-query").DataQuery,
    DataService = require("logic/service/data-service").DataService,
    Montage = require("montage").Montage,
    ObjectDescriptorReference = require("montage/core/meta/object-descriptor-reference").ObjectDescriptorReference,
    Promise = require("montage/core/promise").Promise,
    parse = require("frb/parse"),
    compile = require("frb/compile-evaluator"),
    RawPropertyValueConverter = require("logic/converter/raw-property-value-converter").RawPropertyValueConverter;
;
/**
 * @class RawPropertyValueToObjectConverter
 * @classdesc Converts a property value of raw data to the referenced object.
 * @extends Converter
 */
exports.RawPropertyValueToObjectConverter = RawPropertyValueConverter.specialize( /** @lends RawPropertyValueToObjectConverter# */ {

    _revertExpression: {
        value: "service.dataIdentifierForObject($).primaryKey"
    },

    /*********************************************************************
     * Serialization
     */

    serializeSelf: {
        value: function (serializer) {
            this.super(serializer);
           // TODO: Implement
        }
    },

    deserializeSelf: {
        value: function (deserializer) {
            this.super(deserializer);

            var value = deserializer.getProperty("foreignProperty");
            if (value) {
                this.foreignProperty = value;
            } else {
                value = deserializer.getProperty("convertExpression");
            }

            if (value) {
                this.convertExpression = value;
            }

            value = deserializer.getProperty("foreignDescriptor");
            if (value) {
                this._foreignDescriptorReference = value;
            }

            deserializer.deserializeUnit("bindings");
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
     * The descriptor of the destination object.  If one is not provided
     * the value descriptor of the property descriptor that defines the
     * relationship will be used.
     * @type {?ObjectDescriptorReference}
     * */
    foreignDescriptor: {
        serializable: false,
        get: function () {
            return this._foreignDescriptorReference && this._foreignDescriptorReference.promise(this.require);
        },
        set: function (descriptor) {
            this._foreignDescriptorReference = new ObjectDescriptorReference().initWithValue(descriptor);
        }
    },

    /**
     * The property name on the destination object.
     * @type {string}
     */
    foreignProperty: {
        value: null
    },

    /*********************************************************************
     * Public API
     */

    /**
     * Converts the fault for the relationship to an actual object that has an ObjectDescriptor.
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
                    criteria;

                criteria = new Criteria().initWithSyntax(self.convertSyntax, v);
                if (self.serviceIdentifier) {
                    criteria.parameters.serviceIdentifier = self.serviceIdentifier
                }


                return self.service ? self.service.fetchData(DataQuery.withTypeAndCriteria(type, criteria)) :
                                      Promise.resolve(null);
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
            if(v) {
                var scope = this.scope;
                //Parameter is what is accessed as $ in expressions
                scope.parameters = v;
                return Promise.resolve(this.evaluateRevertExpression(scope));
            }
            return Promise.resolve(undefined);
        }
    }

});

