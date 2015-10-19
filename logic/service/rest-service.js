var DataService = require("logic/service/data-service").DataService,
    DataSelector = require("logic/service/data-selector").DataSelector,
    Enumeration = require("logic/model/enumeration").Enumeration,
    Map = require("collections/map"),
    Promise = require("bluebird");

/**
 * Provides utility methods for REST services.
 *
 * @class
 * @extends external:DataService
 */
exports.RestService = DataService.specialize(/** @lends RestService.prototype */ {

    /***************************************************************************
     * Constants
     */

    FORM_URL_ENCODED_CONTENT_TYPE_HEADER: {
        value: {"Content-type": "application/x-www-form-urlencoded"}
    },

    /***************************************************************************
     * Fetching property data
     */

    fetchPropertyData: {
        value: function (type, object, propertyName, prerequisitePropertyNames, criteria) {
            var self, selector, prerequisites;
            // Create and cache a new fetch promise if necessary.
            if (!this._getCachedFetchPromise(object, propertyName)) {
                // Parse arguments.
                selector = DataSelector.withTypeAndCriteria(type, arguments[arguments.length - 1]);
                prerequisites = prerequisitePropertyNames;
                if (arguments.length < 5 || !prerequisites) {
                    prerequisites = [];
                } else if (!Array.isArray(prerequisites)) {
                    prerequisites = Array.prototype.slice.call(arguments, 3, -1);
                }
                // Create and cache a new fetch promise
                self = this;
                this._setCachedFetchPromise(object, propertyName, this.nullPromise.then(function () {
                    // First get prerequisite data if necessary...
                    return self.rootService.getObjectData(object, prerequisites);
                }).then(function () {
                    // Then fetch the requested data...
                    return self.rootService.fetchData(selector);
                }).then(function (data) {
                    // Then wait until the next event loop to ensure only one
                    // fetch is dispatched per event loop (caching ensures all
                    // subsequent requests for the same fetch promise within the
                    // same event loop will return the same promise)...
                    return self._makeEventLoopPromise(data);
                }).then(function (data) {
                    // Then removes the promise from the cache so subsequent
                    // requests for this fetch promise generate new fetches.
                    self._setCachedFetchPromise(object, propertyName, null);
                    return data;
                }));

            }
            // Return the created or cached fetch promise.
            return this._getCachedFetchPromise(object, propertyName);
        }
    },

    _getCachedFetchPromise: {
        value: function (object, name) {
            this._cachedFetchPromises = this._cachedFetchPromises || {};
            this._cachedFetchPromises[name] = this._cachedFetchPromises[name] || new Map();
            return this._cachedFetchPromises[name].get(object);
        }
    },

    _setCachedFetchPromise: {
        value: function (object, name, promise) {
            this._cachedFetchPromises = this._cachedFetchPromises || {};
            this._cachedFetchPromises[name] = this._cachedFetchPromises[name] || new Map();
            this._cachedFetchPromises[name].set(object, promise);
        }
    },

    /***************************************************************************
     * Fetching by URL
     */

    fetchRestData: {
        value: function (types, url, headers, body) {
            return this._fetchRestData(this._parseFetchRestDataArguments(arguments), true);
        }
    },

    fetchRestDataWithoutCredentials: {
        value: function (types, url, headers, body) {
            return this._fetchRestData(this._parseFetchRestDataArguments(arguments), false);
        }
    },

    _fetchRestData: {
        value: function (arguments, useCredentials) {
            var self = this,
                types = arguments.types,
                url = arguments.url,
                headers = arguments.headers,
                body = arguments.body;
            return new Promise(function (resolve, reject) {
                var request, name;
                // Fetch the requested raw data.
                // TODO: Reject the promise instead of returning null on error.
                if (url) {
                    request = new XMLHttpRequest();
                    request.onload = function () { resolve(request); };
                    request.open(body ? "POST" : "GET", url, true);
                    for (name in headers) {
                        request.setRequestHeader(name, headers[name]);
                    }
                    request.withCredentials = useCredentials;
                    request.send(body);
                } else {
                    console.warn(new Error("Undefined REST URL"));
                    resolve(null);
                }
            }).then(function (request) {
                // The response status can be 0 initially even for successful
                // requests, so defer the processing of this response until the
                // next event loop to give the status time to be set correctly.
                return self._makeEventLoopPromise(request);
            }).then(function (request) {
                // Log a warning and return null for error status responses.
                // TODO: Return a rejected promise instead of null on error.
                if (request && request.status >= 300) {
                    console.warn(new Error("Status " + request.status + " received for REST URL " + url));
                    request = null;
                }
                return request;
            }).then(function (request) {
                // Parse the request response according to the requested type.
                // TODO: Support multiple alternate types.
                return request && types[0].parseResponse(request, url);
            });
        }
    },

    _parseFetchRestDataArguments: {
        value: function (arguments) {
            var types, start, i, n;
            // The type array is the first argument if that's an array, or an
            // array containing the first argument and all following ones that
            // are RestService DataTypes if there are any, or an empty array.
            types = Array.isArray(arguments[0]) && arguments[0];
            for (i = 0, n = arguments.length; !types; i += 1) {
                if (i === n || !arguments[i] || !(arguments[i] instanceof exports.RestService.DataType)) {
                    types = Array.prototype.slice.call(arguments, 0, i);
                    start = i - 1;
                }
            }
            // The remaining argument values come from the remaining arguments.
            return {
                types: types.length ? types : [this.constructor.DataType.JSON],
                url: arguments[start + 1 || 0],
                headers: arguments[start + 2 || 1] || {},
                body: arguments[start + 3 || 2]
            };
        }
    },

    _makeEventLoopPromise: {
        value: function (value) {
            return new Promise(function (resolve, reject) {
                window.setTimeout(function () {
                    resolve(value);
                }, 0);
            });
        }
    }

}, /** @lends RestService */ {

    /***************************************************************************
     * Types
     */

    DataType: {
        get: Enumeration.getterFor("_DataType", {

            BINARY: [{
                // TO DO.
            }],

            JSON: [{
                parseResponse: {
                    value: function (request, url) {
                        var text = request && request.responseText,
                            data = null;
                        if (text) {
                            try {
                                data = text && JSON.parse(text);
                            } catch (error) {
                                console.warn(new Error("Can't parse JSON received for REST URL " + url));
                                console.warn("Response text:", text);
                            }
                        } else if (request) {
                            console.warn(new Error("No JSON received for REST URL " + url));
                        }
                        return data;
                    }
                }
            }],

            JSONP: [{
                parseResponse: {
                    value: function (request, url) {
                        var text = request && request.responseText,
                            start = text && text.indexOf("(") + 1;
                            end = text && text.length && text.charAt(text.length - 1) === ")" && text.length - 1;
                            data = null;
                        if (start && end) {
                            try {
                                data = text && JSON.parse(text.slice(start, end));
                            } catch (error) {
                                console.warn(new Error("Can't parse JSONP received for REST URL " + url));
                                console.warn("Response text:", text);
                            }
                        } else if (text) {
                            console.warn(new Error("Can't parse JSONP received for REST URL " + url));
                            console.warn("Response text:", text);
                        } else if (request) {
                            console.warn(new Error("No JSONP received for REST URL " + url));
                        }
                        return data;
                    }
                }
            }],

            TEXT: [{
                // TO DO.
            }],

            XML: [{
                // TO DO.
            }]

        })
    }

});
