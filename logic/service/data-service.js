var Montage = require("montage").Montage,
    DataMapping = require("logic/service/data-mapping").DataMapping,
    DataStream = require("logic/service/data-stream").DataStream;

/**
 * Provides data objects and potentially manages changes to them.
 *
 * @class
 * @extends external:Montage
 */
exports.DataService = Montage.specialize(/** @lends DataService# */{

    /**
     * The parent of this service if it is a child of another service, or
     * `null` if it not a child service.
     *
     * @type {DataService}
     */
    parentService: {
        value: null
    },

    /**
     * Map of child services used to get and manage types of objects not
     * directly obtained or managed by this service.
     *
     * Values can be added or removed from the map but the map itself cannot be
     * replaced.
     *
     * @todo [Charles]: Allow this to be configured through a blueprint file.
     *
     * @type {Map<ObjectDescriptor, DataService>}
     */
    childServices: {
        get: function() {
            if (!this._services) {
                this._services = new Map();
            }
            return this._services;
        }
    },

    /**
     * Maps the raw data on which this service is based to the data objects
     * returned by this service.
     *
     * If no mapping is defined a default mapping is provided that does not
     * convert the raw data.
     *
     * @type {Object}
     */
    mapping: {
        get: function () {
            if (!this._mapping) {
                this._mapping = new DataMapping();
            }
            return this._mapping;
        },
        set: function(mapping) {
            this._mapping = mapping;
        }
    },

    /**
     * Get data from the service. This is the main method used by clients of
     * this service.
     *
     * This method gets raw data from a server or other source using the
     * [getRawData()]{@link DataService#getRawData} method, maps that data to
     * data objects that fit into an application's data model using the
     * service's [mapping]{@link DataService#mapping}, registers those objects
     * so the service can manage them, and then return those objects in the
     * specified stream or in a new stream created for this purpose.
     *
     * @method
     * @argument {ObjectDescriptor} type - The type of the data requested.
     * @argument {DataSelector} selector - Criteria that the returned data
     *                                     objects must satisfy.
     * @argument {DataStream} stream     - The stream to which the provided data
     *                                     should be added. If not stream is
     *                                     provided a stream will be created and
     *                                     returned by this method.
     */
    getData: {
        value: function (type, selector, stream) {
            // Set up the stream.
            if (!stream) {
                stream = new DataStream();
            }
            if (!stream.service) {
                stream.service = this;
            }
            stream.type = type;
            stream.selector = selector;
            // Get the data from a child service or from raw data.
            if (this.childServices.has(type)) {
                this.childServices.get(type).getData(type, selector, stream);
            } else {
                this.getRawData(stream)
            }
            // Return the passed in or created stream.
            return stream;
        }
    },

    /**
     * Get the raw data used by this service.
     *
     * Subclasses override this method to provide the raw data on which they
     * depend.
     *
     * This class' implementation simply calls
     * [rawDataDone()]{@link DataService#rawDataDone} immediately
     *
     * @method
     * @argument {DataStream} stream     - The stream to which the data objects
     *                                     corresponding to the raw data should
     *                                     be added. This stream contains
     *                                     references to the type and selector
     *                                     defining which raw data to get.
     */
    getRawData: {
        value: function (stream) {
            this.rawDataDone(stream)
        }
    },

    /**
     * To be called by [getRawData()]{@link DataService#getRawData} when raw
     * data is received.
     *
     * This method maps the raw data to data objects using the specified
     * service's [mapping]{@link DataService#mapping}, registers those objects
     * with the service so it can manage them, and then adds those objects to
     * the specified stream.
     *
     * @method
     * @argument {DataStream} stream   - The stream to which the data objects
     *                                   corresponding to the raw data should be
     *                                   added.
     * @param {Array} objects          - An array of objects containing the raw
     *                                   data. This array and the objects it
     *                                   contains may be modified.
     */
    addRawData: {
        value: function (stream, objects) {
            // Convert the raw data to appropriate data objects.
            var i, n = objects ? objects.length : 0;
            for (i = 0; i < n; ++i) {
                objects[i] = this.mapping.mapRawData(objects[i]);
            }
            // TO DO: Register the data objects into a snapshot map
            // (for uniquing, change tracking, and reverting).
            // Pass on the converted data.
            stream.addData(objects);
        }
    },

    /**
     * Indicate that all the raw data meant for the specified stream has been
     * added to that stream.
     *
     * Subclasses must call this method once with appropriate values for each
     * [getRawData()]{@link DataService#getRawData} call they receive.
     *
     * @method
     * @argument {DataStream} stream -   The stream to which the data objects
     *                                   corresponding to the raw data have been
     *                                   added.
     */
    rawDataDone: {
        value: function (stream) {
            stream.dataDone();
        }
    }

});
