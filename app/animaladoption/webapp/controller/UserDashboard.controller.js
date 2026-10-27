sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Title",
    "sap/m/Text",
    "sap/m/Image",
    "sap/m/Button",
    "sap/m/ObjectStatus",
    "sap/ui/core/Icon",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/TextArea",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer"
], function (
    Controller, JSONModel, MessageBox, MessageToast, VBox, HBox, Title,
    Text, Image, Button, ObjectStatus, Icon, Dialog, Label, TextArea,
    Toolbar, ToolbarSpacer
) {
    "use strict";

    var SERVICE = "/odata/v4/user/";

    var PLACEHOLDER_IMAGE =
        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&h=450&q=80";

    return Controller.extend(
        "animaladoption.animaladoption.controller.UserDashboard", {

        onInit: function () {
            this._section = "dashboard";
            this._animals = [];
            this._allAnimals = [];
            this._applications = [];
            this._adoptions = [];
            this._profile = {};

            this.getView().setModel(new JSONModel({
                section: "dashboard",
                fullName: "Animal Lover",
                welcomeTitle: "Welcome to your adoption journey",
                initials: "AL",
                totalApplications: 0,
                pendingApplications: 0,
                approvedApplications: 0,
                totalAdoptions: 0,
                metrics: { totalApplications: 0, pendingApplications: 0, approvedApplications: 0, totalAdoptions: 0, availableAnimals: 0 },
                animals: [],
                featuredAnimals: [],
                applications: [],
                recentApplications: [],
                adoptions: [],
                profile: {
                    firstName: "",
                    lastName: "",
                    email: "",
                    phoneNumber: ""
                }
            }), "userView");

            this._showSection("dashboard");
            this._loadAll();
        },

        _ensureUserId: function () {
            // User identity is resolved securely by the authenticated CAP backend.
            return true;
        },

        _request: async function (url, options) {
            options = options || {};
            options.headers = Object.assign({
                "Accept": "application/json"
            }, options.headers || {});

            if (options.body) {
                options.headers["Content-Type"] = "application/json";
            }

            options.credentials = "same-origin";

            var response = await fetch(url, options);

            if (!response.ok) {
                var message = "HTTP " + response.status;
                try {
                    var body = await response.json();
                    if (body.error && body.error.message) {
                        message = typeof body.error.message === "string"
                            ? body.error.message
                            : (body.error.message.value || message);
                    }
                } catch (e) {
                    // Keep HTTP status message.
                }
                throw new Error(message);
            }

            if (response.status === 204) {
                return null;
            }

            var contentType = response.headers.get("content-type") || "";
            return contentType.indexOf("application/json") >= 0
                ? response.json()
                : null;
        },

        _action: async function (name, data) {
            return this._request(SERVICE + name, {
                method: "POST",
                body: JSON.stringify(data || {})
            });
        },

        _arrayFromResult: function (result) {
            if (Array.isArray(result)) {
                return result;
            }
            if (result && Array.isArray(result.value)) {
                return result.value;
            }
            if (result && result.value && Array.isArray(result.value.value)) {
                return result.value.value;
            }
            return [];
        },

        _loadAll: async function () {
            if (!this._ensureUserId()) {
                return;
            }

            try {
                var results = await Promise.all([
                    this._request(SERVICE + "Animals?$top=500"),
                    this._action("getCurrentUser", {}),
                    this._action("getUserApplications", {}),
                    this._action("getUserAdoptions", {})
                ]);

                this._allAnimals = (results[0] && results[0].value) || [];
                this._animals = this._allAnimals.filter(function (animal) {
                    return animal.status === "AVAILABLE";
                });
                this._profile = (results[1] && results[1].value) || results[1] || {};
                this._applications = this._arrayFromResult(results[2]);
                this._adoptions = this._arrayFromResult(results[3]);

                await this._loadAnimalDetailsForRecords();
                this._refreshViewModel();
                this._renderFeaturedAnimals();
                this._renderAnimalCards(this._animals);
                this._renderAdoptionCards();
                this._renderDashboardAdoptions();
                this._renderApplicationCards();
            } catch (error) {
                console.error("User dashboard load failed:", error);
                MessageBox.error(
                    "Could not load your dashboard.\n\n" + error.message +
                    "\n\nCheck that you are signed in and that your login email/authId matches an ACTIVE record in the Users table."
                );
            }
        },

        _loadAnimalDetailsForRecords: async function () {
            var animalIds = {};
            this._applications.forEach(function (application) {
                if (application.animal_ID) {
                    animalIds[application.animal_ID] = true;
                }
            });
            this._adoptions.forEach(function (adoption) {
                if (adoption.animal_ID) {
                    animalIds[adoption.animal_ID] = true;
                }
            });

            var ids = Object.keys(animalIds);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                var found = this._allAnimals.find(function (animal) {
                    return animal.ID === id;
                });
                if (found) {
                    continue;
                }
                try {
                    var result = await this._request(
                        SERVICE + "Animals(" + encodeURIComponent(id) + ")"
                    );
                    if (result && result.ID) {
                        this._allAnimals.push(result);
                        if (result.status === "AVAILABLE") { this._animals.push(result); }
                    }
                } catch (error) {
                    // Records may reference animals that are no longer available.
                    console.warn("Could not load animal details:", id, error.message);
                }
            }
        },

        _refreshViewModel: function () {
            var profile = this._profile || {};
            var firstName = profile.firstName || "";
            var lastName = profile.lastName || "";
            var fullName = [firstName, lastName].filter(Boolean).join(" ") || "Animal Lover";

            var pending = this._applications.filter(function (application) {
                return ["SUBMITTED", "UNDER_REVIEW"].indexOf(application.status) >= 0;
            }).length;

            var approved = this._applications.filter(function (application) {
                return application.status === "APPROVED";
            }).length;

            var applicationRows = this._applications.map(function (application) {
                var animal = this._animalById(application.animal_ID);
                var status = application.status || "UNKNOWN";
                var progress = 20;
                if (status === "UNDER_REVIEW") { progress = 55; }
                if (status === "APPROVED") { progress = 100; }
                if (status === "REJECTED" || status === "WITHDRAWN") { progress = 100; }

                return Object.assign({}, application, {
                    animalName: animal ? (animal.name || "Animal") : "Animal",
                    animalPhoto: animal && animal.photo ? animal.photo : PLACEHOLDER_IMAGE,
                    animalDescription: animal
                        ? [animal.breed, animal.species, animal.age !== null && animal.age !== undefined ? animal.age + " years" : ""].filter(Boolean).join(" · ")
                        : "Animal details",
                    applicationIdText: "Application ID: " + (application.ID || ""),
                    reasonText: application.reasonForAdoption || "No reason provided.",
                    applicationDate: this._formatDate(application.applicationDate),
                    statusText: status.replace(/_/g, " "),
                    statusState: this._statusState(status),
                    canWithdraw: status === "SUBMITTED",
                    progress: progress,
                    progressText: this._progressText(status),
                    progressState: status === "REJECTED" ? "Error" : (status === "APPROVED" ? "Success" : "Information")
                });
            }, this).sort(function (a, b) {
                return String(b.applicationDate).localeCompare(String(a.applicationDate));
            });

            var recentApplications = applicationRows.slice(0, 4).map(function (row) {
                return {
                    animalName: row.animalName,
                    applicationDate: row.applicationDate,
                    statusText: row.statusText,
                    statusState: row.statusState
                };
            });

            var adoptionRows = this._adoptions.map(function (adoption) {
                var animal = this._animalById(adoption.animal_ID);
                return Object.assign({}, adoption, {
                    animalName: animal ? (animal.name || "Animal") : "Animal",
                    animalPhoto: animal && animal.photo ? animal.photo : PLACEHOLDER_IMAGE,
                    animalDescription: animal
                        ? [animal.breed, animal.species, animal.age !== null && animal.age !== undefined ? animal.age + " years" : ""].filter(Boolean).join(" · ")
                        : "Your adopted companion",
                    adoptionDateText: this._formatDate(adoption.adoptionDate),
                    statusText: (adoption.status || "IN_PROGRESS").replace(/_/g, " ")
                });
            }, this);

            var model = this.getView().getModel("userView");
            model.setProperty("/fullName", fullName);
            model.setProperty("/welcomeTitle", "Welcome back, " + (firstName || "animal lover"));
            model.setProperty("/initials", ((firstName.charAt(0) || "A") + (lastName.charAt(0) || "L")).toUpperCase());
            model.setProperty("/totalApplications", this._applications.length);
            model.setProperty("/pendingApplications", pending);
            model.setProperty("/approvedApplications", approved);
            model.setProperty("/totalAdoptions", this._adoptions.length);
            model.setProperty("/metrics", {
                totalApplications: this._applications.length,
                pendingApplications: pending,
                approvedApplications: approved,
                totalAdoptions: this._adoptions.length,
                availableAnimals: this._animals.length
            });
            model.setProperty("/applications", applicationRows);
            model.setProperty("/recentApplications", recentApplications);
            model.setProperty("/adoptions", adoptionRows);
            model.setProperty("/profile", {
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                email: profile.email || "",
                phoneNumber: profile.phoneNumber || ""
            });
        },

        _animalById: function (id) {
            return (this._allAnimals || this._animals).find(function (animal) {
                return animal.ID === id;
            }) || this._animals.find(function (animal) { return animal.ID === id; }) || null;
        },

        _formatDate: function (value) {
            if (!value) {
                return "Not specified";
            }
            var date = new Date(value);
            if (isNaN(date.getTime())) {
                return String(value).substring(0, 10);
            }
            return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        },

        _statusState: function (status) {
            if (status === "APPROVED" || status === "COMPLETED") { return "Success"; }
            if (status === "REJECTED" || status === "CANCELLED") { return "Error"; }
            if (status === "WITHDRAWN") { return "None"; }
            if (status === "UNDER_REVIEW") { return "Information"; }
            return "Warning";
        },

        _progressText: function (status) {
            var labels = {
                SUBMITTED: "Application submitted",
                UNDER_REVIEW: "Shelter review in progress",
                APPROVED: "Application approved",
                REJECTED: "Application not approved",
                WITHDRAWN: "Application withdrawn"
            };
            return labels[status] || "Application status";
        },

        _showSection: function (section) {
            this._section = section;
            var model = this.getView().getModel("userView");
            model.setProperty("/section", section);

            var sections = [
                ["dashboard", "userHomeSection"],
                ["animals", "userAnimalsSection"],
                ["applications", "userApplicationsSection"],
                ["adoptions", "userAdoptionsSection"],
                ["profile", "userProfileSection"]
            ];

            sections.forEach(function (entry) {
                this.byId(entry[1]).setVisible(entry[0] === section);
            }, this);

            if (section === "animals") {
                this._renderAnimalCards(this._animals);
            }
        },

        onShowDashboard: function () {
            this._showSection("dashboard");
            this._loadAll();
        },

        onShowAnimals: function () {
            this._showSection("animals");
            this.onLoadAnimals();
        },

        onShowApplications: function () {
            this._showSection("applications");
            this._loadAll();
        },

        onShowAdoptions: function () {
            this._showSection("adoptions");
            this._loadAll();
        },

        onShowProfile: function () {
            this._showSection("profile");
        },

        onToggleNavigation: function () {
            var nav = this.byId("userSideNavigation");
            nav.setVisible(!nav.getVisible());
        },

        onRefresh: function () {
            this._loadAll();
        },

        onLoadAnimals: async function () {
            try {
                var result = await this._request(
                    SERVICE + "Animals?$filter=status%20eq%20'AVAILABLE'&$top=200"
                );
                this._animals = (result && result.value) || [];
                this._allAnimals = (this._allAnimals || []).filter(function (animal) {
                    return animal.status !== "AVAILABLE";
                }).concat(this._animals);
                this._refreshViewModel();
                this._renderAnimalCards(this._animals);
                this._renderFeaturedAnimals();
                this._renderDashboardAdoptions();
            } catch (error) {
                MessageBox.error("Could not load available animals:\n" + error.message);
            }
        },

        onAnimalSearch: function (event) {
            var query = event.getParameter("newValue");
            if (query === undefined) {
                query = event.getParameter("query");
            }
            query = String(query || "").toLowerCase().trim();

            var filtered = this._animals.filter(function (animal) {
                return [
                    animal.name, animal.species, animal.breed, animal.gender,
                    animal.description
                ].filter(Boolean).join(" ").toLowerCase().indexOf(query) >= 0;
            });
            this._renderAnimalCards(filtered);
        },

        _renderFeaturedAnimals: function () {
            var host = this.byId("userRecentAnimalsHost");
            if (!host) { return; }
            host.removeAllItems();

            var featured = this._animals.slice(0, 3);
            if (!featured.length) {
                host.addItem(new Text({ text: "No animals are currently available. Please check again later." }));
                return;
            }

            featured.forEach(function (animal) {
                host.addItem(this._createAnimalCard(animal, true));
            }, this);
        },

        _renderAnimalCards: function (animals) {
            var host = this.byId("userAnimalsCardsHost");
            if (!host) { return; }
            host.removeAllItems();

            if (!animals || !animals.length) {
                host.addItem(new VBox({
                    width: "100%",
                    alignItems: "Center",
                    items: [
                        new Icon({ src: "sap-icon://search", size: "2rem" }),
                        new Title({ text: "No available animals found", level: "H3" }),
                        new Text({ text: "Try another search or refresh the list." })
                    ]
                }).addStyleClass("userEmptyState"));
                return;
            }

            animals.forEach(function (animal) {
                host.addItem(this._createAnimalCard(animal, false));
            }, this);
        },

        _createAnimalCard: function (animal, compact) {
            var image = new Image({
                src: animal.photo || PLACEHOLDER_IMAGE,
                width: "100%",
                height: compact ? "8rem" : "12rem",
                decorative: false,
                alt: animal.name || "Animal photo"
            }).addStyleClass("userAnimalCardImage");

            var details = new VBox({
                width: "100%",
                items: [
                    new ObjectStatus({
                        text: (animal.status || "AVAILABLE").replace(/_/g, " "),
                        state: "Success",
                        icon: "sap-icon://accept"
                    }),
                    new Title({
                        text: animal.name || "Unnamed animal",
                        level: "H3"
                    }),
                    new Text({
                        text: [animal.breed || animal.species || "Animal",
                            animal.age !== null && animal.age !== undefined ? animal.age + " years" : "",
                            animal.gender || ""].filter(Boolean).join(" · "),
                        wrapping: true
                    }),
                    new Text({
                        text: animal.description || "Waiting for a loving home.",
                        wrapping: true,
                        maxLines: 3
                    }),
                    new Text({
                        text: animal.adoptionFee !== null && animal.adoptionFee !== undefined
                            ? "Adoption fee: " + animal.adoptionFee
                            : "Ask the shelter about adoption details."
                    }).addStyleClass("userAnimalFee"),
                    new Button({
                        text: "Apply to adopt",
                        icon: "sap-icon://heart",
                        type: "Emphasized",
                        width: "100%",
                        press: function () {
                            this._openApplicationDialog(animal);
                        }.bind(this)
                    })
                ]
            }).addStyleClass("userAnimalCardDetails");

            var card = new VBox({
                width: compact ? "14rem" : "18rem",
                items: [image, details]
            }).addStyleClass("userAnimalCard");

            return card;
        },

        _openApplicationDialog: function (animal) {
            if (!this._ensureUserId()) {
                return;
            }

            var reason = new TextArea({
                width: "100%",
                rows: 3,
                placeholder: "Why would you like to adopt this animal?"
            });
            var housing = new TextArea({
                width: "100%",
                rows: 3,
                placeholder: "Describe your home and outdoor space."
            });
            var experience = new TextArea({
                width: "100%",
                rows: 3,
                placeholder: "Tell us about your experience with pets."
            });

            var dialog = new Dialog({
                title: "Apply to adopt " + (animal.name || "this animal"),
                contentWidth: "34rem",
                content: [
                    new VBox({
                        width: "100%",
                        items: [
                            new Image({
                                src: animal.photo || PLACEHOLDER_IMAGE,
                                width: "100%",
                                height: "11rem",
                                decorative: false,
                                alt: animal.name || "Animal"
                            }).addStyleClass("userApplicationDialogImage"),
                            new Label({ text: "Reason for adoption", required: true }),
                            reason,
                            new Label({ text: "Housing details", required: true }),
                            housing,
                            new Label({ text: "Pet experience" }),
                            experience
                        ]
                    }).addStyleClass("userApplicationDialogContent")
                ],
                beginButton: new Button({
                    text: "Submit application",
                    type: "Emphasized",
                    press: async function () {
                        if (!reason.getValue().trim() || !housing.getValue().trim()) {
                            MessageBox.warning("Please enter your reason for adoption and housing details.");
                            return;
                        }

                        var button = dialog.getBeginButton();
                        button.setEnabled(false);
                        button.setBusy(true);

                        try {
                            await this._action("applyForAdoption", {
                                animalID: animal.ID,
                                reasonForAdoption: reason.getValue().trim(),
                                housingDetails: housing.getValue().trim(),
                                petExperience: experience.getValue().trim()
                            });

                            dialog.close();
                            MessageToast.show("Your adoption application was submitted.");
                            await this._loadAll();
                            this._showSection("applications");
                        } catch (error) {
                            button.setEnabled(true);
                            button.setBusy(false);
                            MessageBox.error("Application could not be submitted:\n" + error.message);
                        }
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        dialog.close();
                    }
                }),
                afterClose: function () {
                    dialog.destroy();
                }
            });

            this.getView().addDependent(dialog);
            dialog.open();
        },

        _renderApplicationCards: function () {
            var host = this.byId("userApplicationsCardsHost");
            if (!host) { return; }
            host.removeAllItems();
            var rows = this.getView().getModel("userView").getProperty("/applications") || [];
            if (!rows.length) {
                host.addItem(new VBox({ width: "100%", alignItems: "Center", items: [
                    new Icon({ src: "sap-icon://document-text", size: "2rem" }),
                    new Title({ text: "No applications yet", level: "H3" }),
                    new Text({ text: "Browse available animals and submit an application to see it here." }),
                    new Button({ text: "Browse animals", icon: "sap-icon://search", press: this.onShowAnimals.bind(this) })
                ] }).addStyleClass("userEmptyState"));
                return;
            }
            rows.forEach(function (application, index) {
                var pending = application.status === "SUBMITTED" || application.status === "UNDER_REVIEW";
                var context = new sap.ui.model.Context(this.getView().getModel("userView"), "/applications/" + index);
                var actions = new HBox({ wrap: "Wrap", items: [
                    new Button({ text: "View details", icon: "sap-icon://detail-view", press: this.onViewApplicationDetails.bind(this) }),
                    new Button({ text: "Edit", icon: "sap-icon://edit", enabled: pending, press: this.onEditApplication.bind(this) }),
                    new Button({ text: "Delete", icon: "sap-icon://delete", type: "Reject", enabled: pending, press: this.onDeleteApplication.bind(this) })
                ] }).addStyleClass("userApplicationActions");
                actions.getItems().forEach(function (button) { button.setBindingContext(context, "userView"); });
                var details = new VBox({ width: "100%", items: [
                    new Title({ text: application.animalName || "Animal", level: "H3" }),
                    new Text({ text: application.animalDescription || "Animal details" }),
                    new Text({ text: "Application date: " + (application.applicationDate || "Not specified") }),
                    new ObjectStatus({ text: application.statusText || application.status || "UNKNOWN", state: application.statusState || "None" }),
                    new Text({ text: "Reason: " + (application.reasonForAdoption || "Not provided") }),
                    new Text({ text: "Housing: " + (application.housingDetails || "Not provided") }),
                    new Text({ text: "Pet experience: " + (application.petExperience || "Not provided") }),
                    new Text({ text: "Shelter remarks: " + (application.staffRemarks || "No remarks yet") }),
                    actions
                ] }).addStyleClass("userApplicationCardDetails");
                host.addItem(new HBox({ width: "100%", alignItems: "Start", items: [
                    new Image({ src: application.animalPhoto || PLACEHOLDER_IMAGE, width: "10rem", height: "10rem", decorative: false, alt: application.animalName || "Animal photo" }).addStyleClass("userAnimalCardImage"),
                    details
                ] }).addStyleClass("userApplicationCard"));
            }, this);
        },

        onEditApplication: function (event) {
            var application = event.getSource().getBindingContext("userView").getObject();
            if (!application || !application.ID) { MessageBox.error("Could not identify this application."); return; }
            if (application.status !== "SUBMITTED" && application.status !== "UNDER_REVIEW") { MessageToast.show("Only pending applications can be edited."); return; }
            var reason = new TextArea({ value: application.reasonForAdoption || "", rows: 3, width: "100%" });
            var housing = new TextArea({ value: application.housingDetails || "", rows: 3, width: "100%" });
            var experience = new TextArea({ value: application.petExperience || "", rows: 3, width: "100%" });
            var dialog = new Dialog({ title: "Edit adoption application", contentWidth: "34rem", content: [new VBox({ width: "100%", items: [
                new Label({ text: "Reason for adoption", required: true }), reason,
                new Label({ text: "Housing details", required: true }), housing,
                new Label({ text: "Pet experience" }), experience
            ] })], beginButton: new Button({ text: "Save changes", type: "Emphasized", press: async function () {
                if (!reason.getValue().trim() || !housing.getValue().trim()) { MessageBox.warning("Reason and housing details are required."); return; }
                try {
                    await this._action("editApplication", {
                        applicationID: application.ID,
                        reasonForAdoption: reason.getValue().trim(),
                        housingDetails: housing.getValue().trim(),
                        petExperience: experience.getValue().trim()
                    });
                    dialog.close(); MessageToast.show("Application updated."); await this._loadAll();
                } catch (error) { MessageBox.error("Could not update application: " + error.message); }
            }.bind(this) }), endButton: new Button({ text: "Cancel", press: function () { dialog.close(); } }), afterClose: function () { dialog.destroy(); } });
            this.getView().addDependent(dialog); dialog.open();
        },

        onDeleteApplication: function (event) {
            var application = event.getSource().getBindingContext("userView").getObject();
            if (!application || !application.ID) { MessageBox.error("Could not identify this application."); return; }
            if (application.status !== "SUBMITTED" && application.status !== "UNDER_REVIEW") { MessageToast.show("Only pending applications can be deleted."); return; }
            MessageBox.confirm("Delete this pending application? This cannot be undone.", { title: "Delete application", actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL], emphasizedAction: MessageBox.Action.DELETE, onClose: async function (action) {
                if (action !== MessageBox.Action.DELETE) { return; }
                try {
                    await this._action("deleteApplication", {
                        applicationID: application.ID
                    });
                    MessageToast.show("Application deleted."); await this._loadAll();
                } catch (error) { MessageBox.error("Could not delete application: " + error.message); }
            }.bind(this) });
        },

        onWithdrawApplication: function (event) {
            var context = event.getSource().getBindingContext("userView");
            var application = context && context.getObject();
            if (!application || !application.ID) {
                MessageBox.error("Could not identify this application.");
                return;
            }

            MessageBox.confirm("Withdraw this adoption application?", {
                title: "Withdraw application",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: async function (action) {
                    if (action !== MessageBox.Action.OK) {
                        return;
                    }
                    try {
                        await this._action("withdrawApplication", {
                            applicationID: application.ID
                        });
                        MessageToast.show("Application withdrawn.");
                        await this._loadAll();
                    } catch (error) {
                        MessageBox.error("Could not withdraw application:\n" + error.message);
                    }
                }.bind(this)
            });
        },

        onViewApplicationDetails: function (event) {
            var context = event.getSource().getBindingContext("userView");
            var application = context && context.getObject();
            if (!application) { return; }

            MessageBox.information(
                "Animal: " + application.animalName +
                "\nStatus: " + application.statusText +
                "\nSubmitted: " + application.applicationDate +
                "\nReason: " + (application.reasonForAdoption || "Not provided") +
                "\nHousing: " + (application.housingDetails || "Not provided") +
                "\nPet experience: " + (application.petExperience || "Not provided") +
                "\nStaff remarks: " + (application.staffRemarks || "No remarks yet"),
                { title: "Application details" }
            );
        },

        _renderDashboardAdoptions: function () {
            var host = this.byId("userDashboardAdoptionsHost");
            if (!host) { return; }
            host.removeAllItems();

            var rows = (this.getView().getModel("userView").getProperty("/adoptions") || []).slice(0, 3);
            if (!rows.length) {
                host.addItem(new VBox({
                    width: "100%",
                    alignItems: "Center",
                    items: [
                        new Icon({ src: "sap-icon://heart", size: "2rem" }),
                        new Title({ text: "Your adoption story starts here", level: "H3" }),
                        new Text({ text: "Once an application is approved, your companion will appear here." }),
                        new Button({ text: "Browse animals", icon: "sap-icon://search", press: this.onShowAnimals.bind(this) })
                    ]
                }).addStyleClass("userEmptyState"));
                return;
            }

            rows.forEach(function (adoption) {
                var image = new Image({
                    src: adoption.animalPhoto || PLACEHOLDER_IMAGE,
                    width: "100%",
                    height: "12rem",
                    decorative: false,
                    alt: adoption.animalName || "Adopted animal"
                }).addStyleClass("userAnimalCardImage");
                var details = new VBox({
                    width: "100%",
                    items: [
                        new ObjectStatus({ text: adoption.statusText, state: adoption.status === "COMPLETED" ? "Success" : "Information" }),
                        new Title({ text: adoption.animalName, level: "H3" }),
                        new Text({ text: adoption.animalDescription || "Your beloved companion" }),
                        new Text({ text: "Adoption date: " + adoption.adoptionDateText })
                    ]
                }).addStyleClass("userAnimalCardDetails");
                host.addItem(new VBox({
                    width: "15rem",
                    items: [image, details]
                }).addStyleClass("userAnimalCard userDashboardAdoptionCard"));
            });
        },

        _renderAdoptionCards: function () {
            var host = this.byId("userAdoptionsCardsHost");
            if (!host) { return; }
            host.removeAllItems();

            var rows = this.getView().getModel("userView").getProperty("/adoptions") || [];
            if (!rows.length) {
                host.addItem(new VBox({
                    width: "100%",
                    alignItems: "Center",
                    items: [
                        new Icon({ src: "sap-icon://heart", size: "2.5rem" }),
                        new Title({ text: "Your adoption story starts here", level: "H3" }),
                        new Text({ text: "When an adoption is approved, its details will appear here." }),
                        new Button({
                            text: "Browse animals",
                            type: "Emphasized",
                            press: this.onShowAnimals.bind(this)
                        })
                    ]
                }).addStyleClass("userEmptyState"));
                return;
            }

            rows.forEach(function (adoption) {
                var image = new Image({
                    src: adoption.animalPhoto || PLACEHOLDER_IMAGE,
                    width: "10rem",
                    height: "14rem",
                    decorative: false,
                    alt: adoption.animalName
                }).addStyleClass("userAdoptionImage");

                var details = new VBox({
                    width: "100%",
                    items: [
                        new ObjectStatus({
                            text: adoption.statusText,
                            state: adoption.status === "COMPLETED" ? "Success" : "Information"
                        }),
                        new Title({ text: adoption.animalName, level: "H2" }),
                        new Text({ text: adoption.animalDescription }),
                        new Text({ text: "Adoption date: " + adoption.adoptionDateText }),
                        new Text({ text: adoption.remarks || "Thank you for giving this animal a home." }),
                        new Button({
                            text: "View adoption details",
                            icon: "sap-icon://inspect",
                            press: function () {
                                MessageBox.information(
                                    "Adoption date: " + adoption.adoptionDateText +
                                    "\nStatus: " + adoption.statusText +
                                    "\nRemarks: " + (adoption.remarks || "No remarks provided."),
                                    { title: adoption.animalName }
                                );
                            }
                        })
                    ]
                }).addStyleClass("userAdoptionDetails");

                host.addItem(new HBox({
                    width: "100%",
                    alignItems: "Stretch",
                    items: [image, details]
                }).addStyleClass("userAdoptionCard"));
            });
        },

        onSaveProfile: async function () {
            if (!this._ensureUserId()) {
                return;
            }

            var model = this.getView().getModel("userView");
            var profile = model.getProperty("/profile") || {};

            if (!profile.firstName || !profile.lastName || !profile.email) {
                MessageBox.warning("First name, last name and email are required.");
                return;
            }

            try {
                await this._action("updateUserProfile", {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                    phoneNumber: profile.phoneNumber || ""
                });
                MessageToast.show("Profile updated successfully.");
                await this._loadAll();
            } catch (error) {
                MessageBox.error("Could not update profile:\n" + error.message);
            }
        }
    });
});