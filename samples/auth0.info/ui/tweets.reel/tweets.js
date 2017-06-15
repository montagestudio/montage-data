/**
 * @module ui/main.reel
 */
var Component = require("montage/ui/component").Component,
    DataService = require("montage-data/logic/service/data-service").DataService,
    DataSelector = require("montage-data/logic/service/data-selector").DataSelector,
    Criteria = require("montage/core/criteria").Criteria,
    TwitterService = require('logic/service/twitter').TwitterService,
    Tweet = require('logic/model/tweet').Tweet;

/**
 * @class Tweet
 * @extends Component
 */
exports.Tweets = Component.specialize(/** @lends Tweet# */ {

    constructor: {
        value: function Main() {
            var that = this;

            this.super();

            this.initServices().then(function () {
                that.loadTweets();  
            });
        }
    },
    
    initServices: {
        value: function (){

            this.mainService = mainService = new DataService();
            mainService.isUniquing = true;
            
            var auth0ConnectionDescriptorPromise;
            if(location.hostname.indexOf("local") !== -1) {
                auth0ConnectionDescriptorPromise = require.async("logic/service/auth0-local-connection.json");
            } else {
                auth0ConnectionDescriptorPromise = require.async("logic/service/auth0-prod-connection.json");
            }

            return auth0ConnectionDescriptorPromise.then(function (authorizationDescriptor) {
                var twitterService = new TwitterService();
                twitterService.authorizationDescriptor = authorizationDescriptor;
                mainService.addChildService(twitterService);
            });
        },
    },

    authorizationManagerWillInstantiateAuthorizationPanelForService: {
        value: function(authorizationManager, authorizationPanel, authorizationService) {
            debugger;
            return authorizationPanel;
        }
    },


    authorizationManagerDidAuthorizeService: {
        value: function(authorizationManager, dataService) {

        }
    },

    loadTweets: {
        value: function () {
            var that = this;

            var dataExpression = "";
            var dataParameters = {};
            var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);
            
            var dataType = Tweet.TYPE;
            var dataQuery = DataSelector.withTypeAndCriteria(dataType, dataCriteria);

            that.mainService.fetchData(dataQuery).then(function (tweets) {
                that.tweets = tweets;
            });
        }
    },

    tweets: {
        value: null
    }
});