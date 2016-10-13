Ext.define('Zermelo.store.UserStore', {
	extend: 'Ext.data.Store',
	xtype: 'UserStore',
	requires: ['Zermelo.model.User'],
	config: {
		model: 'Zermelo.model.User',
		storeId: 'Users'
	},
	currentSearchString: localStorage.getItem('searchString') || '',

	setCurrentSearchString: function(searchString) {
		this.currentSearchString = searchString;
		localStorage.setItem('searchString', searchString);
	},

	search: function(searchString) {
		this.suspendEvents();
		var timer = Date.now();
		searchString = searchString.toLowerCase();

		if(!searchString.startsWith(this.currentSearchString)) {
			this.clearFilter();
			this.resumeEvents();
		}

		this.setCurrentSearchString(searchString);

		if(searchString == '')
			return;

		var searchComponents = searchString.split(' ');
		this.filterBy(function(record) {
			return searchComponents.every(function(searchComponent) {
				if((record.get('firstName') || '').toLowerCase().startsWith(searchComponent))
					return true;
				if(record.get('code').toLowerCase().startsWith(searchComponent))
					return true;
				if((record.get('lastName') || '').toLowerCase().includes(searchComponent))
					return true;
				if((record.get('prefix') || '').toLowerCase().includes(searchComponent))
					return true;
				return false;
			}, this);
		});
		console.log('time spent', Date.now() - timer);
		this.resumeEvents(true);
		this.fireEvent('refresh');
	},

	initSearch: function() {
		this.search(this.currentSearchString || '');
	},

	onKeyup: function(searchField) {
		this.search(searchField.getValue());
	},

	launch: function() {
		// This entry will always be first because nothing < something.
		// Setting user to '' will set the user to '~me' in UserManager.
		this.add({firstName: '', prefix: 'Eigen rooster', lastName: '', code: ''});
	}
});