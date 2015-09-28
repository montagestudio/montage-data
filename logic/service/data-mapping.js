var Montage = require("montage").Montage;

/**
 * Maps raw data to data objects of a specific type.
 *
 * Currently services define their mapping by overriding their
 * [mapRawData()]{@link DataService#mapRawData} method or by using a
 * {@link DataMapping} subclass that overrides its
 * [mapRawData()]{@link DataMapping#mapRawData} method. In the future it will be
 * possible to define mappings declaratively through mapping descriptors read
 * from blueprint files.
 *
 * @class
 * @extends external:Montage
 */
exports.DataMapping = Montage.specialize(/** @lends DataMapping# */{

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapRawData: {
     *         value: function (dataObject, rawData) {
     *             dataObject.firstName = rawData.GIVEN_NAME;
     *             dataObject.lastName = rawData.FAMILY_NAME;
     *         }
     *     }
     *
     * The default implementation of this method copies the properties defined
     * by the raw data object to the data object.
     *
     * @method
     * @argument {Object} dataObject - An object whose properties will be
     *                                 set or modified to represent the data
     *                                 define in rawData.
     * @argument {Object} rawData    - An object whose properties hold the raw
     *                                 data.
     * @argument {?} context         - A value that was passed in to the
     *                                 [DataService mapRawData()]{@link DataService#mapRawData}
     *                                 call that invoked this method.
     */
    mapRawData: {
        value: function (dataObject, rawData, context) {
            if (rawData) {
                for (key in rawData) {
                    dataObject[key] = rawData[key]
                }
            }
            return dataObject;
        }
    }

});
