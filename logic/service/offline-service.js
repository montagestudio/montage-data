var DataService = require("logic/service/data-service").DataService,
    DataObjectDescriptor = require("logic/model/data-object-descriptor").DataObjectDescriptor;

/**
 * Saves data for offline use and provides it when offline.
 *
 * @class
 * @extends external:DataService
 */
exports.OfflineService = DataService.specialize(/** @lends OfflineService.prototype */ {

    /***************************************************************************
     * Properties
     */

    /*
     * @type {Array.<DataObjectDescriptor>}
     */
    types: {
        value: [DataObjectDescriptor.ALL_TYPES]
    },

    /***************************************************************************
     * Handling offline
     */

    /*
     * @type {boolean}
     */
    worksOffline: {
        value: true
    },

    /*
     * @method
     */
    isOfflineDidChange: {
        value: function (isOffline) {
            if (!isOffline) {
                this._applyJournaledChanges();
            }
        }
    },

    /***************************************************************************
     * Managing data objects
     */

    /**
     * @method
     */
    saveDataObject: {
        value: function (object) {
            this._journal.push({action: DataService.prototype.saveDataObject, object: object});
            return this.nullPromise;
        }
    },

    /**
     * @method
     */
    deleteDataObject: {
        value: function (object) {
            this._journal.push({action: DataService.prototype.deleteDataObject, object: object});
            return this.nullPromise;
        }
    },

    /**
     * @private
     * @type {Array.<Object>}
     */
    _journal: {
        get: function () {
            if (!this.__journal) {
                this.__journal = [];
            }
            return this.__journal;
        }
    },

    _applyJournaledChanges: {
        value: function () {
            var self = this,
                entry = !this.isOffline && this._journal.length && this._journal[0];
            if (entry) {
                this._journal.splice(0, 1);
                entry.action.call(this.rootService, entry.object).then(function () {
                    self._applyJournaledChanges();
                });
            }
        }
    },

    /***************************************************************************
     * Fetching data objects
     */

    /*
     * @method
     */
    fetchData: {
        value: function (selector, stream) {
            // console.log("fetch " + selector.type.typeName, selector.criteria);
            stream.dataDone();
        }
    },

    /*
     * @method
     */
    didFetchData: {
        value: function (stream) {
            // console.log("didFetch " + stream.selector.type.typeName, stream.selector.criteria, stream.data);
        }
    }

});
