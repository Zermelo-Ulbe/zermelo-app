Ext.define('Zermelo.AjaxManager', {
	alternateClassName: 'AjaxManager',
	requires: ['Zermelo.UserManager', 'Zermelo.ErrorManager'],
	singleton: true,
	refreshInterval: 1000 * 60 * 20,	// 1000 milliseconds * 60 seconds * 20 minutes

	getUrl: function(target) {
		return (
			'https://' + 
			Zermelo.UserManager.getInstitution() + 
			'.zportal.nl/api/v3/' +
			target
		)
	},

	refresh: function() {
		Ext.getStore('Appointments').fetchWeek();
		Zermelo.AjaxManager.getAnnouncementData();
	},

	periodicRefresh: function() {
		clearTimeout(this.queuedRefresh);
		this.refresh();
		this.queuedRefresh = Ext.defer(this.periodicRefresh, this.refreshInterval, this);
	},
	
	getAnnouncementData: function() {   
		if (!Zermelo.UserManager.loggedIn())
			return;
		
		Ext.Ajax.request({
			url: this.getUrl('announcements'),
			params: {
				user: '~me',
				access_token: Zermelo.UserManager.getAccessToken(),
				current: true
			},
			method: "GET",
			useDefaultXhrHeader: false,

			success: function (response, opts) {
				var decoded = Ext.JSON.decode(response.responseText).response.data;
				var announcementStore = Ext.getStore('Announcements');
				announcementStore.suspendEvents(true);

				// Update the stored announcements and remove the ones that no longer exist
				announcementStore.each(function(record) {
					var stillExists = 
					decoded.some(function(entry, index) {
						if (record.get('id') != entry.id)
							return false;

						record.set('start', new Date(entry.start * 1000));
						record.set('end', new Date(entry.end * 1000));
						record.set('title', entry.title);
						record.set('text', entry.text);
						decoded.splice(index, 1);
						return true;
					});

					if (!stillExists)
						announcementStore.remove(record);
				});

				// Store new announcements
				decoded.forEach(function(entry) {
					var record = Ext.create('Zermelo.model.Announcement');
					record.set('id', entry.id);
					record.set('start', new Date(entry.start * 1000));
					record.set('end', new Date(entry.end * 1000));
					record.set('title', entry.title);
					record.set('text', entry.text);
					announcementStore.add(record);
				});

				announcementStore.resetFilters();

				announcementStore.resumeEvents(false);

				if(announcementStore.getCount() == 0 && messageShow) {
					Zermelo.ErrorManager.showErrorBox('announcement.no_announcement_msg');
				}
			},
			failure: function (response) {
				if (response.status == 403) {
					// If the result is 403 the user isn't allowed to view announcements.
					// We create a dummy announcement to let them know about this
					var store = Ext.getStore('Announcements');
					store.removeAll();
					if (store.find('title', Ux.locale.Manager.get('announcement.no_permission_title')) == -1) {
						var record = Ext.create('Zermelo.model.Announcement');
						record.set('id', 0);
						record.set('title', Ux.locale.Manager.get('announcement.no_permission_title'));
						record.set('text', Ux.locale.Manager.get('announcement.no_permission_message'));
						store.add(record);
					}
				}
				else {
					Zermelo.ErrorManager.showErrorBox('network_error');
				}
				Ext.getStore('Announcements').resetFilters();
			}
		});
	},

	getAppointment: function(startTime, endTime) {
		if (!Zermelo.UserManager.loggedIn())
			return;
		
		// Real unix timestamps use seconds, javascript uses milliseconds
		startTime = Math.floor(startTime / 1000);
		endTime = Math.floor(endTime / 1000);
		
		Ext.Ajax.request({
			url: this.getUrl('appointments'),
			params: {
				user: Zermelo.UserManager.getUser(),
				access_token: Zermelo.UserManager.getAccessToken(),
				start: startTime,
				end: endTime,
				valid: true
			},
			method: "GET",
			useDefaultXhrHeader: false,
			success: function (response) {
				var decoded = Ext.JSON.decode(response.responseText).response.data;
				var currentUser = Zermelo.UserManager.getUser();

				var appointmentStore = Ext.getStore('Appointments');
				appointmentStore.suspendEvents();

				appointmentStore.clearWeek();

				decoded.forEach(function(record) {
					record.start = new Date(record.start * 1000);
					record.end = new Date(record.end * 1000);
					record.user = currentUser;
					record.id = record.id + currentUser;
					record.groups.sort();
					record.locations.sort();
					record.teachers.sort();
					if(record.startTimeSlotName === undefined || record.startTimeSlotName === null)
						record.startTimeSlotName = record.startTimeSlot;

					appointmentStore.add(record);
				});

				appointmentStore.detectCollisions();
				appointmentStore.queueDelayedEvents();

				// Let FullCalendar know we have new events
				var fullCalendarView = Ext.getCmp('fullCalendarView');
				if(fullCalendarView)
					fullCalendarView.refreshOrStart();

				appointmentStore.resetFilters();
				appointmentStore.resumeEvents();
				localStorage.setItem('refreshTime', Date.now());
			},
			failure: function (response) {
				var error_msg = 'network_error';
				if (response.status == 403) {
					error_msg = 'insufficient_permissions';
					Zermelo.UserManager.setUser();
				}

				Zermelo.ErrorManager.showErrorBox(error_msg);
			}
		});
	}
})