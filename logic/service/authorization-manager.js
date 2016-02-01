var Montage = require("montage").Montage,
    Promise = require("montage/core/promise").Promise,

    // Set = require("collections/set");
    Map = require("collections/map");


    if (typeof window !== "undefined") { // client-side
        Map = window.Map || Map;
    }

/**
 * Helps coordinates the needs for DataServices to get the authorization they
 * need to access data. It is meant to be a singleton, so the constructor
 * enforces that.
 *
 * @class
 * @extends external:Montage
 */
AuthorizationManager = Montage.specialize(/** @lends AuthorizationManager.prototype */{

    constructor: {
        value: function () {

            this._registeredAuthorizationServicesByModuleId = new Map;
            return this;
        }
    },
    delegate: {
        value: null
    },
    _registeredAuthorizationServicesByModuleId: {
        value: void 0
    },
    registerAuthorizationService: {
        value: function(aDataService) {
            var info = Montage.getInfoForObject(aDataService);
            this._registeredAuthorizationServicesByModuleId.set(info.moduleId,aDataService);

        }
    },
    authorizeService : {
        value: function(aDataService) {
            var aPromise = Promise.resolve(),
                authorizationServicesModuleIds = aDataService.authorizationServices,
                iService, iServiceModuleId, i, countI,
                registeredAuthorizationServices = this._registeredAuthorizationServicesByModuleId,
                authorizationServices = [];

                for(i=0, countI = authorizationServicesModuleIds.length; i<countI; i++) {
                    iServiceModuleId = authorizationServicesModuleIds[i];
                    iService = registeredAuthorizationServices.get(iServiceModuleId);

                    //Looks like we don't have that service yet, we need to load it.
                    if(!iService) {
                        var iPromise = new Promise(function(resolve, reject) {

                        });
                        authorizationServices[i] = iPromise;

                    }
                    else {
                        authorizationServices[i] = Promise.resolve(iService);
                    }
                }

                // TODO:
                // This should work for one DataService but if multiple services ask for
                // authorization, this will require more coordination among the multiple calls
                Promise.all(authorizationServices).bind(this).then(function(authorizationServices) {
                    //Now we have all the authorization DataServices, we're going to load their
                    //AuthenticationPanel:
                    var i, countI, iService, authorizationPanels = [], iAuthorizationPanel;
                    for(i=0, countI = authorizationServices.length; i<countI; i++) {
                        iService = authorizationServices[i];
                        iAuthorizationPanel = iService.authorizationPanel;
                        iAuthorizationPanel = this.callDelegateMethod("authorizationManagerWillAuthorizeServiceWithPanel", this,iService,iAuthorizationPanel) || iAuthorizationPanel;
                        if(iAuthorizationPanel) {
                            //Lookup if already created, else ....
                            var iPromise = mr.async(iAuthorizationPanel);
                            // var iPromise = mr.async(iAuthorizationPanel).then(function (exports) {
                            //         console.log("loaded ",iAuthorizationPanel,exports)
                            //                     });


                            authorizationPanels.push(iPromise);
                        }
                    }
                    Promise.all(authorizationPanels).bind(this).then(function(authorizationPanelExports) {
                        console.log("loaded ",authorizationPanelExports);
                        var i, countI, iAuthorizationPanelExport, iAuthorizationPanel;
                        for(i=0, countI = authorizationPanelExports.length; i<countI; i++) {
                            iAuthorizationPanelExport = authorizationPanelExports[i];

                            //FIXME
                            //We need to be smarter about this as there could be multiple symbols on
                            //an exports, for now we take the first one.
                            for(var key in iAuthorizationPanelExport) {
                                iAuthorizationPanel = iAuthorizationPanelExport[key];
                                break;
                            }
                            console.log("iAuthorizationPanel ",iAuthorizationPanel);

                        }

                    });

                    console.log("here");
                });



            //Now we need to loop on that, assess if they are instances or module-id
            //Then ask if they have an AuthorizationPanel.
            //And then once collected all, use the AuthorizationManagerPanel to
            //put them on screen via the modal panel.



            return aPromise;
        }
    }
});

var authorizationManager = new AuthorizationManager;
exports.AuthorizationManager = authorizationManager;
