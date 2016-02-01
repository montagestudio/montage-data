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
            this._registeredAuthorizationPanelsByModuleId = new Map;
            return this;
        }
    },
    delegate: {
        value: null
    },
    authorizationManagerPanel: {
        value: null
    },
    _registeredAuthorizationServicesByModuleId: {
        value: void 0
    },
    _registeredAuthorizationPanelsByModuleId: {
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
            var self = this;
            var authorizationPromise = new Promise(function(resolve,reject){
                var authorizationServicesModuleIds = aDataService.authorizationServices,
                iService, iServiceModuleId, i, countI,
                registeredAuthorizationServices = self._registeredAuthorizationServicesByModuleId,
                authorizationServices = [];

                for(i=0, countI = authorizationServicesModuleIds.length; i<countI; i++) {
                    iServiceModuleId = authorizationServicesModuleIds[i];
                    iService = registeredAuthorizationServices.get(iServiceModuleId);

                    //Looks like we don't have that service yet, we need to load it.
                    if(!iService) {
                        var iPromise = new Promise(function(resolve, reject) {
                            // TODO FIXME
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

                // TODO: Needs instantiation of services

                Promise.all(authorizationServices).bind(self).then(function(authorizationServices) {
                    // Now we have all the authorization DataServices, we're going to load their
                    // AuthenticationPanel:
                    var i, countI, iService, authorizationPanels = [], iAuthorizationPanel, iAuthorizationPanelModuleId;
                    for(i=0, countI = authorizationServices.length; i<countI; i++) {
                        iService = authorizationServices[i];
                        iAuthorizationPanelModuleId = iService.authorizationPanel;
                        iAuthorizationPanelModuleId = this.callDelegateMethod("authorizationManagerWillAuthorizeServiceWithPanel", this,iService,iAuthorizationPanelModuleId) || iAuthorizationPanelModuleId;
                        if(!iAuthorizationPanelModuleId) {
                            continue;
                        }
                        iAuthorizationPanel = this._registeredAuthorizationPanelsByModuleId.get(iAuthorizationPanelModuleId)
                        if(!iAuthorizationPanel) {
                            // Lookup if already created, else ....
                            var iPromise = mr.async(iAuthorizationPanelModuleId);
                            // var iPromise = mr.async(iAuthorizationPanel).then(function (exports) {
                            //         console.log("loaded ",iAuthorizationPanel,exports)
                            //                     });


                            authorizationPanels.push(iPromise);
                        }
                        else {
                            authorizationPanels.push(Promise.resolve(iAuthorizationPanel));
                        }

                    }
                    Promise.all(authorizationPanels).bind(this).then(function(authorizationPanelExports) {
                        console.log("loaded ",authorizationPanelExports);
                        var i, countI, iAuthorizationPanelExport, iAuthorizationPanel, authorizationPanels = [];
                        for(i=0, countI = authorizationPanelExports.length; i<countI; i++) {
                            iAuthorizationPanelExport = authorizationPanelExports[i];

                            //FIXME
                            //We need to be smarter about this as there could be multiple symbols on
                            //an exports, for now we take the first one.
                            for(var key in iAuthorizationPanelExport) {
                                iAuthorizationPanel = iAuthorizationPanelExport[key];
                                // We need to cache/lookup if we already have one like that.
                                authorizationPanels.push(new iAuthorizationPanel);
                                break;
                            }
                            console.log("iAuthorizationPanel ",iAuthorizationPanel);
                            // Now that we have the type, we need to:
                            // 1. instantiate it
                            // 2. Put it in an array
                            // 3. Pass it to the AuthorizationManagerPanel


                        }
                        // var iPromise = mr.async(iAuthorizationPanel).then(function (exports) {
                        //         console.log("loaded ",iAuthorizationPanel,exports)
                        //                     });
                        var self = this;
                        var authorizationManagerPanelPromise = new Promise(function(resolve, reject) {
                            if(!self.authorizationManagerPanel) {
                                var authorizationManagerPanelModuleId = "montage-data/ui/authorization-manager-panel.reel";

                                authorizationManagerPanelModuleId = self.callDelegateMethod("authorizationManagerWillLoadAuthorizationManagerPanel", self, authorizationManagerPanelModuleId) || authorizationManagerPanelModuleId;

                                mr.async(authorizationManagerPanelModuleId).bind(this).then(function (exports) {
                                        var AuthorizationManagerPanel = exports.AuthorizationManagerPanel;
                                        this.authorizationManagerPanel = new AuthorizationManagerPanel();
                                        console.log("this.authorizationManagerPanel is ",this.authorizationManagerPanel);
                                        this.authorizationManagerPanel.authorizationPanels = authorizationPanels;
                                        resolve(this.authorizationManagerPanel);
                                    },function(error) {
                                        console.log(error);
                                    });
                            }
                            else {
                                resolve(self.authorizationManagerPanel);
                            }
                        });
                        authorizationManagerPanelPromise.then(function(authorizationManagerPanel) {
                            console.log("authorizationManagerPanel:",authorizationManagerPanel);
                            // Show in Modal.
                            authorizationManagerPanel.runModal().then(function(authorization) {
                                resolve(authorization);
                            },
                            function(authorizatinError) {
                                reject(authorizatinError);
                            });


                        });

                    });

                });

            });


            //Now we need to loop on that, assess if they are instances or module-id
            //Then ask if they have an AuthorizationPanel.
            //And then once collected all, use the AuthorizationManagerPanel to
            //put them on screen via the modal panel.
            return authorizationPromise;
        }
    }
});

var authorizationManager = new AuthorizationManager;
exports.AuthorizationManager = authorizationManager;
