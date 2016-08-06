var DataService = require("logic/service/data-service").DataService,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream;

/**
 * Provides data objects of certain types and manages changes to them based on
 * "raw" data obtained from or sent to one or more other services, typically
 * REST or other network services. Raw data services can therefore be considered
 * proxies for these REST or other services.
 *
 * Raw data services always have a parent service to which they mush be
 * [added]{@link DataService#addChildService}. These parent services are usually
 * plain [data services]{@link DataService} and often the application's
 * [main data service]{@link DataService.mainService}, and all calls to raw data
 * services must be routed through their parent services.
 *
 * Raw data service subclasses that implement their own constructor should call
 * this class' constructor at the beginning of their constructor implementation
 * with code like the following:
 *
 *     RawDataService.call(this);
 *
 * @class
 * @extends DataService
 */
exports.RawDataService = DataService.specialize(/** @lends RawDataService.prototype */ {

    /***************************************************************************
     * Initializing
     */

    constructor: {
        value: function RawDataService() {
            DataService.call(this);
        }
    },

    /***************************************************************************
     * Basic properties
     *
     * Private properties are defined where they are used, not here.
     */

    /**
     * If defined, used by
     * [mapFromRawData()]{@link RawDataService#mapFromRawData} to map between
     * the raw data on which this service is based and the typed data objects
     * which this service provides and manages.
     *
     * @type {?DataMapping}
     */
    mapping: {
        value: undefined
    },

    /***************************************************************************
     * Tracking data object changes
     */

    createdDataObjects: {
        get: function () {
            return this.rootService.createdDataObjects();
        }
    },

    changedDataObjects: {
        get: function () {
            return this.rootService.changedDataObjects();
        }
    },

    /***************************************************************************
     * Creating data objects
     */

    getDataObject: {
        value: function (type, data, context) {
            return this.rootService.getDataObject(type, data, context);
        }
    },

    createDataObject: {
        value: function (type) {
            return this.rootService.createDataObject(type);
        }
    },

    /***************************************************************************
     * Fetching data objects
     */

    /**
     * Fetch data from this service for its parent. This method should not be
     * called directly by anyone other than this service's parent. Calls to the
     * root service should be made to initiate data fetches.
     *
     * When online, this method fetches raw data from a server or other source
     * using [fetchRawData()]{@link RawDataService#fetchRawData}, which should
     * repeatedly call [addRawData()]{@link RawDataService#addRawData} to get or
     * create objects corresponding to the raw data, map the raw data to those
     * objects, and add them to the returned stream.
     *
     * When offline, this method calls
     * [fetchOfflineData()]{@link RawDataService#fetchOfflineData}, which by
     * default does nothing. Subclasses must override
     * [fetchOfflineData()]{@link RawDataService#fetchOfflineData} or
     * [isOffline]{@link RawDataService#isOffline} if they want to provide
     * offline support.
     *
     * Subclasses should not override this method, they should instead
     * override their [fetchRawData()]{@link RawDataService#fetchRawData}
     * method, their [fetchOfflineData()]{@link RawDataService#fetchOfflineData}
     * method, their [mapFromRawData()]{@link RawDataService#mapFromRawData}
     * method, their [mapping's]{@link RawDataService#mapping}
     * [mapFromRawData()]{@link DataMapping#mapFromRawData} method, or several
     * of these.
     *
     * @method
     * @argument {DataSelector} selector - Defines what data should be fetched.
     *                                     A [type]{@link DataObjectDescriptor}
     *                                     can be provided instead of a
     *                                     {@link DataSelector}, in which
     *                                     case a DataSelector with no
     *                                     [criteria]{@link DataSelector#criteria}
     *                                     will be created and used for the
     *                                     fetch.
     * @argument {?DataStream} stream    - A stream to which the fetched data
     *                                     can be added. If not stream is
     *                                     provided a stream will be created and
     *                                     returned by this method.
     * @returns {DataStream} - The stream to which the fetched data was added.
     */
    fetchData: {
        value: function (selector, stream) {
            // Set up the stream, accepting a type in lieu of a selector.
            stream = stream || new DataStream();
            if (selector instanceof DataSelector) {
                stream.selector = selector;
            } else {
                stream.selector = DataSelector.withTypeAndCriteria(selector);
            }
            // Fetch the data with the passed in or created stream.
            return this.isOffline ? this.fetchOfflineData(stream) :
                                    this._fetchOnlineData(stream);
        }
    },

    _fetchOnlineData: {
        value: function (stream) {
            // Get the data from raw data.
            this.fetchRawData(stream);
            // Return the passed in or created stream.
            return stream;
        }
    },

    /***************************************************************************
     * Handling offline
     */

    /*
     * By default this returns the
     * [root service's offline status]{@link DataService#isOffline}.
     *
     * Subclasses that work the same way when offline as when online should
     * override this to always return `false` so as to prevent calls to
     * [fetchOfflineData()]{@link RawDataService#fetchOfflineData}.
     *
     * @type {boolean}
     */
    isOffline: {
        get: function () {
            return this.rootService.isOffline;
        }
    },

    /**
     * Fetch data when offline.
     *
     * The default implementation does nothing but return the passed in stream.
     * This is appropriate for subclasses that do not support offline operation.
     *
     * Subclasses that work the same way when offline as when online should
     * override their [isOffline]{@link RawDataService#isOffline} property to
     * always return false so this method is never called.
     *
     * Subclasses that work offline and operate differently when offline than
     * when online should override this method to handle the offline operation.
     * Usually these subclasses will override their
     * [addOfflineData()]{@link RawDataSource#addOfflineData} method to cache
     * data when online that can be used by this method when offline.
     *
     * @method
     * @argument {DataStream} stream - A stream to which the fetched data can
     *                                 be added. This must not and will not be
     *                                 undefined or null, and it will include a
     *                                 selector specifying which data should be
     *                                 fetched.
     * @returns {DataStream} - The stream to which the fetched data was added.
     */
    fetchOfflineData: {
        value: function (stream) {
            // Subclasses should override this to do something useful.
            return stream;
        }
    },

    /**
     * Called every time [addRawData()]{@link RawDataService#addRawData} is
     * called while online to optionally cache that data for offline use.
     *
     * The default implementation does nothing. This is appropriate for
     * subclasses that do not support offline operation or which operate the
     * same way when offline as when online.
     *
     * Other subclasses may override this method to cache data fetched when
     * online so [fetchOfflineData]{@link RawDataSource#fetchOfflineData} can
     * use that data when offline.
     *
     * @method
     * @argument {DataStream} stream   - The stream to which the fetched data is
     *                                   being added.
     * @argument {Array} rawDataArray  - An array of objects whose properties'
     *                                   values hold the raw data.
     * @argument {?} context           - The context value passed to the
     *                                   [addRawData()]{@link DataMapping#addRawData}
     *                                   call that is invoking this method.
     */
    addOfflineData: {
        value: function (stream, rawDataArray, context) {
            // Subclasses should override this to do something useful.
        }
    },

    /***************************************************************************
     * Saving changed data objects
     */

    deleteDataObject: {
        value: function (object) {
            var data = {};
            this.mapToRawData(object, data);
            return this.deleteRawData(data, object);
        }
    },

    saveDataObject: {
        value: function (object) {
            var data = {};
            this.mapToRawData(object, data);
            return this.saveRawData(data, object);
        }
    },

    saveDataChanges: {
        value: function () {
            return this.rootService.saveDataChanges();
        }
    },

    /***************************************************************************
     * Managing data object property values
     */

    decacheObjectProperties: {
        value: function (object, propertyNames) {
            return this.rootService.decacheObjectProperties(object, propertyNames);
        }
    },

    getObjectProperties: {
        value: function (object, propertyNames) {
            return this.rootService.getObjectProperties(object, propertyNames);
        }
    },

    updateObjectProperties: {
        value: function (object, propertyNames) {
            return this.rootService.updateObjectProperties(object, propertyNames);
        }
    },

    /**
     * Fetch the value of a data object's property, possibly asynchronously.
     *
     * The default implementation of this method just return a fulfilled promise
     * for `null`. Subclasses should override this method to perform any fetch
     * or other operation required to get the requested data. The subclass
     * implementations should only use calls to their
     * [root service's]{@link DataService.rootService}
     * [fetchData()]{@link DataService#fetchData} to fetch data.
     */
    fetchObjectProperty: {
        value: function (object, propertyName) {
            return this.nullPromise;
        }
    },

    /***************************************************************************
     * Handling raw data
     *
     * TODO [Charles/Benoit] Rename "raw data" to "records/record".
     *
     * Most of the methods overridden in RawDataService subclasses are here.
     */

    /**
     * Fetch the raw data of this service.
     *
     * This method should never be called directly by users of this service.
     * They should instead call [fetchData()]{@link RawDataService#fetchData}.
     *
     * This method should be overridden by service Subclasses to fetch their raw
     * data and provide it to the specified stream with zero or more calls to
     * [addRawData()]{@link RawDataService#addRawData} followed by one call to
     * [rawDataDone()]{@link RawDataService#rawDataDone}.
     *
     * This method must be asynchronous and return as soon as
     * possible even if it takes a while to obtain the raw data.
     * The raw data can be provided to the service asynchronously
     * using [addRawData()]{@link RawDataService#addRawData} and
     * [rawDataDone()]{@link RawDataService#rawDataDone} at any
     * point after this method is called, even after it returns.
     *
     * The default implementation of this method simply calls
     * [rawDataDone()]{@link RawDataService#rawDataDone} immediately.
     *
     * @method
     * @argument {DataStream} stream     - The stream to which the data objects
     *                                     corresponding to the raw data should
     *                                     be added. This stream contains
     *                                     references to the selector defining
     *                                     which raw data to fetch.
     */
    fetchRawData: {
        value: function (stream) {
            this.rawDataDone(stream);
        }
    },

    // TODO: Document.
    saveRawData: {
        value: function (data, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    // TODO: Document.
    deleteRawData: {
        value: function (data, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    /**
     * To be called by [fetchRawData()]{@link RawDataService#fetchRawData} when
     * raw data is received. This method should never be called directly.
     *
     * This method creates and registers the data objects that
     * will represent the raw data with repeated calls to
     * [getDataObject()]{@link DataService#getDataObject}, maps
     * the raw data to those objects with repeated calls to
     * [mapFromRawData()]{@link RawDataService#mapFromRawData},
     * and then adds those objects to the specified stream.
     *
     * Subclasses should never need to override this method and they should
     * instead override their [getDataObject()]{@link DataService#getDataObject}
     * method and their [mapFromRawData()]{@link RawDataService#mapFromRawData}
     * method or their [mapping]{@link RawDataService#mapping}'s
     * [mapFromRawData()]{@link RawDataMapping#mapFromRawData} method.
     *
     * @method
     * @argument {DataStream} stream   - The stream to which the data objects
     *                                   corresponding to the raw data should be
     *                                   added.
     * @argument {Array} rawDataArray  - An array of objects whose properties'
     *                                   values hold the raw data. This array
     *                                   will be modified by this method.
     * @argument {?} context           - A value that will be passed to
     *                                   [getDataObject()]{@link DataMapping#getDataObject}
     *                                   and
     *                                   [mapFromRawData()]{@link DataMapping#mapFromRawData}
     *                                   if it is provided.
     */
    addRawData: {
        value: function (stream, rawDataArray, context) {
            var i, n, object;
            // Give the service a chance to save the data for offline use.
            if (!this.isOffline) {
                this.addOfflineData(stream, rawDataArray, context);
            }
            // Convert the raw data to appropriate data objects. The conversion
            // will be done in place to avoid creating an extra array.
            for (i = 0, n = rawDataArray ? rawDataArray.length : 0; i < n; i += 1) {
                object = this.getDataObject(stream.selector.type, rawDataArray[i], context);
                this.mapFromRawData(object, rawDataArray[i], context);
                rawDataArray[i] = object;
            }
            stream.addData(rawDataArray);
        }
    },

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapFromRawData: {
     *         value: function (object, data) {
     *             object.firstName = data.GIVEN_NAME;
     *             object.lastName = data.FAMILY_NAME;
     *         }
     *     }
     *
     * Alternatively, subclasses can define a
     * [mapping]{@link DataService#mapping} to do this mapping.
     *
     * The default implementation of this method copies the properties defined
     * by the raw data object to the data object.
     *
     * @method
     * @argument {Object} object - An object whose properties must be set or
     *                             modified to represent the raw data.
     * @argument {Object} data   - An object whose properties' values hold
     *                             the raw data.
     * @argument {?} context     - A value that was passed in to the
     *                             [addRawData()]{@link RawDataService#addRawData}
     *                             call that invoked this method.
     */
    mapFromRawData: {
        value: function (object, data, context) {
            var keys, i, n;
            if (this.mapping) {
                this.mapping.mapFromRawData(object, data, context);
            } else if (data) {
                keys = Object.keys(data);
                for (i = 0, n = keys.length; i < n; i += 1) {
                    object[keys[i]] = data[keys[i]];
                }
            }
        }
    },

    // TODO: Document.
    mapToRawData: {
        value: function (object, data) {
            // TO DO: Provide a default mapping based on object.TYPE.
            // For now, subclasses must override this.
        }
    },

    /**
     * To be called once for each
     * [fetchRawData()]{@link RawDataService#fetchRawData} call received to
     * indicate that all the raw data meant for the specified stream has been
     * added to that stream.
     *
     * Subclasses should not override this method.
     *
     * @method
     * @argument {DataStream} stream - The stream to which the data objects
     *                                 corresponding to the raw data have been
     *                                 added.
     */
    rawDataDone: {
        value: function (stream) {
            stream.dataDone();
        }
    }

});
