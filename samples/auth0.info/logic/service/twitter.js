var HttpService = require("montage-data/logic/service/http-service").HttpService,
    DataService = require("montage-data/logic/service/data-service").DataService,
    DataSelector = require("montage-data/logic/service/data-selector").DataSelector;

/**
 * Provides data for applications.
 *
 * @class
 * @link https://dev.twitter.com/rest/
 * @extends external:DataService
 */
 exports.TwitterService = HttpService.specialize(/** @lends TwitterService.prototype */ {
        
    /*
    authorizationPolicy: {
        value: DataService.AuthorizationPolicyType.UpfrontAuthorizationPolicy
    },
    providesAuthorization: {
        value: false
    },

    authorizationServices: {
        value: ["montage-auth0/authorization-service"]
    },

    authorizationDescriptor: {
        value: undefined
    },

    authorizationManagerWillAuthorizeWithService: {
        value:function( authorizationManager, authorizationService) {
            authorizationService.connectionDescriptor = this.authorizationDescriptor;
        }
    },
    */

    //
    //
    //

    constructor: {
        value: function TwitterService() {
            this.super();
        }
    },

    //
    //
    //

    ENDPOINT: {
        value: 'https://api.twitter.com/1.1'
    },

    DUMMY: {
        value: true
    },

    fetchRawData: {
        value: function (stream) {

            var request,
                that = this,
                criteria = stream.selector.criteria;

            if (that.DUMMY) {
                request = require.async('./twitter-statuses-home_timeline.json');
            } else {
                request = that.fetchHttpRawData(that.ENDPOINT + "/statuses/home_timeline.json", false);
            }

            return request.then(function (data) {
                if (data) {
                    that.addRawData(stream, data, criteria);
                    that.rawDataDone(stream);
                }
            });
        }
    },

    mapFromRawData: {
        value: function (object, rawData, criteria) {
            object.id = rawData.id;
            object.text = rawData.text;
            object.created_at = rawData.created_at;
            object.user = {
                name: rawData.user.name
            };
        }
    }
});