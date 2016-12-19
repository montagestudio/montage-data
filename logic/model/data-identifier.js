var Montage = require("montage").Montage;

/**
 * This object represents a unique identifier to an object and has a URL representation,
 * which is conceptually aligned with the notion of resource:
 * It should have, in order:
 * - a host/source/origin: where the data come from. Automatically generated primary keys
 *  exists in only one environment - Dev, test, prod, etc...,
 * (a user's authorization (if any necessary) should be left to be resolved a client receiving the identifier,
 * only people authenticated and authorized would be able to get it and that happens at DataService level)
 * - a type
 * - a primary key. This could be a combination of property/value, but it needs to be serializable as a valid url
 *
 * @class
 * @extends external:Montage
 */
exports.DataIdentifier = Montage.specialize(/** @lends DataIdentifier.prototype */ {

    /**
     * The DataService that created this DataIdentifier
     *
     * @type {DataService}
     */
    dataService: {
        value: undefined
    },

    /**
     * The ObjectDescriptor associated witH a dataIdentifier
     *
     * @type {ObjectDescriptor}
     */
    objectDescriptor: {
        value: undefined
    },

    /**
     * Wether a DataIdentifier is persistent/final vs temporary when created client side
     *
     * @type {ObjectDescriptor}
     */
    isPersistent: {
        value: false
    },

    /**
     * Wether a DataIdentifier is persistent/final vs temporary when created client side
     *
     * @type {ObjectDescriptor}
     */
    _identifier: {
        value: false
    },

    _url: {
        value: false
    },
  /**
     * The url representation of a dataIdentifier
     *
     * @type {ObjectDescriptor}
     */
    url: {
        get: function() {
            return this._url;
        },
        set: function(value) {
            return this._url = value;
        }
    }

});
