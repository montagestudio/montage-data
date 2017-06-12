var Converter = require("montage/core/converter/converter").Converter,
    Criteria = require("montage/core/criteria").Criteria,
    DataQuery = require("logic/model/data-query").DataQuery,
    Montage = require("montage").Montage,
    ObjectDescriptorReference = require("montage/core/meta/object-descriptor-reference").ObjectDescriptorReference,
    Promise = require("montage/core/promise").Promise,
    parse = require("frb/parse"),
    Scope = require("frb/scope"),
    compile = require("frb/compile-evaluator");
/**
 * @class RawPropertyValueToConverter
 * @classdesc Abstract class that implements shared asepects for more specialized Converters that convert a raw property value into a high level value.
 * @extends Converter
 */
exports.RawPropertyValueConverter = Converter.specialize( /** @lends RawPropertyValueToObjectConverter# */ {

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
            value = deserializer.getProperty("convertExpression");
            if (value) {
                this.convertExpression = value;
            }

            value = deserializer.getProperty("revertExpression");
            if (value) {
                this.revertExpression = value;
            }

            value = deserializer.getProperty("service");
            if (value) {
                this.service = value;
            }

            value = deserializer.getObjectByLabel("root");
            if (value) {
                this.owner = value;
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
     * The expression used to convert a raw value into a modeled one, for example a foreign property value into the objet it represents.
     * @type {string}
     * */
    _convertExpression: {
        value: null
    },
    convertExpression: {
        get: function() {
            return this._convertExpression;
        },
        set: function(value) {
            if(value !== this._convertExpression) {
                this._convertExpression = value;
                //Reset parswd & compiled version:
                this._convertSyntax = undefined;
                this.__compiledConvertExpression = undefined;
            }
        }
    },

    /**
     * The expression used to convert a modeled value, like a modeled object, back into the raw value used to represent it into another object, like for example a foreign property value.
     * @type {string}
     * */
    _revertExpression: {
        value: null
    },
    revertExpression: {
        get: function() {
            return this._revertExpression;
        },
        set: function(value) {
            if(value !== this._revertExpression) {
                this._revertExpression = value;
                //Reset parswd & compiled version:
                this._revertSyntax = undefined;
                this.__compiledRevertExpression = undefined;
            }
        }
    },


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
            return this.__compiledConvertExpression || (this.__compiledConvertExpression = compile(this.convertSyntax));
        }
    },

    evaluateConvertExpression: {
        value: function(value) {
            return this._compiledConvertExpression(value);
        }
    },

    _revertSyntax: {
        value: undefined
    },
    revertSyntax: {
        get: function() {
            return this._revertSyntax || (this._revertSyntax = parse(this.revertExpression));
        }
    },

    __compiledRevertExpression: {
        value: undefined
    },
    _compiledRevertExpression: {
        get: function() {
            return this.__compiledRevertExpression || (this.__compiledRevertExpression = compile(this.revertSyntax));
        }
    },

    evaluateRevertExpression: {
        value: function(value) {
            return this._compiledRevertExpression(value);
        }
    },

    /**
     * The service to use to make requests.
     */
    service: {
        get: function () {
            return  this._service                    ? this._service :
                    this.owner && this.owner.service ? this.owner.service.rootService :
                    undefined;
        },
        set: function (value) {
            this._service = value;
        }
    },
    __scope: {
        value: null
    },

    /**
     * Scope with which convert and revert expressions are evaluated.
     * @type {Scope} Scope which value is this.
     */

    scope: {
        get: function() {
            return this.__scope || (this.__scope = new Scope(this));
        }
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
            console.log("default identity convert, to be overriden by  specialized converters - ", v);
            return v;
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
            console.log("default identity revert, to be overriden by  specialized converters - ", v);
            return v;
        }
    }

});

