var Montage = require("montage").Montage,
    Promise = require("bluebird");

/**
 * Represents a persistent IndexedDB databases.
 *
 * @class
 * @extends external:Montage
 */
exports.IndexedDBDatabase = Montage.specialize(/** @lends IndexedDBDatabase.prototype */ {

    /***************************************************************************
     * Managing databases
     */

    _databaseVersion: {
        value: 1
    },

    _deleteDatabase: {
        value: function (databaseName) {
            var request = indexedDB.deleteDatabase(databaseName);
            return this._handleDatabaseRequest(request, "Delete database", function (event) {
                console.log("_deleteDatabase(): onsuccess.event =", event);
                return null;
            });
        }
    },

    _handleDatabaseRequest: {
        value: function (request, operation) {
            return new Promise(function (resolve, reject) {
                request.onsuccess = resolve;
                request.onerror = function (event) {
                    var error = new Error(operation + " error");
                    console.warn(error, event);
                    reject(error);
                };
            });
        }
    },

    _databaseUpgradeNeeded: {
        value: function (event) {
            // event.target.result.createObjectStore(storeName, {keyPath: "id"});
        }
    },

    _databaseBlocked: {
        value: function (event) {
            console.warn("Database blocked, event =", event);
        }
    },

    _databaseVersionChange: {
        value: function (event) {
            console.warn("Database version change, event =", event);
        }
    },

    /***************************************************************************
     * Managing stores
     */

    _openStore: {
        value: function (databaseName, storeName, mode) {
            var request = indexedDB.open(databaseName, this._databaseVersion);
            request.onupgradeneeded = this._databaseUpgradeNeeded.bind(this);
            request.onblocked = this._databaseBlocked.bind(this);
            request.onversionchange = this._databaseVersionChange.bind(this);
            return this._handleDatabaseRequest(request, "Open database").then(function (event) {
                return event.target.result.transaction(storeName, mode).objectStore(storeName);
            });
        }
    },

    _closeStore: {
        value: function (store) {
            store.transaction.db.close();
        }
    },

    /***************************************************************************
     * Managing data
     */

    _readAllDataFromStore: {
        value: function (databaseName, storeName) {
            var self = this;
            return this._openStore(databaseName, storeName, "readonly").then(function (store) {
                return self._handleDatabaseRequest(store.getAll(), "Read all from database");
            }).then(function (event) {
                self._closeStore(event.target.source);
                return event.target.result;
            });
        }
    },

    _readDataFromStore: {
        value: function (databaseName, storeName, id) {
            var self = this;
            return this._openStore(databaseName, "readonly").then(function (store) {
                return self._handleDatabaseRequest(store.get(id), "Read from database");
            }).then(function (event) {
                self._closeStore(event.target.source);
                return event.target.result;
            });
        }
    },

    _writeDataToStore: {
        value: function (databaseName, storeName, data) {
            var self = this;
            return this._openStore(databaseName, storeName, "readwrite").then(function (store) {
                return self._handleDatabaseRequest(store.put(data), "Write to database");
            }).then(function (event) {
                self._closeStore(event.target.source);
                return null;
            });
        }
    },

    _deleteDataFromStore: {
        value: function (databaseName, storeName, id) {
            var self = this;
            return this._openStore(databaseName, storeName, "readwrite").then(function (store) {
                return self._handleDatabaseRequest(store.delete(id), "Delete from database");
            }).then(function (event) {
                self._closeStore(event.target.source);
                return null;
            });
        }
    }

});
