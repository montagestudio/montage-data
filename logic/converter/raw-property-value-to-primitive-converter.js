var Converter = require("montage/core/converter/converter").Converter,
    Criteria = require("montage/core/criteria").Criteria,
    DataQuery = require("logic/model/data-query").DataQuery,
    parse = require("frb/parse"),
    Promise = require("montage/core/promise").Promise,
    compile = require("frb/compile-evaluator"),
    RawPropertyValueConverter = require("logic/converter/raw-property-value-converter").RawPropertyValueConverter;
/**
 * @class RawPropertyValueToPrimitiveConverter
 * @classdesc raw-property-to-primitive-converter is used to load asynchronous properties that are not model objects.
 * @extends Converter
 */
exports.RawPropertyValueToPrimitiveConverter = RawPropertyValueConverter.specialize( /** @lends RawPropertyValueToPrimitiveConverter# */ {

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
    objectDescriptor: {
        get: function () {
            return  this._objectDescriptor                    ? this._objectDescriptor :
                    this.owner && this.owner.objectDescriptor ? this.owner.objectDescriptor  :
                                                                undefined;
        },
        set: function (value) {
            this._objectDescriptor = value;
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
            var self = this,
                criteria = new Criteria().initWithSyntax(self.convertSyntax, v);
            criteria.parameters.propertyName = this.propertyName;

            if (self.serviceIdentifier) {
                criteria.parameters.serviceIdentifier = self.serviceIdentifier
            }


            return self.service ? self.service.fetchData(DataQuery.withTypeAndCriteria(self.objectDescriptor, criteria)) :
                                  Promise.resolve(null);
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

