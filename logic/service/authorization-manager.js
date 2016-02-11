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
            this._dataServicesForAuthorizationPanels = new Map;
            this._pendingAuthorizationServices = [];
            return this;
        }
    },
    delegate: {
        value: null
    },
    pendingAuthorizationServices: {
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
    /**
     * Takes care of obtaining authorization for a DataService. Returns a promis of Authorization
     *
     * TODO:
     * 1. Handle repeated calls: if a DataService authorizes on-demand it's likelily
     * it would come from fetching data. Multiple independent fetches could trigger repeated
     * attempts to authorize: The promise should be cached and returned when pending.
     *
     * TODO:
     * 2. A service could require mandatory authorization from 2 dataService, right now it's implemented
     * in a way that we extect user to make a choice in one of aDataService.authorizationServices,
     * not a combination of. We need another sturcture to represent that.
     *
     * TODO
     * right now, Promises for existing objects are resolved, meaning that the loops could see different
     * types of objects coming in. Existing objects could be just added to array filled after the Promise.all().then..
     *
     * @method
     */

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
                        var iPromise = mr.async(iServiceModuleId);
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

                            authorizationPanels.push(iPromise);
                            this._dataServicesForAuthorizationPanels.set(iAuthorizationPanelModuleId,iService);
                        }
                        else {
                            authorizationPanels.push(Promise.resolve(iAuthorizationPanel));
                            this._dataServicesForAuthorizationPanels.set(iAuthorizationPanel,iService);

                        }

                    }
                    Promise.all(authorizationPanels).bind(this).then(function(authorizationPanelExports) {
                        console.log("loaded ",authorizationPanelExports);
                        var i,
                            countI,
                            iAuthorizationPanelExport,
                            iAuthorizationPanel,
                            iAuthorizationPanelConstructor,
                            authorizationPanels = [],
                            iAuthorizationPanelInfo
                            iService;

                        for(i=0, countI = authorizationPanelExports.length; i<countI; i++) {
                            iAuthorizationPanelExport = authorizationPanelExports[i];

                            //FIXME
                            //We need to be smarter about this as there could be multiple symbols on
                            //an exports, for now we take the first one.
                            for(var key in iAuthorizationPanelExport) {
                                iAuthorizationPanelConstructor = iAuthorizationPanelExport[key];
                                iAuthorizationPanel = new iAuthorizationPanelConstructor;
                                var iAuthorizationPanelInfo = Montage.getInfoForObject(iAuthorizationPanel);
                                // WEAKNESS: The FreeNAS service returned a moduleId of "/ui/sign-in.reel", which worked to load
                                // but the info conained "ui/sign-in.reel", causing the lookup to fail. We need to be careful and
                                // investigate a possible solution.
                                iService = this._dataServicesForAuthorizationPanels.get(iAuthorizationPanelInfo.moduleId);
                                this._dataServicesForAuthorizationPanels.set(iAuthorizationPanel,iService);
                                iAuthorizationPanel.dataService = iService;
                                // We need to cache/lookup if we already have one like that.
                                authorizationPanels.push(iAuthorizationPanel);
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

                                mr.async(authorizationManagerPanelModuleId).bind(self).then(function (exports) {
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
