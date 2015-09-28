var DataService = require("logic/service/data-service").DataService,
    DataSelector = require("logic/service/data-selector").DataSelector,
    Map = require("collections/map"),
    Promise = require("bluebird");

/**
 * Provides utility methods for REST services.
 *
 * @class
 * @extends external:DataService
 */
exports.RestService = DataService.specialize(/** @lends RestService# */{

    getPropertyDataPromise: {
        value: function (name, criteria, object, prerequisites) {
            var self = this,
                promise = this._getPropertyDataPromises(name).get(object);
            if (!promise) {
                prerequisites = arguments.length > 4 ? Array.prototype.slice.call(arguments, 3) : prerequisites;
                this._getPropertyDataPromises(name).set(object, promise = new Promise(function (resolve, reject) {
                    // Get prerequisite property values if necessary and then
                    // defer the fetch until the next event loop to allow
                    // fetches for similar data to be combined.
                    var resolution = prerequisites ? DataService.mainService.getObjectData(object, prerequisites) : null;
                    window.setTimeout(function () { resolve(resolution); }, 0);
                }).then(function () {
                    // Fetch the data.
                    var selector, name;
                    selector = new DataSelector();
                    selector.type = self.type;
                    for (name in criteria) {
                        selector.criteria[name] = criteria[name];
                    }
                    return DataService.mainService.fetchData(selector);
                }).then(function (data) {
                    // Allow subsequent fetches.
                    self._getPropertyDataPromises(name).delete(object);
                    return data;
                }));

            }
            return promise || DataService.NULL_PROMISE;
        }
    },

    _getPropertyDataPromises: {
        value: function (name) {
            var promises = this._propertyDataPromises && this._propertyDataPromises[name];
            if (!promises) {
                this._propertyDataPromises = this._propertyDataPromises || {};
                this._propertyDataPromises[name] = promises = new Map();
            }
            return promises;
        }
    },

    getDataFetchPromise: {
        value: function (url) {
            return new Promise(function (resolve, reject) {
                // Fetch the requested data.
                if (url) {
                    request = new XMLHttpRequest();
                    request.onload = function () { resolve(request); };
                    request.open("GET", url, true);
                    request.withCredentials = true;
                    request.send();
                } else {
                    reject(new Error("Undefined URL"));
                }
            }).then(function (request) {
                // The response status can be 0 initially even for successful
                // requests, so defer the processing of this response until the
                // next event loop so the status has time to be set correctly.
                return new Promise(function (resolve, reject) {
                    window.setTimeout(function () { resolve(request); }, 0);
                });
            }).then(function (request) {
                // For now, just return null for error status responses.
                var response = request.responseText;
                if (request.status >= 300) {
                    console.log(new Error("Status " + request.status + " for " + url));
                    response = null;
                }
                return response;
            });
        }
    },

    parseJson: {
        value: function (json) {
            var parsed;
            try {
                parsed = json && JSON.parse(json);
            } catch (error) {
                parsed = null;
            }
            return parsed;
        }
    }
});
