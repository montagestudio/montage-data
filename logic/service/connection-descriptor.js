var Montage = require("montage").Montage;

/**
 * This object represents the data necessary for a DataService to connect to it's data source
 * It formalizes a name and an authorization object, but leaves to RawDataServices the role
 * to specialize it in a way that reflects what they need.
 *
 * @class
 * @extends external:Montage
 */
exports.ConnectionDescriptor = Montage.specialize(/** @lends DataIdentifier.prototype */ {

    /**
     * The name of this descriptor
     *
     * @type {String}
     */
    name: {
        value: undefined
    },

    /**
     * The authorization obtained by a DataServie if any
     *
     * @type {Object}
     */
    authorization: {
        value: undefined
    }

});
