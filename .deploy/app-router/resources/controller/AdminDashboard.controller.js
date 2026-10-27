sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/DatePicker",
    "sap/m/CheckBox",
    "sap/m/SearchField",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/ObjectStatus",
    "sap/m/Image",
    "sap/ui/core/Icon",
    "sap/viz/ui5/controls/VizFrame",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem"
], function (
    Controller, JSONModel, MessageBox, MessageToast, Dialog, Button,
    Label, Input, TextArea, Select, Item, DatePicker, CheckBox,
    SearchField, Table, Column, ColumnListItem, Text, HBox, VBox,
    ObjectStatus, Image, Icon, VizFrame, FlattenedDataset, FeedItem
) {
    "use strict";

    var SERVICE = "/odata/v4/admin/";

    var CONFIG = {
        Animals: {
            title: "Animal Management",
            columns: ["name", "species", "breed", "gender", "age", "status", "vaccinationStatus"],
            fields: [
                ["name", "Animal Name", "text", true],
                ["species", "Species", "text", true],
                ["breed", "Breed", "text"],
                ["gender", "Gender", "enum", ["MALE", "FEMALE"]],
                ["age", "Age", "number"],
                ["arrivalDate", "Arrival Date", "date"],
                ["status", "Status", "enum", ["AVAILABLE", "RESERVED", "ADOPTED", "UNDER_TREATMENT"]],
                ["vaccinationStatus", "Vaccination Status", "enum", ["VACCINATED", "PARTIALLY_VACCINATED", "NOT_VACCINATED"]],
                ["adoptionFee", "Adoption Fee", "number"],
                ["isSpayedOrNeutered", "Spayed / Neutered", "boolean"],
                ["photo", "Photo URL", "text"],
                ["description", "Description", "long"],
                ["shelter_ID", "Shelter ID", "text"]
            ]
        },
        Shelters: {
            title: "Shelter Management",
            columns: ["shelterName", "city", "contactNumber", "capacity", "currentOccupancy", "email"],
            fields: [
                ["shelterName", "Shelter Name", "text", true],
                ["shelterCode", "Shelter Code", "text"],
                ["addressLine1", "Address Line 1", "text"],
                ["addressLine2", "Address Line 2", "text"],
                ["city", "City", "text"],
                ["state", "State", "text"],
                ["postalCode", "Postal Code", "text"],
                ["country", "Country", "text"],
                ["contactNumber", "Contact Number", "text"],
                ["email", "Email", "text"],
                ["website", "Website", "text"],
                ["capacity", "Capacity", "number"],
                ["currentOccupancy", "Current Occupancy", "number"],
                ["operatingTime", "Opening Time (HH:MM:SS)", "text"],
                ["closingTime", "Closing Time (HH:MM:SS)", "text"],
                ["shelterType", "Shelter Type", "text"],
                ["licenseNumber", "License Number", "text"]
            ]
        },
        Users: {
            title: "User Management",
            columns: ["firstName", "lastName", "email", "phoneNumber", "role", "status"],
            fields: [
                ["firstName", "First Name", "text"],
                ["lastName", "Last Name", "text"],
                ["email", "Email", "text"],
                ["phoneNumber", "Phone Number", "text"],
                ["role", "Role", "enum", ["USER", "ADMIN"]],
                ["status", "Status", "enum", ["ACTIVE", "INACTIVE"]],
                ["authId", "Auth ID", "text"],
                ["addressLine1", "Address Line 1", "text"],
                ["addressLine2", "Address Line 2", "text"],
                ["city", "City", "text"],
                ["state", "State", "text"],
                ["postalCode", "Postal Code", "text"],
                ["country", "Country", "text"]
            ]
        },
        AdoptionApplications: {
            title: "Adoption Applications",
            columns: ["ID", "animal_ID", "applicant_ID", "applicationDate", "status", "staffRemarks"],
            fields: [
                ["animal_ID", "Animal ID", "text", true],
                ["applicant_ID", "Applicant User ID", "text", true],
                ["applicationDate", "Application Date", "date"],
                ["reasonForAdoption", "Reason for Adoption", "long"],
                ["housingDetails", "Housing Details", "long"],
                ["petExperience", "Pet Experience", "long"],
                ["status", "Status", "enum", ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"]],
                ["staffRemarks", "Staff Remarks", "long"]
            ]
        },
        Adoptions: {
            title: "Adoption Records",
            columns: ["ID", "application_ID", "animal_ID", "adoptionDate", "status", "remarks"],
            fields: [
                ["application_ID", "Application ID", "text", true],
                ["animal_ID", "Animal ID", "text", true],
                ["adoptionDate", "Adoption Date", "date"],
                ["status", "Status", "enum", ["IN_PROGRESS", "COMPLETED", "CANCELLED"]],
                ["remarks", "Remarks", "long"]
            ]
        },
        HealthRecords: {
            title: "Animal Health Records",
            columns: ["animal_ID", "checkupDate", "healthStatus", "diagnosis", "veterinarianName", "nextCheckupDate"],
            fields: [
                ["animal_ID", "Animal ID", "text", true],
                ["checkupDate", "Checkup Date", "date"],
                ["healthStatus", "Health Status", "enum", ["HEALTHY", "SICK", "INJURED", "UNDER_TREATMENT", "CRITICAL"]],
                ["diagnosis", "Diagnosis", "long"],
                ["treatment", "Treatment", "long"],
                ["medication", "Medication", "long"],
                ["veterinarianName", "Veterinarian Name", "text"],
                ["weight", "Weight", "number"],
                ["nextCheckupDate", "Next Checkup Date", "date"],
                ["remarks", "Remarks", "long"]
            ]
        },
        Inspections: {
            title: "Inspection Management",
            columns: ["adoption_ID", "inspectionDate", "inspectionType", "result", "remarks"],
            fields: [
                ["adoption_ID", "Adoption ID", "text", true],
                ["inspector_ID", "Inspector User ID", "text"],
                ["inspectionDate", "Inspection Date", "date"],
                ["inspectionType", "Inspection Type", "text"],
                ["assignedDetails", "Inspection Details", "long"],
                ["result", "Result", "enum", ["VALIDATED", "FOLLOW_UP_REQUIRED", "FAILED"]],
                ["remarks", "Remarks", "long"]
            ]
        }
    };

    return Controller.extend(
        "animaladoption.animaladoption.controller.AdminDashboard", {

        onInit: function () {
            this._activeEntity = null;
            this._allRows = [];

            this.getView().setModel(new JSONModel({
                totalAnimals: 0,
                availableAnimals: 0,
                adoptedAnimals: 0,
                totalApplications: 0,
                pendingApplications: 0,
                shelterOccupancy: []
            }), "dashboard");

            this._loadDashboard();
        },

        onToggleSideNavigation: function () {
            var page = this.byId("adminToolPage");
            page.setSideExpanded(!page.getSideExpanded());
        },

        onRefreshDashboard: function () {
            this._loadDashboard();
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
                    // Keep the HTTP error if the response is not JSON.
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

        _loadDashboard: async function () {
            try {
                var results = await Promise.all([
                    this._request(SERVICE + "Animals?$select=ID,name,species,status"),
                    this._request(SERVICE + "AdoptionApplications?$select=ID,status"),
                    this._request(SERVICE + "Adoptions?$select=ID,status,adoptionDate"),
                    this._request(SERVICE + "Shelters?$select=ID,shelterName,city,state,capacity,currentOccupancy")
                ]);

                var animals = results[0].value || [];
                var applications = results[1].value || [];
                var adoptions = results[2].value || [];
                var shelters = results[3].value || [];

                this.getView().getModel("dashboard").setData({
                    totalAnimals: animals.length,

                    availableAnimals: animals.filter(function (animal) {
                        return animal.status === "AVAILABLE";
                    }).length,

                    adoptedAnimals: animals.filter(function (animal) {
                        return animal.status === "ADOPTED";
                    }).length,

                    totalApplications: applications.length,

                    pendingApplications: applications.filter(function (application) {
                        return application.status === "SUBMITTED" ||
                            application.status === "UNDER_REVIEW";
                    }).length,

                    shelterOccupancy: shelters.map(function (shelter) {
                        var capacity = Number(shelter.capacity) || 0;
                        var occupancy = Number(shelter.currentOccupancy) || 0;

                        return {
                            shelterName: shelter.shelterName || "Unnamed Shelter",
                            location: [shelter.city, shelter.state].filter(Boolean).join(", "),
                            capacity: capacity,
                            occupancy: occupancy,
                            percentage: capacity
                                ? Math.min(100, Math.round(occupancy * 100 / capacity))
                                : 0
                        };
                    })
                });

                this._renderCharts(animals, applications, adoptions);

            } catch (error) {
                console.error(error);
                MessageBox.error("Dashboard failed to load:\n" + error.message);
            }
        },

        _renderCharts: function (animals, applications, adoptions) {
            var statuses = [
                "APPROVED", "SUBMITTED", "UNDER_REVIEW", "REJECTED", "WITHDRAWN"
            ];
            var counts = {};

            statuses.forEach(function (status) {
                counts[status] = 0;
            });

            applications.forEach(function (application) {
                if (counts[application.status] !== undefined) {
                    counts[application.status]++;
                }
            });

            this._makeChart("applicationStatusChart",
                statuses.map(function (status) {
                    return {
                        category: status.replace(/_/g, " "),
                        count: counts[status]
                    };
                }), "donut", true);

            var speciesCounts = {};
            animals.forEach(function (animal) {
                var species = animal.species || "Unspecified";
                speciesCounts[species] = (speciesCounts[species] || 0) + 1;
            });

            var speciesData = Object.keys(speciesCounts).map(function (species) {
                return {
                    category: species,
                    count: speciesCounts[species]
                };
            });

            if (!speciesData.length) {
                speciesData = [{ category: "No animals", count: 0 }];
            }

            this._makeChart("animalCategoriesChart", speciesData, "column", false);

            var monthCounts = {};
            adoptions.forEach(function (adoption) {
                if (!adoption.adoptionDate) {
                    return;
                }

                var date = new Date(adoption.adoptionDate);
                if (isNaN(date.getTime())) {
                    return;
                }

                var month = date.getFullYear() + "-" +
                    String(date.getMonth() + 1).padStart(2, "0");

                monthCounts[month] = (monthCounts[month] || 0) + 1;
            });

            var trend = Object.keys(monthCounts).sort().map(function (month) {
                return {
                    category: month,
                    count: monthCounts[month]
                };
            });

            if (!trend.length) {
                trend = [{ category: "No adoption records", count: 0 }];
            }

            this._makeChart("adoptionTrendChart", trend, "line", false);
        },

        _makeChart: function (id, data, type, showLegend) {
            var host = this.byId(id);
            if (!host) {
                return;
            }

            host.removeAllItems();

            var chart = new VizFrame({
                width: "100%",
                height: "320px",
                vizType: type,
                uiConfig: { applicationSet: "fiori" }
            });
            chart.addStyleClass("dashboardVizFrame");

            chart.setDataset(new FlattenedDataset({
                dimensions: [{
                    name: "Category",
                    value: "{category}"
                }],
                measures: [{
                    name: "Records",
                    value: "{count}"
                }],
                data: { path: "/" }
            }));

            chart.setModel(new JSONModel(data));

            chart.setVizProperties({
                title: {
                    visible: false
                },
                legend: {
                    visible: !!showLegend,
                    position: "bottom"
                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        showTotal: type === "donut"
                    },
                    drawingEffect: "glossy"
                },
                valueAxis: {
                    title: {
                        visible: false
                    },
                    label: {
                        visible: true
                    },
                    axisLine: {
                        visible: true
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    },
                    label: {
                        visible: true,
                        angle: {
                            tilting: 0
                        }
                    },
                    axisLine: {
                        visible: true
                    }
                },
                interaction: {
                    selectability: {
                        mode: "SINGLE"
                    }
                }
            });

            chart.addFeed(new FeedItem({
                uid: type === "donut" ? "size" : "valueAxis",
                type: "Measure",
                values: ["Records"]
            }));

            chart.addFeed(new FeedItem({
                uid: type === "donut" ? "color" : "categoryAxis",
                type: "Dimension",
                values: ["Category"]
            }));

            host.addItem(chart);
        },

        onNavigationSelect: function (event) {
            var item = event.getParameter("item");
            var key = item && item.getKey();

            if (!key) {
                return;
            }

            if (key === "Dashboard") {
                this._activeEntity = null;
                this.byId("dashboardSection").setVisible(true);
                this.byId("entitySection").setVisible(false);
                this._loadDashboard();
                return;
            }

            this.byId("dashboardSection").setVisible(false);
            this.byId("entitySection").setVisible(true);
            this._showEntity(key);
        },

        _showEntity: async function (entityName) {
            var config = CONFIG[entityName];
            if (!config) {
                return;
            }

            this._activeEntity = entityName;
            this.byId("entityTitle").setText(config.title);
            this.byId("animalHeroSection").setVisible(entityName === "Animals");
            this.byId("entityToolbar").removeAllContent();

            this.byId("entityToolbar").addContent(new SearchField({
                width: "18rem",
                placeholder: "Search records...",
                liveChange: function (event) {
                    this._filterRows(event.getParameter("newValue"));
                }.bind(this)
            }));

            this.byId("entityToolbar").addContent(new Button({
                text: "Refresh",
                icon: "sap-icon://refresh",
                press: function () {
                    this._loadEntity(entityName);
                }.bind(this)
            }));

            if (!config.readOnly) {
                this.byId("entityToolbar").addContent(new Button({
                    text: "Add New",
                    icon: "sap-icon://add",
                    type: "Emphasized",
                    press: function () {
                        this._openRecordDialog(entityName, null);
                    }.bind(this)
                }));
            }

            await this._loadEntity(entityName);
        },

        _loadEntity: async function (entityName) {
            try {
                var result = await this._request(
                    SERVICE + entityName + "?$top=500"
                );

                this._allRows = result.value || [];
                this._buildTable(entityName, this._allRows);

            } catch (error) {
                MessageBox.error("Could not load " + entityName + ":\n" + error.message);
            }
        },

        _filterRows: function (query) {
            if (!this._activeEntity) {
                return;
            }

            var search = (query || "").toLowerCase();

            var rows = this._allRows.filter(function (row) {
                return JSON.stringify(row).toLowerCase().indexOf(search) >= 0;
            });

            this._buildTable(this._activeEntity, rows);
        },

        _buildTable: function (entityName, rows) {
            if (entityName === "Animals") {
                this._buildAnimalCards(rows);
                return;
            }

            var config = CONFIG[entityName];

            var table = new Table({
                width: "100%",
                growing: true,
                growingScrollToLoad: true
            });

            config.columns.forEach(function (field) {
                table.addColumn(new Column({
                    header: new Label({
                        text: field === "ID" ? "Record ID" : field.replace(/_/g, " ")
                    })
                }));
            });

            if (entityName === "AdoptionApplications") {
                table.addColumn(new Column({
                    header: new Label({ text: "Review Actions" })
                }));
            } else if (!config.readOnly) {
                table.addColumn(new Column({
                    header: new Label({ text: "Actions" })
                }));
            }

            rows.forEach(function (row) {
                var cells = config.columns.map(function (field) {
                    var value = row[field];

                    if (field === "ID" && value) {
                        value = String(value).substring(0, 8) + "...";
                    }

                    return new Text({
                        text: value === null || value === undefined
                            ? ""
                            : String(value),
                        wrapping: false
                    });
                });

                if (entityName === "AdoptionApplications") {
                    var processed = [
                        "APPROVED", "REJECTED", "WITHDRAWN"
                    ].indexOf(row.status) >= 0;

                    cells.push(new HBox({
                        items: [
                            new ObjectStatus({
                                text: row.status || "UNKNOWN",
                                state: row.status === "APPROVED" ? "Success" :
                                    row.status === "REJECTED" ? "Error" : "Warning"
                            }),
                            new Button({
                                text: "Approve",
                                type: "Accept",
                                enabled: !processed,
                                press: function () {
                                    this._reviewApplication(row, true);
                                }.bind(this)
                            }),
                            new Button({
                                text: "Reject",
                                type: "Reject",
                                enabled: !processed,
                                press: function () {
                                    this._reviewApplication(row, false);
                                }.bind(this)
                            })
                        ]
                    }));
                } else if (!config.readOnly) {
                    cells.push(new HBox({
                        items: [
                            new Button({
                                icon: "sap-icon://edit",
                                tooltip: "Edit",
                                type: "Transparent",
                                press: function () {
                                    this._openRecordDialog(entityName, row);
                                }.bind(this)
                            }),
                            new Button({
                                icon: "sap-icon://delete",
                                tooltip: "Delete",
                                type: "Transparent",
                                press: function () {
                                    this._deleteRecord(entityName, row);
                                }.bind(this)
                            })
                        ]
                    }));
                }

                table.addItem(new ColumnListItem({ cells: cells }));
            }.bind(this));

            this.byId("entityTableHost").removeAllItems();
            this.byId("entityTableHost").addItem(table);
        },

        _buildAnimalCards: function (animals) {
            var host = this.byId("entityTableHost");
            host.removeAllItems();

            if (!animals.length) {
                host.addItem(new VBox({
                    width: "100%",
                    alignItems: "Center",
                    items: [
                        new Icon({
                            src: "sap-icon://picture",
                            size: "3rem"
                        }),
                        new Text({
                            text: "No animals found. Select Add New to register an animal."
                        })
                    ]
                }));
                return;
            }

            var gallery = new HBox({
                width: "100%",
                wrap: "Wrap",
                alignItems: "Start",
                justifyContent: "Start"
            });

            animals.forEach(function (animal) {
                var imageControl;

                // Display the exact URL saved in Animals.photo.
                if (animal.photo) {
                    imageControl = new Image({
                        src: animal.photo,
                        width: "100%",
                        height: "12rem",
                        densityAware: false,
                        decorative: false,
                        alt: animal.name || "Animal",
                        tooltip: animal.photo
                    });
                    imageControl.addStyleClass("animalCardImage");
                } else {
                    imageControl = new VBox({
                        width: "100%",
                        height: "12rem",
                        alignItems: "Center",
                        justifyContent: "Center",
                        items: [
                            new Icon({
                                src: "sap-icon://picture",
                                size: "3rem"
                            }),
                            new Text({ text: "No photo URL provided" })
                        ]
                    });
                    imageControl.addStyleClass("animalCardNoImage");
                }

                var statusState = "Information";
                if (animal.status === "AVAILABLE") {
                    statusState = "Success";
                } else if (animal.status === "RESERVED" ||
                           animal.status === "UNDER_TREATMENT") {
                    statusState = "Warning";
                } else if (animal.status === "ADOPTED") {
                    statusState = "Error";
                }

                var details = new VBox({
                    width: "100%",
                    items: [
                        new ObjectStatus({
                            text: (animal.status || "UNKNOWN").replace(/_/g, " "),
                            state: statusState
                        }),
                        new sap.m.Title({
                            text: animal.name || "Unnamed Animal",
                            level: "H4"
                        }),
                        new Text({
                            text: [
                                animal.breed || animal.species || "Animal",
                                animal.gender || "",
                                animal.age !== null && animal.age !== undefined
                                    ? animal.age + " years"
                                    : ""
                            ].filter(Boolean).join(" · "),
                            wrapping: true
                        }),
                        new Text({
                            text: animal.description || "No description provided.",
                            wrapping: true,
                            maxLines: 3
                        }),
                        new Text({
                            text: animal.adoptionFee !== null && animal.adoptionFee !== undefined
                                ? "Adoption fee: " + animal.adoptionFee
                                : ""
                        }),
                        new HBox({
                            width: "100%",
                            justifyContent: "SpaceBetween",
                            items: [
                                new Button({
                                    text: "Edit",
                                    icon: "sap-icon://edit",
                                    press: function () {
                                        this._openRecordDialog("Animals", animal);
                                    }.bind(this)
                                }),
                                new Button({
                                    text: "Delete",
                                    icon: "sap-icon://delete",
                                    type: "Reject",
                                    press: function () {
                                        this._deleteRecord("Animals", animal);
                                    }.bind(this)
                                })
                            ]
                        })
                    ]
                });

                var card = new VBox({
                    width: "18rem",
                    items: [imageControl, details]
                });

                card.addStyleClass("animalCard");
                gallery.addItem(card);
            }.bind(this));

            host.addItem(gallery);
        },

        _openRecordDialog: function (entityName, row) {
            var config = CONFIG[entityName];
            var controls = {};
            var formItems = [];
            var isEdit = !!row;

            config.fields.forEach(function (field) {
                var name = field[0];
                var label = field[1];
                var type = field[2];
                var value = row ? row[name] : "";
                var control;

                if (type === "long") {
                    control = new TextArea({
                        value: value || "",
                        rows: 3,
                        width: "100%"
                    });
                } else if (type === "enum") {
                    control = new Select({
                        width: "100%",
                        selectedKey: value || "",
                        items: [new Item({
                            key: "",
                            text: "-- Select --"
                        })].concat(field[3].map(function (entry) {
                            return new Item({
                                key: entry,
                                text: entry.replace(/_/g, " ")
                            });
                        }))
                    });
                } else if (type === "date") {
                    control = new DatePicker({
                        width: "100%",
                        value: value ? String(value).substring(0, 10) : "",
                        valueFormat: "yyyy-MM-dd",
                        displayFormat: "medium"
                    });
                } else if (type === "boolean") {
                    control = new CheckBox({
                        selected: !!value
                    });
                } else {
                    control = new Input({
                        width: "100%",
                        value: value === null || value === undefined ? "" : String(value),
                        type: type === "number" ? "Number" : "Text"
                    });
                }

                controls[name] = control;
                formItems.push(new Label({ text: label }));
                formItems.push(control);
            });

            var dialog = new Dialog({
                title: (isEdit ? "Edit " : "Add ") + config.title,
                contentWidth: "38rem",
                content: [
                    new VBox({
                        width: "100%",
                            items: formItems
                    })
                ],
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: async function () {
                        var payload = {};
                        var valid = true;
                        var errorMessage = "";

                        config.fields.forEach(function (field) {
                            var name = field[0];
                            var type = field[2];
                            var required = field[3] === true;
                            var control = controls[name];
                            var value;

                            if (type === "boolean") {
                                value = control.getSelected();
                            } else if (type === "enum") {
                                value = control.getSelectedKey() || null;
                            } else if (type === "date") {
                                value = control.getValue() || null;
                            } else {
                                value = control.getValue();

                                if (type === "number") {
                                    value = value === "" ? null : Number(value);

                                    if (value !== null && !Number.isFinite(value)) {
                                        valid = false;
                                        errorMessage = field[1] + " must be a number.";
                                    }
                                } else {
                                    value = value === "" ? null : value;
                                }
                            }

                            if (required && (value === null || value === "")) {
                                valid = false;
                                errorMessage = field[1] + " is required.";
                            }

                            payload[name] = value;
                        });

                        if (!valid) {
                            MessageBox.warning(errorMessage);
                            return;
                        }

                        Object.keys(payload).forEach(function (key) {
                            if (payload[key] === null || payload[key] === "") {
                                delete payload[key];
                            }
                        });

                        // CAP OData associations are written through their generated
                        // foreign-key properties, e.g. animal_ID and shelter_ID.
                        if (isEdit) {
                            delete payload.ID;
                        }

                        try {
                            var url = SERVICE + entityName;
                            var options = {
                                method: isEdit ? "PATCH" : "POST",
                                body: JSON.stringify(payload)
                            };

                            if (isEdit) {
                                url += "(" + encodeURIComponent(row.ID) + ")";
                            }

                            await this._request(url, options);

                            dialog.close();
                            MessageToast.show("Record saved successfully.");

                            await this._loadEntity(entityName);
                            await this._loadDashboard();

                        } catch (error) {
                            MessageBox.error("Save failed:\n" + error.message);
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

        _deleteRecord: function (entityName, row) {
            MessageBox.confirm(
                "Delete this record? Linked records may prevent deletion.",
                {
                    title: "Confirm deletion",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async function (action) {
                        if (action !== MessageBox.Action.DELETE) {
                            return;
                        }

                        try {
                            await this._request(
                                SERVICE + entityName + "(" +
                                    encodeURIComponent(row.ID) + ")",
                                { method: "DELETE" }
                            );

                            MessageToast.show("Record deleted successfully.");
                            await this._loadEntity(entityName);
                            await this._loadDashboard();

                        } catch (error) {
                            MessageBox.error("Delete failed:\n" + error.message);
                        }
                    }.bind(this)
                }
            );
        },

        _reviewApplication: function (row, approve) {
            var remarksInput = new TextArea({
                width: "100%",
                rows: 4,
                placeholder: "Enter review remarks"
            });

            var dialog = new Dialog({
                title: approve ? "Approve Application" : "Reject Application",
                contentWidth: "32rem",
                content: [
                    new VBox({
                        width: "100%",
                            items: [
                            new Label({ text: "Application ID: " + row.ID }),
                            new Label({ text: "Remarks" }),
                            remarksInput
                        ]
                    })
                ],
                beginButton: new Button({
                    text: approve ? "Approve" : "Reject",
                    type: approve ? "Accept" : "Reject",
                    press: async function () {
                        var button = dialog.getBeginButton();
                        button.setEnabled(false);
                        button.setBusy(true);

                        try {
                            await this._request(
                                SERVICE + (approve
                                    ? "approveApplication"
                                    : "rejectApplication"),
                                {
                                    method: "POST",
                                    body: JSON.stringify({
                                        applicationID: row.ID,
                                        remarks: remarksInput.getValue()
                                    })
                                }
                            );

                            dialog.close();

                            MessageToast.show(
                                approve
                                    ? "Application approved and adoption record created."
                                    : "Application rejected."
                            );

                            await this._loadEntity("AdoptionApplications");
                            await this._loadDashboard();

                        } catch (error) {
                            button.setEnabled(true);
                            button.setBusy(false);

                            MessageBox.error(
                                "Could not " + (approve ? "approve" : "reject") +
                                " the application.\n\n" + error.message +
                                "\n\nCheck the action definitions and CAP service logs."
                            );
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
        }
    });
});