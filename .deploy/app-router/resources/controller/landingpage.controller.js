
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend(
        "animaladoption.animaladoption.controller.landingpage",
        {

            onBrowseAnimals: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("userDashboard");
            },

            onAdminDashboard: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("adminDashboard");
            }

        }
    );
});
