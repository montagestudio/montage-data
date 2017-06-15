var Converter = require("montage/core/converter/converter").Converter,
    Criteria = require("montage/core/criteria").Criteria,
    DataQuery = require("logic/model/data-query").DataQuery,
    ObjectDescriptorReference = require("montage/core/meta/object-descriptor-reference").ObjectDescriptorReference,
    Promise = require("montage/core/promise").Promise,
    Scope = require("frb/scope"),
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
        value: function (serializer) {

            serializer.setProperty("convertDataExpression", this.convertDataExpression);
            serializer.setProperty("convertExpression", this.convertExpression);

            serializer.setProperty("foreignDescriptor", this._foreignDescriptorReference);

            serializer.setProperty("revertDataExpression", this.revertDataExpression);
            serializer.setProperty("revertExpression", this.revertExpression);

            serializer.setProperty("root", this.owner);

            serializer.setProperty("serviceIdentifier", this.serviceIdentifier);
            serializer.setProperty("service", this.service);

        }
    },

    deserializeSelf: {
        value: function (deserializer) {
            var value = deserializer.getProperty("convertExpression");
            if (value) {
                this.convertExpression = value;
            }

            value = deserializer.getProperty("convertDataExpression");
            if (value) {
                this.convertDataExpression = value;
            }


            value = deserializer.getProperty("revertExpression");
            if (value) {
                this.revertExpression = value;
            }

            value = deserializer.getProperty("revertDataExpression");
            if (value) {
                this.revertDataExpression = value;
            }

            value = deserializer.getProperty("foreignDescriptor");
            if (value) {
                this._foreignDescriptorReference = value;
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
                //Reset parsed & compiled version:
                this._convertSyntax = undefined;
                this.__compiledConvertExpression = undefined;
            }
        }
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

    /**
     * The expression used to convert a modeled value, like a modeled object, back into the raw value used to represent it into another object, like for example a foreign property value.
     * @type {string}
     * */
    _revertExpression: {
        value: "service.dataIdentifierForObject($).primaryKey"
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



    /**
     * The service to use to make requests.
     */
    service: {
        get: function () {
            return  this._service                    ? this._service :
                    this.owner && this.owner.service ? this.owner.service :
                                                       undefined;
        },
        set: function (value) {
            this._service = value;
        }
    },

    /**
     * Identifier of the child of service to route the request to
     */
    serviceIdentifier: {
        value: undefined
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
            var self = this,
                criteria = new Criteria().initWithSyntax(self.convertSyntax, v),
                descriptorPromise = this.foreignDescriptor || Promise.resolve(this.objectDescriptor),
                query;


            return descriptorPromise.then(function (typeToFetch) {
                var type = [typeToFetch.module.id, typeToFetch.name].join("/");

                if (self.serviceIdentifier) {
                    criteria.parameters.serviceIdentifier = self.serviceIdentifier
                }

                query = DataQuery.withTypeAndCriteria(type, criteria);

                if (self.convertDataExpression) {
                    query.selectExpression = self.convertDataExpression;
                } else if (self.propertyName) {
                    criteria.parameters.propertyName = self.propertyName;
                }

                return self.service ? self.service.rootService.fetchData(query) :
                                      null;
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

