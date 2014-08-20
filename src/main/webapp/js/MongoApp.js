/**
 * Marionette application.
 *
 * @type {Backbone.Marionette.Application}
 */

// create the Marionette application
var MongoApp = new Backbone.Marionette.Application();

/**
 * Marionette regions
 */
MongoApp.addRegions({
    mainMessageRegion: '#mainMessageRegion',
    mainRegion: '#mainRegion'
});

/**
 * Global settings for entire system.
 */
MongoApp.addInitializer(function () {

    // event dispatcher that can coordinate events among different areas of your application
    this.dispatcher = _.clone(Backbone.Events);

    this.events = {
        // system error has occurred
        ERROR: 'error',

        // user authenticating to the system
        LOGIN: 'login',

        // user logging out of system
        LOGOUT: 'logout',

        // user successfully authenticated
        LOGIN_SUCCESS: 'loginSuccess',

        // user failed authentication
        LOGIN_FAILED: 'loginFailed',

        // user successfully logged out
        LOGOUT_SUCCESS: 'logoutSuccess',

        // user's session has expired
        SESSION_EXPIRED: 'sessionExpired',

        // User is choosing a different workspace
        WKSP_LOAD: 'workspaceLoad',

        // current Workspace model has been changed
        WKSP_CHANGE: 'workspaceChange',

        // metadata for current workspace has been loaded
        WKSP_META_LOADED: 'workspaceMetaLoaded',

        // signals that a new sample group should be created
        WKSP_GROUP_CREATE: 'workspaceGroupCreate',

        // signals that the given workspace should be removed
        WKSP_REMOVE: 'workspaceRemove',

        // download the current search results of the workspace
        WKSP_DOWNLOAD: 'workspaceDownload',

        // User is choosing a different search
        SEARCH_LOAD: 'searchLoad',

        // signals that a new filter should be added to the search
        SEARCH_FILTER_ADD: 'filterAdd',

        // signals that a filter has been added to the search
        SEARCH_FILTER_ADDED: 'searchFilterAdded',

        // signals that an existing filter should be removed from the search
        SEARCH_FILTER_REMOVE: 'filterRemove',

        // signals that an existing filter has been removed from the search
        SEARCH_FILTER_REMOVED: 'searchFilterRemoved',

        // signals that the search should be saved to the server-side persistence store
        SEARCH_SAVE: 'saveSearch',

        // signals that the search should be deleted from the server-side persistence store
        SEARCH_DELETE: 'deleteSearch',

        // signals that the search should be exported to a file on the client
        SEARCH_EXPORT: 'exportSearch',

        // signals that the search should be imported from a file on the client
        SEARCH_IMPORT: 'importSearch',

        // signals that a dialog showing the search objects should be shown
        SEARCH_SHOW_DIALOG: 'showSearchDialog'
    };

    // GLOBAL
    this.settings =
    {
        maxFilteredVariants: 0,
        popupDuration: 0, // seconds
        maxFilterValues: 0,
        showMissingIndexWarning: false
    };

    // GLOBAL
    this.indexController = new DatabaseIndexController();
    this.search = new Search();

    // constants
    this.FILTER_NONE         = new Filter({name: 'none', displayName: 'none', operator: FilterOperator.UNKNOWN, displayOperator: '',  value: '' , displayValue: '', id:'id-none'}),
    this.FILTER_IN_GROUP     = new GroupFilter({name: 'Samples in Group',     operator: FilterOperator.EQ, value: '0', displayValue: '0', category: FilterCategory.IN_GROUP, description:'Filters variants based on matching samples'});
    this.FILTER_NOT_IN_GROUP = new GroupFilter({name: 'Samples not in Group', operator: FilterOperator.EQ, value: '0', displayValue: '0', category: FilterCategory.NOT_IN_GROUP, description:'Filters variants based on non-matching samples'});
    this.FILTER_MIN_ALT_AD   = new AltAlleleDepthFilter();


    this.showPleaseWait = function() {
        $('#pleaseWaitDialog').modal();
    };

    this.closePleaseWait = function() {
        $('#pleaseWaitDialog').modal('hide');
    }
});

