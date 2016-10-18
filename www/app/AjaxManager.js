Ext.define('Zermelo.AjaxManager', {
	alternateClassName: 'AjaxManager',
	requires: ['Zermelo.UserManager', 'Zermelo.ErrorManager'],
	singleton: true,

	getUrl: function(target) {
		return (
			'http://ulbeportal.zermelo.local/api/v3/' +
			target
		)
	},

	refresh: function() {
		Ext.getStore('Appointments').fetchWeek();
		this.getAnnouncementData();
		this.getSelf();
	},

	periodicRefresh: function() {
		if(this.queuedRefresh)
			clearInterval(this.queuedRefresh);
		this.refresh();
		this.queuedRefresh = setInterval(Ext.bind(this.refresh, this), 1000 * 60 * 20);
	},
	
	getAnnouncementData: function() {
		if (!Zermelo.UserManager.loggedIn())
			return;

		Ext.Viewport.setMasked({
			xtype: 'loadmask',
			locale: {
				message: 'loading'
			},

			indicator: true
		});

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
					var record = {
						id: entry.id.toString(),
						start: new Date(entry.start * 1000),
						end: new Date(entry.end * 1000),
						title: entry.title,
						text: entry.text
					};
					announcementStore.add(record);
				});

				announcementStore.resetFilters();

				announcementStore.resumeEvents(false);

				Ext.Viewport.unmask();
			},
			failure: function (response) {
				if (response.status == 403) {
					// If the result is 403 the user isn't allowed to view announcements.
					// We create a dummy announcement to let them know about this
					var announcementStore = Ext.getStore('Announcements');
					announcementStore.each(function(record) {
						if(record.get('id') != '0')
							announcementStore.remove(record);
					});
					if(!announcementStore.getById('0')) {					
						var record = {
							id: '0',
							title: Ux.locale.Manager.get('announcement.no_permission_title'),
							text: Ux.locale.Manager.get('announcement.no_permission_message')
						};

						announcementStore.add(record);
					}
				}
				else {
					Zermelo.ErrorManager.showErrorBox('network_error');
				}
				Ext.getStore('Announcements').resetFilters();
				Ext.Viewport.unmask();
			}
		});
	},

	getAppointment: function(startTime, endTime) {
		if (!Zermelo.UserManager.loggedIn() || this.appointmentsPending)
			return;
		Ext.Viewport.setMasked({
			xtype: 'loadmask',
			locale: {
				message: 'loading'
			},

			indicator: true
		});
		
		// Real unix timestamps use seconds, javascript uses milliseconds
		startTime = Math.floor(startTime / 1000);
		endTime = Math.floor(endTime / 1000);

		this.appointmentsPending = true;

		Ext.Ajax.request({
			url: this.getUrl('appointments'),
			params: Zermelo.UserManager.addVieweeParamsToObject({
				start: startTime,
				end: endTime
			}),
			method: "GET",
			useDefaultXhrHeader: false,
			scope: this,
			success: function (response) {
				var decoded = Ext.JSON.decode(response.responseText).response.data;

				var appointmentStore = Ext.getStore('Appointments');
				appointmentStore.suspendEvents();

				appointmentStore.clearWeek();

				decoded.forEach(function(record) {
					record.start = new Date(record.start * 1000);
					record.end = new Date(record.end * 1000);
					record.user = Zermelo.UserManager.getUserSuffix();
					record.id += Zermelo.UserManager.getUserSuffix();
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
				Ext.Viewport.unmask();
				this.appointmentsPending = false;
			},
			failure: function (response) {
				console.log(response);
				var error_msg = 'network_error';
				if (response.status == 403) {
					error_msg = 'insufficient_permissions';
					Zermelo.UserManager.setUser();
				}

				Zermelo.ErrorManager.showErrorBox(error_msg);
				Ext.Viewport.unmask();
				this.appointmentsPending = false;
			}
		});
	},

	getBranches: function() {
			Ext.Ajax.request({			
			url: this.getUrl('branchesofschools'),
			disableCaching: false,
			params: {
				access_token: Zermelo.UserManager.getAccessToken()
			},
			method: "GET",
			useDefaultXhrHeader: false,
			success: function (response) {
				Zermelo.AjaxManager.branchIdMap = Ext.JSON.decode(response.responseText).response.data;
				console.log(Zermelo.AjaxManager.branchIdMap);
			},
			failure: function (response) {
				Ext.Viewport.unmask();
				var error_msg = 'network_error';
				if (response.status == 403) {
					error_msg = 'insufficient_permissions';
				}

				Zermelo.ErrorManager.showErrorBox(error_msg);
				
			}
		});
	},

	getDepartments: function() {
			Ext.Ajax.request({			
			url: this.getUrl('departmentsofbranches'),
			disableCaching: false,
			params: {
				access_token: Zermelo.UserManager.getAccessToken()
			},
			method: "GET",
			useDefaultXhrHeader: false,
			success: function (response) {
				Zermelo.AjaxManager.departmentIdMap = Ext.JSON.decode(response.responseText).response.data;
				console.log(Zermelo.AjaxManager.departmentIdMap);
			},
			failure: function (response) {
				Ext.Viewport.unmask();
				var error_msg = 'network_error';
				if (response.status == 403) {
					error_msg = 'insufficient_permissions';
				}

				Zermelo.ErrorManager.showErrorBox(error_msg);
				
			}
		});
	},

	getUsers: function() {
		if (!Zermelo.UserManager.loggedIn())
			return;

		Ext.Viewport.setMasked({
			xtype: 'loadmask',
			locale: {
				message: 'loading'
			},

			indicator: true
		});
		this.getBranches();
		this.getDepartments();

		Ext.getStore('Users').suspendEvents();

		this.types.forEach(function(type) {
			Ext.Ajax.request({			
				url: this.getUrl(type),
				disableCaching: false,
				params: {
					access_token: Zermelo.UserManager.getAccessToken()
				},
				userRequest: true,
				method: "GET",
				useDefaultXhrHeader: false,
				scope: this,
				success: function (response) {
					var UserStore = Ext.getStore('Users');
					var formatFn;
					if(response.request.options.url.endsWith('locationofbranches'))
						formatFn = Ext.bind(function(item) {
							return {
								code: this.branchIdMap.find(function(mapping) {return mapping.id == item.branchOfSchool}).branch + '.' + item.name,
								type: 'location',
								remoteId: item.id
							}
						}, this);
					else if(response.request.options.url.endsWith('groupindepartments'))
						formatFn = Ext.bind(function(item) {
							return {
								type: 'group',
								prefix: this.departmentIdMap.find(function(mapping) {return mapping.id == item.departmentOfBranch}).schoolInSchoolYearName,
								code: item.extendedName,
								remoteId: item.id
							}
						}, this);
					else
						formatFn = function(item) {
							item.type = 'user';
							return item;
						};
					Ext.JSON.decode(response.responseText).response.data.forEach(function(item) {
						this.formattedArray.push(formatFn(item));
					}, this);
					this.typesReturn(type);
				},
				failure: function (response) {
					Ext.Viewport.unmask();
					var error_msg = 'network_error';
					if (response.status == 403) {
						error_msg = 'insufficient_permissions';
					}

					Zermelo.ErrorManager.showErrorBox(error_msg);
					
				}
			});
		}, this);
	},

	formattedArray: [{firstName: '', lastName: '', prefix: 'Eigen rooster', code: '', type: 'user'}],

	returned: {},

	types: [
		'users',
		'groupindepartments',
		'locationofbranches'
	],

	typesReturn: function(requestName) {
		this.returned[requestName] = true;
		if(this.types.every(function(type) {return this.returned[type];}, this)) {
			var UserStore = Ext.getStore('Users');
			UserStore.addData(this.formattedArray);
			UserStore.sort([
				{
					property: 'firstName',
					direction: 'ASC'
				},
				{
					property: 'lastName',
					direction: 'ASC'
				},
				{
					property: 'code',
					direction: 'ASC'
				}
			]);
			UserStore.initSearch();
			UserStore.resumeEvents(true);
			UserStore.fireEvent('refresh');
			console.log('typesreturn refresh');
			Ext.Viewport.unmask();
		}
	},

	getSelf: function() {
		Ext.Ajax.request({
			url: this.getUrl('tokens/~current'),
			params: {
				access_token: Zermelo.UserManager.getAccessToken()
			},
			method: "GET",
			useDefaultXhrHeader: false,

			success: function (response) {
				// console.log(Ext.JSON.decode(response.responseText).response.data[0]);
			},

			failure: function (response) {
				console.log('faal');
			}
		});
	}
})