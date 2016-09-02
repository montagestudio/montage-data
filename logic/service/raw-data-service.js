var DataService = require("logic/service/data-service").DataService,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    WeakMap = require("collections/weak-map");

/**
 * Provides data objects of certain types and manages changes to them based on
 * "raw" data obtained from or sent to one or more other services, typically
 * REST or other network services. Raw data services can therefore be considered
 * proxies for these REST or other services.
 *
 * Raw data services are usually the children of a
 * [data service]{@link DataService} that often is the application's
 * [main data service]{@link DataService.mainService}. All calls to raw data
 * services that have parent services must be routed through those parents.
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
     * Basic Properties
     *
     * Private properties are defined where they are used, not here.
     */

    /**
     * If defined, used by
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject} and
     * [mapObjectToRawData()]{@link RawDataService#mapObjectToRawData} to map
     * between the raw data on which this service is based and the typed data
     * objects which this service provides and manages.
     *
     * @type {?DataMapping}
     */
    mapping: {
        value: undefined
    },

    /***************************************************************************
     * Tracking Data Object Changes
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
     * Creating Data Objects
     */

    getDataObject: {
        value: function (type, record, context) {
            return this.rootService.getDataObject(type, record, context);
        }
    },

    createDataObject: {
        value: function (type) {
            return this.rootService.createDataObject(type);
        }
    },

    /***************************************************************************
     * Fetching Data Objects
     */

    /**
     * Fetch data from this service for its parent. This method should not be
     * called directly by anyone other than this service's parent. Calls to the
     * root service should be made to initiate data fetches.
     *
     * Subclasses should override this method to fetch the data objects
     * requested by:
     *
     * 1. Fetching the raw records needed to generate the data object.
     *
     * 2. Adding those records to the specified stream with calls to
     * [addRawData()]{@link RawDataService#addRawData}.
     *
     * 3. Indicating that the fetching is done with a call to
     * [rawDataDone()]{@link RawDataService#rawDataDone}.
     *
     * This method must be asynchronous and return as soon as possible even if
     * it takes a while to obtain the raw records needed to generate the
     * requested data objects. The data objects can be generated and added to
     * the specified stream at any point after this method is called with calls
     * to [addRawData()]{@link RawDataService#addRawData} and
     * [rawDataDone()]{@link RawDataService#rawDataDone}.
     *
     * When offline, [isOffline]{@link RawDataService#isOffline} can be used in
     * conjunction with an [OfflineService]{@link RawDataService#offlineService}
     * to fetch the raw records used ot generate the requested data objects.
     *
     * @method
     * @argument {DataSelector} selector - Defines what data should be fetched.
     * @argument {DataStream} stream     - A stream to which the fetched data
     *                                     can be added. Unlike for the
     *                                     [superclass]{@link DataService#fetchData}
     *                                     implementation of this method this
     *                                     stream is required for this class.
     * @returns {?DataStream} - The stream to which the fetched data objects
     * were or will be added. An `undefined` or `null` value may be returned, in
     * which case the calling parent should assume the fetched data objects were
     * or will be added to the passed in stream.
     */
    fetchData: {
        value: function (selector, stream) {
            this.fetchRawData(stream);
            return stream;
        }
    },

    /***************************************************************************
     * Saving Changed Data Objects
     */

    /**
     * Subclasses should override this method to delete a data object.
     *
     * The default implementation calls the deprecated
     * [deleteRawData()]{@link RawDataService#deleteRawData} method, which does
     * nothing by default.
     *
     * @method
     * @argument {Object} object   - The object whose data should be deleted.
     * @returns {external:Promise} - A promise fulfilled when the object has
     * been deleted.
     */
    deleteDataObject: {
        value: function (object) {
            var record = {};
            this.mapObjectToRawData(object, record);
            return this.deleteRawData(record, object);
        }
    },

    /**
     * Subclasses should override this method to save a data object.
     *
     * The default implementation calls the deprecated
     * [saveRawData()]{@link RawDataService#saveRawData} method, which does
     * nothing by default.
     *
     * @method
     * @argument {Object} object   - The object whose data should be saved.
     * @returns {external:Promise} - A promise fulfilled when all of the data in
     * the changed object has been saved.
     */
    saveDataObject: {
        value: function (object) {
            var record = {};
            this.mapObjectToRawData(object, record);
            return this.saveRawData(record, object);
        }
    },

    saveDataChanges: {
        value: function () {
            return this.rootService.saveDataChanges();
        }
    },

    /***************************************************************************
     * Managing Data Object Property Values
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
     * Handling Offline
     */

    /*
     * Returns the [root service's offline status]{@link DataService#isOffline}.
     *
     * @type {boolean}
     */
    isOffline: {
        get: function () {
            return this.rootService.isOffline;
        }
    },

    /**
     * Called with all the data passed to
     * [addRawData()]{@link RawDataService#addRawData} to allow caching of that
     * data for offline use.
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
     * @argument {DataSelector} selector - Defines the raw data selected.
     * @argument {Object} records        - An array of objects whose properties'
     *                                     values hold the raw data.
     * @returns {external:Promise} - A promise fulfilled when the raw data has
     * been saved.
     */
    writeOfflineData: {
        value: function (selector, records) {
            // Subclasses should override this to do something useful.
            return this.nullPromise;
        }
    },

    /**
     * Subclasses that can benefit from [OfflineServices]{@link OfflineService}
     * should override this to create if necessary, cache, and return an
     * OfflineService configured for their needs.
     *
     * @type {OfflineService}
     */
    offlineService: {
        value: undefined
    },

    /***************************************************************************
     * Handling Raw Data
     */

    /**
     * Deprecated. Subclasses should override
     * [fetchData()]{@link RawDataService#fetchData} instead of this method.
     *
     * @deprecated
     * @method
     */
    fetchRawData: {
        value: function (stream) {
            this.rawDataDone(stream);
        }
    },

    /**
     * Deprecated. Subclasses should override
     * [saveDataObject()]{@link RawDataService#saveDataObject} instead of this
     * method.
     *
     * @deprecated
     * @method
     */
    saveRawData: {
        value: function (record, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    /**
     * Deprecated. Subclasses should override
     * [deleteDataObject()]{@link RawDataService#deleteDataObject} instead of
     * this method.
     *
     * @deprecated
     * @method
     */
    deleteRawData: {
        value: function (record, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    /**
     * To be called by [fetchData()]{@link RawDataService#fetchData} when raw
     * data records are received. This method should never be called directly.
     *
     * This method creates and registers the data objects that
     * will represent the raw records with repeated calls to
     * [getDataObject()]{@link DataService#getDataObject}, maps
     * the raw data to those objects with repeated calls to
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject},
     * and then adds those objects to the specified stream.
     *
     * Subclasses should not override this method and instead override their
     * [getDataObject()]{@link DataService#getDataObject} method, their
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject} method,
     * their [mapping]{@link RawDataService#mapping}'s
     * [mapRawDataToObject()]{@link RawDataMapping#mapRawDataToObject} method,
     * or several of these.
     *
     * @method
     * @argument {DataStream} stream   - The stream to which the data objects
     *                                   corresponding to the raw data should be
     *                                   added.
     * @argument {Array} records       - An array of objects whose properties'
     *                                   values hold the raw data. This array
     *                                   will be modified by this method.
     * @argument {?} context           - A value that will be passed to
     *                                   [getDataObject()]{@link DataMapping#getDataObject}
     *                                   and
     *                                   [mapRawDataToObject()]{@link DataMapping#mapRawDataToObject}
     *                                   if it is provided.
     */
    addRawData: {
        value: function (stream, records, context) {
            var offline, object, i, n;
            // Record fetched raw data for offline use if appropriate.
            offline = records && !this.isOffline && this._offlineRawData.get(stream);
            if (offline) {
                offline.push.apply(offline, records);
            } else if (records && !this.isOffline) {
                this._offlineRawData.set(stream, records.slice())
            }
            // Convert the raw data to appropriate data objects. The conversion
            // will be done in place to avoid creating any unnecessary array.
            for (i = 0, n = records && records.length; i < n; i += 1) {
                object = this.getDataObject(stream.selector.type, records[i], context);
                this.mapRawDataToObject(records[i], object, context);
                records[i] = object;
            }
            // Add the converted data to the stream.
            stream.addData(records);
        }
    },

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapRawDataToObject: {
     *         value: function (object, record) {
     *             object.firstName = record.GIVEN_NAME;
     *             object.lastName = record.FAMILY_NAME;
     *         }
     *     }
     *
     * Alternatively, subclasses can define a
     * [mapping]{@link DataService#mapping} to do this mapping.
     *
     * The default implementation of this method uses the service's mapping if
     * the service has one, and otherwise calls
     * [mapFromRawData()]{@link RawDataService#mapFromRawData], whose default
     * implementation does nothing.
     *
     * @todo Make this method overridable by type name with methods like
     * `mapRawDataToHazard()` and `mapRawDataToProduct()`.
     *
     * @method
     * @argument {Object} record - An object whose properties' values hold
     *                             the raw data.
     * @argument {Object} object - An object whose properties must be set or
     *                             modified to represent the raw data.
     * @argument {?} context     - A value that was passed in to the
     *                             [addRawData()]{@link RawDataService#addRawData}
     *                             call that invoked this method.
     */
    mapRawDataToObject: {
        value: function (record, object, context) {
            var keys, i, n;
            if (this.mapping) {
                this.mapping.mapRawDataToObject(record, object, context);
            } else if (record) {
                this.mapFromRawData(object, record, context);
            }
        }
    },

    /**
     * @todo Document.
     * @todo Make this method overridable by type name with methods like
     * `mapHazardToRawData()` and `mapProductToRawData()`.
     */
    mapObjectToRawData: {
        value: function (object, record) {
            this.mapToRawData(object, record);
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
            var offline = this._offlineRawData.get(stream);
            if (!offline) {
                stream.dataDone();
            } else {
                this._offlineRawData.delete(stream);
                this.writeOfflineData(stream.selector, offline).then(function () {
                    stream.dataDone();
                    return null;
                }).catch(function (e) {
                    console.error(e, e.stack);
                });
            }
        }
    },

    /**
     * Records in the process of being written to streams (before
     * [rawDataDone()]{@link RawDataService#rawDataDone} is called) and that
     * need to be stored for offline use.
     *
     * @private
     * @type {Object.<Stream, records>}
     */
    _offlineRawData: {
        get: function () {
            if (!this.__offlineRawData) {
                this.__offlineRawData = new WeakMap();
            }
            return this.__offlineRawData;
        }
    },

    __offlineRawData: {
        value: undefined
    },

    /***************************************************************************
     * Deprecated
     */

    /**
     * @todo Document deprecation in favor of
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject}
     */
    mapFromRawData: {
        value: function (object, record, context) {
            // Implemented by subclasses.
        }
    },

    /**
     * @todo Document deprecation in favor of
     * [mapObjectToRawData()]{@link RawDataService#mapObjectToRawData}
     */
    mapToRawData: {
        value: function (object, record) {
            // Implemented by subclasses.
        }
    }

});