/**
 *
 */
MongoApp.addInitializer(function () {

    var self = this;

    this.listenTo(MongoApp.dispatcher, MongoApp.events.LOGIN_SUCCESS, function () {

        // clear out message region
        self.mainMessageRegion.reset();

        MongoApp.mainRegion.show(new MainLayout());
    });

    this.listenTo(MongoApp.dispatcher, MongoApp.events.SESSION_EXPIRED, function () {

        var expireAlert = Backbone.Marionette.Layout.extend({
            template: "#session-expired-layout-template"
        });
        self.mainMessageRegion.show(new expireAlert());

        // user was logged out by the usersecurityapp
        MongoApp.dispatcher.trigger(MongoApp.events.LOGOUT_SUCCESS);
    });

    this.listenTo(MongoApp.dispatcher, MongoApp.events.LOGOUT_SUCCESS, function () {

        self.securityController.reset();
        self.workspaceController.reset();

        // show login page
        self.securityController.showLogin({region: MongoApp.mainRegion });
    });
});

/**
 * Marionette controllers
 */
MongoApp.addInitializer(function () {
    this.workspaceController = new WorkspaceController();
    this.settingsController = new SettingsController();
    this.searchController = new SearchController();
    this.variantDataController = new VariantDataController();

    // Wire Marionette events to function callbacks
    this.listenTo(MongoApp.dispatcher, MongoApp.events.ERROR, function (errorMessage) {
        // show error message in new browser window
        var ERROR_TEMPLATE = $("#error-message-template").html();
        window.open().document.write(_.template(ERROR_TEMPLATE, {message: errorMessage}))
    });

    this.listenTo(MongoApp.dispatcher, MongoApp.events.WKSP_LOAD, function (newWorkspace, search) {
        MongoApp.workspace = newWorkspace;

        MongoApp.dispatcher.trigger(MongoApp.events.WKSP_CHANGE, MongoApp.workspace);

        search.set("key", MongoApp.workspace.get("key"));
        MongoApp.dispatcher.trigger(MongoApp.events.SEARCH_LOAD, search);
    });

    this.listenTo(MongoApp.dispatcher, MongoApp.events.SEARCH_LOAD, function (newSearch) {

        // make copy that we can safely modify
        var s = newSearch.clone();

        // detach backbone collection attributes
        var filters = s.get("filters");
        s.unset("filters");

        // carry over non-collection attributes
        MongoApp.search.set(s.attributes);

        // rebuild backbone collection attributes
        MongoApp.search.get("filters").reset();
        var async = false; // async is FALSE because we need to add multiple filters in sequence
        if (filters.length == 0) {
            // only have the NONE filter, okay to have it async
            async = true;
        }
        MongoApp.dispatcher.trigger(MongoApp.events.SEARCH_FILTER_ADD, MongoApp.FILTER_NONE, async);
        _.each(filters.models, function(filter) {
            MongoApp.dispatcher.trigger(MongoApp.events.SEARCH_FILTER_ADD, filter, async);
        });

        MongoApp.search.set("saved", true);
    });
});

/**
 * Fires after all initializers and after the initializer events
 */
MongoApp.on("start", function(options){

    this.securityController = new SecurityController();

    switch (this.securityController.getSessionStatus()) {

        case SessionStatus.VALID:
            // fire event that user has been logged in
            MongoApp.dispatcher.trigger(MongoApp.events.LOGIN_SUCCESS);
            break;

        case SessionStatus.INVALID:
            // show login page
            this.securityController.showLogin({region: MongoApp.mainRegion });
            break;

        case SessionStatus.EXPIRED:
            // fire event that user's session has been expired
            MongoApp.dispatcher.trigger(MongoApp.events.SESSION_EXPIRED);
            break;
    }
});